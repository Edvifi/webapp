/**
 * ApplicationTrackingModule — third concrete module.
 *
 * Tabs: Overview (strategy checklist), College List (reach/match/safety),
 * Application Status (per-app workflow). Persists college list and statuses
 * via getModuleData/setModuleData (profiles.settings.module_data.applications).
 */

import {
  useState,
  useEffect,
  useCallback,
} from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { markIntroSeen } from '../lib/profiles'
import { C, MODULE_COLORS, SUCCESS_GREEN, EASE_OUT } from '../lib/designTokens'
import { deriveDeadlineEvents, nextDueForModule } from '../data/applicationDeadlines'
import { useModuleChecklist, useModuleData } from '../lib/useModuleState'
import {
  APPLICATIONS_CHECKLIST,
  APPLICATIONS_TOTAL_ITEMS,
  APPLICATIONS_ALL_IDS,
  APP_STATUS_META,
  CATEGORY_META,
  DEADLINE_TYPES,
  type AppStatus,
  type AppCategory,
  type AppDeadlineType,
  type ApplicationEntry,
  type ApplicationsItemType,
} from '../data/applicationsChecklist'
import { APPLICATIONS_CONTENT_MAP } from '../data/applicationsContent'
import { getCollegeById } from '../data/collegeData'
import { searchCollegesDb, collegeGlyph, collegeSubtitle } from '../lib/collegeSearch'
import ApplicationsModuleTour, { type ApplicationsTabId } from './ApplicationsModuleTour'
import ModuleTabNav from './ModuleTabNav'
import ModuleOverviewTab from './ModuleOverviewTab'
import ModuleShell from './ModuleShell'
import { SecLabel, Tag, CollegeLogo, CollegeMeta, Bar } from './moduleUI'
import CollegeDiscoverTab from './CollegeDiscoverTab'
import CollegeListMap from './CollegeListMap'
import CollegeListInsights from './CollegeListInsights'
import SchoolTasksModal from './SchoolTasksModal'
import Celebration from './Celebration'
import CountUp from './CountUp'
import JourneyStepper from './JourneyStepper'
import StatusInsights from './StatusInsights'
import { taskProgress } from '../data/applicationTasks'
import type { AppTask } from '../data/applicationsChecklist'
import { collegeAppId, type College, type AdmissionBand } from '../lib/collegeMatch'
import { projectToMap } from '../lib/mapProjection'
import { domainOf, logoUrlForDomain } from '../lib/collegeLogo'

const MC = MODULE_COLORS.applications
const MODULE_NAME = 'applications'
const TOUR_INTRO_KEY = 'applications-module-tour'
const APPS_DATA_KEY = 'apps'


/* ─── primitives ─── */

const itemTypeIcon: Record<ApplicationsItemType, string> = {
  article: '📖',
  task: '✓',
  resource: '🔗',
}

/* ─── tab nav ─── */

type TabId = ApplicationsTabId

const TABS: Array<{ id: TabId; label: string; emoji: string }> = [
  { id: 'overview', label: 'Overview', emoji: '🏠' },
  { id: 'discover', label: 'Discover', emoji: '🧭' },
  { id: 'list', label: 'College List', emoji: '📋' },
  { id: 'status', label: 'Application Status', emoji: '📊' },
]

/* ─── College List tab ─── */

