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
import { useAuth } from '../contexts/AuthContext'
import { markIntroSeen } from '../lib/profiles'
import { C, MODULE_COLORS, SUCCESS_GREEN } from '../lib/designTokens'
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
import { SecLabel, Tag } from './moduleUI'
import CollegeDiscoverTab from './CollegeDiscoverTab'
import type { College, AdmissionBand } from '../lib/collegeMatch'

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

  const visible = results.filter((c) => !existingIds.includes(c.slug)).slice(0, 8)

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
                <span style={{ fontSize: 18 }}>{collegeGlyph(c)}</span>
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
    <div style={{ padding: '24px 28px', maxWidth: 920 }}>
      <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, color: C.text, margin: 0, marginBottom: 6 }}>Your College List</h2>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 18, lineHeight: 1.6 }}>
        Aim for a balanced list: 2-3 reaches, 4-6 matches, 2-3 safeties. Tag each with its deadline type (ED / EA / RD / Rolling).
      </p>

      <CollegeSearchInput existingIds={apps.map(a => a.collegeId)} onAdd={onAdd} />

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
                  const info = getCollegeById(app.collegeId)
                  const display = info
                    ? { emoji: info.emoji, name: info.name, type: info.type, state: info.state }
                    : app.name
                      ? { emoji: '🎓', name: app.name, type: app.subtitle ?? '', state: '' }
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
  college: { emoji: string; name: string; type: string; state: string }
  onUpdate: (fields: Partial<ApplicationEntry>) => void
  onRemove: () => void
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto auto', gap: 12, alignItems: 'center', padding: '12px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
      <span style={{ fontSize: 22 }}>{college.emoji}</span>
      <div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: C.text }}>{college.name}</div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>{college.type}{college.state ? ` · ${college.state}` : ''}</div>
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

const STATUS_GROUPS: Array<{ title: string; statuses: AppStatus[] }> = [
  { title: 'Pre-submission', statuses: ['not-started', 'in-progress'] },
  { title: 'Submitted (awaiting decision)', statuses: ['submitted'] },
  { title: 'Decisions received', statuses: ['accepted', 'waitlisted', 'deferred', 'rejected'] },
  { title: 'Withdrawn', statuses: ['withdrawn'] },
]

const StatusTab = ({ apps }: { apps: ApplicationEntry[] }) => {
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
    pending: apps.filter(a => ['not-started', 'in-progress'].includes(a.status)).length,
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 920 }}>
      <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, color: C.text, margin: 0, marginBottom: 6 }}>Application Status</h2>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 20, lineHeight: 1.6 }}>
        Track each application through submission and decision. Update statuses on the College List tab.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
        <SummaryCard label="Submitted" value={totals.submitted} total={apps.length} color="#1D7FC4" />
        <SummaryCard label="Accepted" value={totals.accepted} total={apps.length} color={SUCCESS_GREEN} />
        <SummaryCard label="Pending" value={totals.pending} total={apps.length} color="#C47A12" />
      </div>

      {STATUS_GROUPS.map((group) => {
        const groupApps = apps.filter(a => group.statuses.includes(a.status))
        if (groupApps.length === 0) return null
        return (
          <div key={group.title} style={{ marginBottom: 24 }}>
            <SecLabel>{group.title} ({groupApps.length})</SecLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {groupApps.map((app) => {
                const college = getCollegeById(app.collegeId)
                if (!college) return null
                const meta = APP_STATUS_META[app.status]
                const catMeta = CATEGORY_META[app.category]
                return (
                  <div key={app.collegeId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                    <span style={{ fontSize: 18 }}>{college.emoji}</span>
                    <span style={{ flex: 1, fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>{college.name}</span>
                    <Tag label={catMeta.label} color={catMeta.color} />
                    <Tag label={app.deadlineType} color={C.textMuted} bg={C.bg} />
                    <Tag label={meta.label} color={meta.color} bg={meta.bg} />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const SummaryCard = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => (
  <div style={{ padding: '14px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ fontFamily: "'Young Serif',serif", fontSize: 26, color }}>{value}</span>
      <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textFaint }}>of {total}</span>
    </div>
  </div>
)

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
    if (current.some(a => a.collegeId === college.slug)) return
    persistApps([
      ...current,
      { collegeId: college.slug, category, deadlineType: 'RD', status: 'not-started', name: college.name, subtitle: collegeSubtitle(college), source: 'scorecard' },
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
    <StatusTab apps={apps} />

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