const CollegeSearchInput = ({
  existingIds,
  onAdd,
}: {
  existingIds: string[]
  onAdd: (college: College) => void
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<College[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = query.trim()
    let cancelled = false
    const t = setTimeout(async () => {
      if (q.length < 2) { if (!cancelled) { setResults([]); setLoading(false) } ; return }
      if (!cancelled) setLoading(true)
      const r = await searchCollegesDb(q, 8)
      if (!cancelled) { setResults(r); setLoading(false) }
    }, q.length < 2 ? 0 : 220)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query])

  const visible = results.filter((c) => !existingIds.includes(collegeAppId(c))).slice(0, 8)

  return (
    <div style={{ position: 'relative', marginBottom: 18 }}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search 6,000+ colleges to add to your list…"
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 10,
          border: `1px solid ${C.border}`, background: C.surface,
          fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, outline: 'none',
        }}
      />
      {query.trim().length >= 2 && (loading || visible.length > 0) && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: C.shadow2, zIndex: 5, overflow: 'hidden' }}>
          {loading && visible.length === 0 ? (
            <div style={{ padding: '10px 14px', fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted }}>Searching…</div>
          ) : (
            visible.map((c) => (
              <button
                key={c.slug}
                onClick={() => { onAdd(c); setQuery('') }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: `1px solid ${C.border}` }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.surfaceHover }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <CollegeLogo logoUrl={logoUrlForDomain(domainOf(c.url))} emoji={collegeGlyph(c)} size={22} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>{collegeSubtitle(c)}</div>
                </div>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: MC, fontWeight: 600 }}>+ Add</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

const CollegeListTab = ({
  apps,
  onUpdate,
  onRemove,
  onAdd,
}: {
  apps: ApplicationEntry[]
  onUpdate: (collegeId: string, fields: Partial<ApplicationEntry>) => void
  onRemove: (collegeId: string) => void
  onAdd: (college: College) => void
}) => {
  const grouped: Record<AppCategory, ApplicationEntry[]> = {
    reach: apps.filter(a => a.category === 'reach'),
    match: apps.filter(a => a.category === 'match'),
    safety: apps.filter(a => a.category === 'safety'),
    unranked: apps.filter(a => a.category === 'unranked'),
  }
  const orderedCategories: AppCategory[] = ['reach', 'match', 'safety', 'unranked']

  return (
    <div style={{ padding: '24px 28px' }}>
      <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, color: C.text, margin: 0, marginBottom: 6 }}>Your College List</h2>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 18, lineHeight: 1.6 }}>
        Aim for a balanced list: 2-3 reaches, 4-6 matches, 2-3 safeties. Tag each with its deadline type (ED / EA / RD / Rolling).
      </p>

      <CollegeSearchInput existingIds={apps.map(a => a.collegeId)} onAdd={onAdd} />

      {apps.length > 0 && <CollegeListMap apps={apps} />}
      {apps.length > 0 && <CollegeListInsights apps={apps} />}

      {apps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🎓</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: C.textMuted }}>Add a college above to start your list.</div>
        </div>
      ) : (
        orderedCategories.map((cat) => {
          const list = grouped[cat]
          if (list.length === 0) return null
          const meta = CATEGORY_META[cat]
          return (
            <div key={cat} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Tag label={`${meta.label} (${list.length})`} color={meta.color} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {list.map((app) => {
                  // NOTE: legacy entries added via the old static search carry static IDs
                  // (e.g. 'stanford'); Discover/DB adds carry `sc-<scorecard_id>`. There's no
                  // crosswalk, so a school saved both ways can appear twice. Accepted for now —
                  // few/no users have legacy entries, and the static set is being retired.
                  const info = getCollegeById(app.collegeId)
                  const display = info
                    ? { logoUrl: null, emoji: info.emoji, name: info.name, type: info.type, state: info.state }
                    : app.name
                      ? { logoUrl: logoUrlForDomain(app.website), emoji: '🎓', name: app.name, type: app.ownership ?? '', state: app.state ?? '' }
                      : null
                  if (!display) return null
                  return (
                    <CollegeListRow
                      key={app.collegeId}
                      app={app}
                      college={display}
                      onUpdate={(fields) => onUpdate(app.collegeId, fields)}
                      onRemove={() => onRemove(app.collegeId)}
                    />
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

const CollegeListRow = ({
  app,
  college,
  onUpdate,
  onRemove,
}: {
  app: ApplicationEntry
  college: { logoUrl?: string | null; emoji: string; name: string; type: string; state: string }
  onUpdate: (fields: Partial<ApplicationEntry>) => void
  onRemove: () => void
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto auto', gap: 12, alignItems: 'center', padding: '12px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
      <CollegeLogo logoUrl={college.logoUrl} emoji={college.emoji} size={26} />
      <div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: C.text }}>{college.name}</div>
        {(college.type || college.state) && <div style={{ marginTop: 4 }}><CollegeMeta type={college.type} state={college.state} /></div>}
      </div>
      <select
        value={app.category}
        onChange={(e) => onUpdate({ category: e.target.value as AppCategory })}
        style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text, cursor: 'pointer' }}
      >
        <option value="unranked">Unranked</option>
        <option value="reach">Reach</option>
        <option value="match">Match</option>
        <option value="safety">Safety</option>
      </select>
      <select
        value={app.deadlineType}
        onChange={(e) => onUpdate({ deadlineType: e.target.value as AppDeadlineType })}
        style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text, cursor: 'pointer' }}
      >
        {DEADLINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <select
        value={app.status}
        onChange={(e) => onUpdate({ status: e.target.value as AppStatus })}
        style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: APP_STATUS_META[app.status].bg, color: APP_STATUS_META[app.status].color, fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
      >
        {(Object.keys(APP_STATUS_META) as AppStatus[]).map(s => (
          <option key={s} value={s}>{APP_STATUS_META[s].label}</option>
        ))}
      </select>
      <button
        onClick={onRemove}
        aria-label={`Remove ${college.name}`}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.textFaint, padding: 4 }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#B93A3A' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.textFaint }}
      >
        ✕
      </button>
    </div>
  )
}

/* ─── Application Status tab ─── */

const STATUS_GROUPS: Array<{ title: string; statuses: AppStatus[]; color: string }> = [
  { title: 'Pre-submission', statuses: ['not-started', 'in-progress'], color: '#C47A12' },
  { title: 'Submitted (awaiting decision)', statuses: ['submitted'], color: '#1D7FC4' },
  { title: 'Decisions received', statuses: ['accepted', 'waitlisted', 'deferred', 'rejected'], color: '#2D9E72' },
  { title: 'Withdrawn', statuses: ['withdrawn'], color: '#7A6D5C' },
]

/** Circular progress ring for the Status hero. `value` is 0–1. */
const ProgressRing = ({ value, size = 96, stroke = 9 }: { value: number; size?: number; stroke?: number }) => {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* soft glow behind the ring */}
      <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', background: 'radial-gradient(circle, rgba(112,72,200,0.22), transparent 70%)', filter: 'blur(6px)' }} />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'relative' }}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B63E0" />
            <stop offset="100%" stopColor="#5B34B0" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(60,35,10,0.10)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ringGrad)" strokeWidth={stroke} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - Math.max(0, Math.min(1, value))) }}
          transition={{ duration: 1, ease: EASE_OUT }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Young Serif',serif", fontSize: size * 0.25, color: MODULE_COLORS.applications }}>
        <CountUp value={Math.round(value * 100)} suffix="%" />
      </div>
    </div>
  )
}

const StatusTab = ({
  apps,
  onUpdate,
}: {
  apps: ApplicationEntry[]
  onUpdate: (collegeId: string, fields: Partial<ApplicationEntry>) => void
}) => {
  const [openId, setOpenId] = useState<string | null>(null)
  const [celebrateKey, setCelebrateKey] = useState<number | null>(null)
  // Confetti, fired at the action site (status change / final task checked).
  const celebrate = () => setCelebrateKey((k) => (k ?? 0) + 1)

  if (apps.length === 0) {
    return (
      <div style={{ padding: '24px 28px', maxWidth: 760 }}>
        <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, color: C.text, margin: 0, marginBottom: 6 }}>Application Status</h2>
        <div style={{ marginTop: 24, textAlign: 'center', padding: '40px 20px', background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: C.textMuted }}>Add colleges to your list first — they'll appear here once you do.</div>
        </div>
      </div>
    )
  }

  const totals = {
    submitted: apps.filter(a => ['submitted', 'accepted', 'waitlisted', 'deferred', 'rejected'].includes(a.status)).length,
    accepted: apps.filter(a => a.status === 'accepted').length,
    inProgress: apps.filter(a => ['not-started', 'in-progress'].includes(a.status)).length,
  }

  // Overall task progress across every school (drives the hero ring).
  const taskTotals = apps.reduce((acc, a) => {
    const p = taskProgress(a); acc.done += p.done; acc.total += p.total; return acc
  }, { done: 0, total: 0 })
  const overall = taskTotals.total ? taskTotals.done / taskTotals.total : 0

  // Deadlines: soonest overall (hero chip) + per-school days-out (row at-risk flags).
  const now = new Date()
  const events = deriveDeadlineEvents(apps)
  const nextDue = nextDueForModule(events, 'Application Tracking', now)
  const daysToNext = nextDue ? Math.max(0, Math.ceil((nextDue.date.getTime() - now.getTime()) / 86400000)) : null
  const nextSchool = nextDue ? nextDue.title.split(' — ')[0] : ''
  const nextType = nextDue ? (nextDue.title.split(' — ')[1] ?? '') : ''
  const nextColor = daysToNext == null ? MC : daysToNext <= 10 ? '#B93A3A' : daysToNext <= 30 ? '#C47A12' : MC
  const dueByCollege = new Map<string, number>()
  for (const e of events) {
    if (!e.collegeId || e.module !== 'Application Tracking') continue
    const days = Math.ceil((e.date.getTime() - now.getTime()) / 86400000)
    const prev = dueByCollege.get(e.collegeId)
    if (prev == null || days < prev) dueByCollege.set(e.collegeId, days)
  }

  // Reach / match / safety balance for the hero.
  const catCounts = { reach: 0, match: 0, safety: 0, unranked: 0 }
  for (const a of apps) catCounts[a.category] += 1
  const balanceNudge = apps.length >= 3 && catCounts.safety === 0 ? 'Add a safety school to balance your list' : null

  const STAT_TILES = [
    { label: 'Submitted', icon: '🗂️', value: totals.submitted, color: '#1D7FC4' },
    { label: 'Accepted', icon: '🎉', value: totals.accepted, color: SUCCESS_GREEN },
    { label: 'In progress', icon: '⏳', value: totals.inProgress, color: '#C47A12' },
  ]
  const BALANCE_CHIPS: Array<{ cat: AppCategory; n: number }> = [
    { cat: 'reach', n: catCounts.reach },
    { cat: 'match', n: catCounts.match },
    { cat: 'safety', n: catCounts.safety },
  ]

  const openApp = apps.find(a => a.collegeId === openId) ?? null
  const displayFor = (app: ApplicationEntry) => {
    const info = getCollegeById(app.collegeId)
    return {
      name: info?.name ?? app.name ?? 'College',
      emoji: info?.emoji ?? '🎓',
      logoUrl: info ? null : logoUrlForDomain(app.website),
      sub: app.subtitle ?? [info?.type, app.state].filter(Boolean).join(' · '),
    }
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, color: C.text, margin: 0, marginBottom: 6 }}>Application Status</h2>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 18, lineHeight: 1.6 }}>
        Track each application through submission and decision. Click a school to work through its application to-dos.
      </p>

      {/* hero: overall progress ring + next-deadline urgency */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE_OUT }}
        style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 24, background: 'linear-gradient(120deg, #FAF6EE, #F3EEF9)', border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 24px', marginBottom: 16, boxShadow: C.shadow2 }}
      >
        {/* decorative depth blobs */}
        <div style={{ position: 'absolute', top: -60, right: -30, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(112,72,200,0.10), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, right: 160, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,158,114,0.08), transparent 70%)', pointerEvents: 'none' }} />
        <ProgressRing value={overall} />
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <div style={{ fontFamily: "'Young Serif',serif", fontSize: 21, color: C.text }}>{taskTotals.done} of {taskTotals.total} tasks done</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, marginTop: 2 }}>
            Across {apps.length} {apps.length === 1 ? 'school' : 'schools'}{totals.submitted > 0 ? ` · ${totals.submitted} submitted` : ''} — {overall >= 1 ? 'all done, nice work!' : overall > 0 ? 'keep the momentum going' : 'let’s get started'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {BALANCE_CHIPS.map(({ cat, n }) => {
              const m = CATEGORY_META[cat]
              return (
                <span key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: n > 0 ? m.color : C.textFaint }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: n > 0 ? m.color : C.borderStrong }} />
                  {n} {m.label}
                </span>
              )
            })}
            {balanceNudge && <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: '#C47A12' }}>· {balanceNudge}</span>}
          </div>
        </div>
        {nextDue && (
          <div style={{ position: 'relative', flexShrink: 0, width: 208, alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: C.white, border: `1px solid ${nextColor}33`, borderRadius: 12, padding: '13px 16px', boxShadow: C.shadow1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textMuted }}>⏰ Next deadline</div>
            <div style={{ fontFamily: "'Young Serif',serif", fontSize: 23, color: nextColor, marginTop: 5, lineHeight: 1 }}>{daysToNext != null ? `${daysToNext} ${daysToNext === 1 ? 'day' : 'days'}` : nextDue.dateDisplay}</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, fontWeight: 600, color: C.text, marginTop: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nextSchool}>{nextSchool}</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11.5, color: C.textMuted, marginTop: 1 }}>{[nextType, nextDue.dateDisplay].filter(Boolean).join(' · ')}{nextDue.estimated ? ' · est.' : ''}</div>
          </div>
        )}
      </motion.div>

      {/* stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 26 }}>
        {STAT_TILES.map((tile, i) => (
          <motion.div
            key={tile.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + i * 0.06, duration: 0.35, ease: EASE_OUT }}
            whileHover={{ y: -3, boxShadow: C.shadow3 }}
            style={{ position: 'relative', overflow: 'hidden', padding: '16px 18px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}
          >
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: tile.color }} />
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 13 }}>{tile.icon}</span>{tile.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: "'Young Serif',serif", fontSize: 28, color: tile.color }}><CountUp value={tile.value} /></span>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textFaint }}>of {apps.length}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <StatusInsights apps={apps} />

      {STATUS_GROUPS.map((group) => {
        const groupApps = apps.filter(a => group.statuses.includes(a.status))
        if (groupApps.length === 0) return null
        return (
          <div key={group.title} style={{ marginBottom: 24 }}>
            <SecLabel>{group.title} ({groupApps.length})</SecLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groupApps.map((app, i) => {
                const info = getCollegeById(app.collegeId)
                const name = info?.name ?? app.name
                if (!name) return null
                const meta = APP_STATUS_META[app.status]
                const catMeta = CATEGORY_META[app.category]
                const prog = taskProgress(app)
                const complete = prog.total > 0 && prog.done === prog.total
                const due = dueByCollege.get(app.collegeId)
                const preSubmission = ['not-started', 'in-progress'].includes(app.status)
                const urgency = preSubmission && due != null && due >= 0
                  ? (due <= 10 ? { label: `⚠ ${due}d left`, color: '#B93A3A', bg: '#FAEAEA' }
                    : due <= 30 ? { label: `${due}d left`, color: '#C47A12', bg: '#FFF3E0' } : null)
                  : null
                return (
                  <motion.div
                    key={app.collegeId}
                    role="button"
                    tabIndex={0}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.3, ease: EASE_OUT }}
                    whileHover="hover"
                    variants={{ hover: { y: -2, boxShadow: C.shadow3 } }}
                    onClick={() => setOpenId(app.collegeId)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(app.collegeId) } }}
                    style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 13, padding: '12px 16px 12px 18px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, cursor: 'pointer', boxShadow: C.shadow1 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = C.surfaceHover }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = C.surface }}
                  >
                    <div style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 4, borderRadius: 4, background: group.color }} />
                    <CollegeLogo logoUrl={info ? null : logoUrlForDomain(app.website)} emoji={info?.emoji ?? '🎓'} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: C.text }}>{name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 6 }}>
                        <div style={{ position: 'relative', width: 110, overflow: 'hidden', borderRadius: 5 }}>
                          <Bar value={prog.total ? prog.done / prog.total : 0} color={complete ? SUCCESS_GREEN : MC} height={5} />
                          {complete && <div className="status-shimmer" />}
                        </div>
                        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11.5, color: complete ? SUCCESS_GREEN : C.textMuted, fontWeight: complete ? 600 : 400 }}>{complete ? '✓ ' : ''}{prog.done}/{prog.total} tasks</span>
                        {urgency && (
                          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, color: urgency.color, background: urgency.bg, border: `1px solid ${urgency.color}28`, borderRadius: 99, padding: '2px 8px' }}>{urgency.label}</span>
                        )}
                      </div>
                      <div style={{ marginTop: 8 }}><JourneyStepper status={app.status} /></div>
                    </div>
                    <Tag label={catMeta.label} color={catMeta.color} />
                    <Tag label={app.deadlineType} color={C.textMuted} bg={C.bg} />
                    <select
                      value={app.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const s = e.target.value as AppStatus
                        if ((s === 'submitted' && app.status !== 'submitted') || (s === 'accepted' && app.status !== 'accepted')) celebrate()
                        onUpdate(app.collegeId, { status: s })
                      }}
                      title="Update status"
                      style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: meta.color, background: meta.bg, border: `1px solid ${meta.color}28`, borderRadius: 99, padding: '4px 9px', cursor: 'pointer', outline: 'none' }}
                    >
                      {(Object.keys(APP_STATUS_META) as AppStatus[]).map(s => <option key={s} value={s}>{APP_STATUS_META[s].label}</option>)}
                    </select>
                    <motion.span variants={{ hover: { x: 4 } }} style={{ color: C.textFaint, fontSize: 20, lineHeight: 1 }}>›</motion.span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )
      })}

      {celebrateKey != null && <Celebration key={celebrateKey} onDone={() => setCelebrateKey(null)} />}

      {openApp && (
        <SchoolTasksModal
          app={openApp}
          display={displayFor(openApp)}
          onChange={(tasks: AppTask[]) => {
            const wasComplete = taskProgress(openApp).total > 0 && taskProgress(openApp).done === taskProgress(openApp).total
            const nowComplete = tasks.length > 0 && tasks.every((t) => t.done)
            if (nowComplete && !wasComplete) celebrate()
            onUpdate(openApp.collegeId, { tasks })
          }}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  )
}

/* ─── module shell ─── */

interface Props {
  open: boolean
  onClose: () => void
}

export default function ApplicationTrackingModule({ open, onClose }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const tourSeen = profile?.settings?.intros_seen?.includes(TOUR_INTRO_KEY) ?? false
  const [showTour, setShowTour] = useState(false)
  const [tab, setTab] = useState<TabId>('overview')
  const { progress, handleToggle, handleMarkComplete } = useModuleChecklist(MODULE_NAME, open)
  const { data: apps, saveData: persistApps, dataRef: appsRef } = useModuleData<ApplicationEntry>(MODULE_NAME, APPS_DATA_KEY, open)

  useEffect(() => {
    if (open && !tourSeen) {
      const t = setTimeout(() => setShowTour(true), 400)
      return () => clearTimeout(t)
    }
  }, [open, tourSeen])

  const addCollegeSnapshot = useCallback((college: College, category: AppCategory) => {
    const current = appsRef.current
    const id = collegeAppId(college)
    if (current.some(a => a.collegeId === id)) return
    const [mapX, mapY] = projectToMap(college.longitude, college.latitude, college.state) ?? [null, null]
    persistApps([
      ...current,
      { collegeId: id, category, deadlineType: 'RD', status: 'not-started', name: college.name, subtitle: collegeSubtitle(college), source: 'scorecard', state: college.state, city: college.city, mapX, mapY, website: domainOf(college.url), ownership: college.ownership, institutionType: college.institution_type },
    ])
  }, [persistApps, appsRef])

  const handleAddFromDiscover = useCallback((college: College, band: AdmissionBand) => {
    addCollegeSnapshot(college, band === 'reach' ? 'reach' : band === 'target' ? 'match' : 'safety')
  }, [addCollegeSnapshot])

  const handleAddManual = useCallback((college: College) => addCollegeSnapshot(college, 'unranked'), [addCollegeSnapshot])

  const handleUpdateApp = useCallback((collegeId: string, fields: Partial<ApplicationEntry>) => {
    persistApps(appsRef.current.map(a => a.collegeId === collegeId ? { ...a, ...fields } : a))
  }, [persistApps, appsRef])

  const handleRemoveApp = useCallback((collegeId: string) => {
    persistApps(appsRef.current.filter(a => a.collegeId !== collegeId))
  }, [persistApps, appsRef])

  const content =
    tab === 'overview' ? <ModuleOverviewTab progress={progress} onToggle={handleToggle} onMarkComplete={handleMarkComplete} checklist={APPLICATIONS_CHECKLIST} contentMap={APPLICATIONS_CONTENT_MAP} allIds={APPLICATIONS_ALL_IDS} totalItems={APPLICATIONS_TOTAL_ITEMS} accent={MC} title="Application Strategy Checklist" subtitle={"Click an item title to read it. Click the circle to cycle status: empty → in-progress → done."} itemTypeIcon={itemTypeIcon} /> :
    tab === 'discover' ? <CollegeDiscoverTab open={open} existingIds={apps.map(a => a.collegeId)} onAdd={handleAddFromDiscover} /> :
    tab === 'list' ? <CollegeListTab apps={apps} onUpdate={handleUpdateApp} onRemove={handleRemoveApp} onAdd={handleAddManual} /> :
    <StatusTab apps={apps} onUpdate={handleUpdateApp} />

  return (
    <ModuleShell
      open={open}
      onClose={onClose}
      breadcrumbLabel="Application Tracking"
      nav={<ModuleTabNav active={tab} onTab={setTab} progress={progress} totalItems={APPLICATIONS_TOTAL_ITEMS} accent={MC} icon="📋" title="Applications" subtitle="Building Your List" tabs={TABS} onTour={() => setShowTour(true)} />}
      tour={showTour && (
        <ApplicationsModuleTour
          onStart={() => { if (user) markIntroSeen(TOUR_INTRO_KEY).then(refreshProfile).catch(() => {}) }}
          onDismiss={() => setShowTour(false)}
          onSwitchTab={setTab}
        />
      )}
    >
      {content}
    </ModuleShell>
  )
}
