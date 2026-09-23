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
import { C, MODULE_COLORS } from '../lib/designTokens'
import { useModuleChecklist, useModuleData } from '../lib/useModuleState'
import { useToast } from '../contexts/ToastContext'
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
import { Tag, CollegeLogo, CollegeMeta } from './moduleUI'
import CollegeDiscoverTab from './CollegeDiscoverTab'
import CollegeDetailModal from './CollegeDetailModal'
import CollegeListMap from './CollegeListMap'
import CollegeListInsights from './CollegeListInsights'
import ApplicationStatusTab from './ApplicationStatusTab'
import FeeWaiverNotice from './FeeWaiverNotice'
import { feeWaiverEligibility, shouldShowFeeWaiverNotice, FEE_WAIVER_NOTICE_KEY } from '../lib/feeWaivers'
import { initialTasksFor, setSharedTask } from '../data/applicationTasks'
import { collegeAppId, scoreCollegeForProfile, type College, type CollegeMatch, type AdmissionBand } from '../lib/collegeMatch'
import { fetchCollegesByScorecardIds } from '../lib/collegeSearch'
import { useCollegePrefs } from '../lib/useCollegePrefs'
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
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const q = query.trim()
    let cancelled = false
    const t = setTimeout(async () => {
      if (q.length < 2) { if (!cancelled) { setResults([]); setLoading(false) } ; return }
      if (!cancelled) { setLoading(true); setFailed(false) }
      try {
        const r = await searchCollegesDb(q, 8)
        if (!cancelled) { setResults(r); setLoading(false) }
      } catch {
        // Show "search unavailable" rather than an empty dropdown, which would
        // read as "that school doesn't exist".
        if (!cancelled) { setResults([]); setFailed(true); setLoading(false) }
      }
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
      {query.trim().length >= 2 && (loading || failed || visible.length > 0) && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: C.shadow2, zIndex: 5, overflow: 'hidden' }}>
          {loading && visible.length === 0 ? (
            <div style={{ padding: '10px 14px', fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted }}>Searching…</div>
          ) : failed ? (
            <div style={{ padding: '10px 14px', fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: '#B93A3A' }}>Search is unavailable right now. Try again in a moment.</div>
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

  // Clicking a school name opens the same detail popup as Discover (fetch its DB
  // row + score it against the student's profile).
  const { studentProfile } = useCollegePrefs(true)
  const [detail, setDetail] = useState<{ college: College; match: CollegeMatch } | null>(null)
  const openDetail = async (collegeId: string) => {
    const scid = collegeId.startsWith('sc-') ? Number(collegeId.slice(3)) : NaN
    if (!Number.isFinite(scid)) return // legacy static colleges have no DB row
    try {
      const [c] = await fetchCollegesByScorecardIds([scid])
      if (c) setDetail({ college: c, match: scoreCollegeForProfile(c, studentProfile, null) })
    } catch {
      // Nothing to show if the lookup fails — leave the popup closed rather
      // than opening an empty one.
    }
  }

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
                    ? { logoUrl: logoUrlForDomain(info.domain), emoji: info.emoji, name: info.name, type: info.type, state: info.state }
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
                      onOpenDetail={app.collegeId.startsWith('sc-') ? () => openDetail(app.collegeId) : undefined}
                    />
                  )
                })}
              </div>
            </div>
          )
        })
      )}

      {detail && (
        <CollegeDetailModal
          college={detail.college}
          match={detail.match}
          added
          onAdd={() => {}}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}

const CollegeListRow = ({
  app,
  college,
  onUpdate,
  onRemove,
  onOpenDetail,
}: {
  app: ApplicationEntry
  college: { logoUrl?: string | null; emoji: string; name: string; type: string; state: string }
  onUpdate: (fields: Partial<ApplicationEntry>) => void
  onRemove: () => void
  onOpenDetail?: () => void
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto auto', gap: 12, alignItems: 'center', padding: '12px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
      <CollegeLogo logoUrl={college.logoUrl} emoji={college.emoji} size={26} />
      <div style={{ minWidth: 0 }}>
        {onOpenDetail ? (
          <button
            onClick={onOpenDetail}
            title="View school details"
            style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: C.text, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.textDecoration = 'underline' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.textDecoration = 'none' }}
          >
            {college.name}
          </button>
        ) : (
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: C.text }}>{college.name}</div>
        )}
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

/* ─── module shell ─── */

interface Props {
  open: boolean
  onClose: () => void
  /** Close the module and open the profile page, where household income is editable. */
  onEditIncome?: () => void
}

export default function ApplicationTrackingModule({ open, onClose, onEditIncome }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const tourSeen = profile?.settings?.intros_seen?.includes(TOUR_INTRO_KEY) ?? false
  const [showTour, setShowTour] = useState(false)
  const [tab, setTab] = useState<TabId>('overview')
  // Dismissal persists via mark_intro_seen, but that round-trips through a
  // profile refresh; track it locally so the banner goes away on the click.
  const [feeWaiverDismissed, setFeeWaiverDismissed] = useState(false)
  const { progress, handleToggle, handleMarkComplete } = useModuleChecklist(MODULE_NAME, open)
  const toast = useToast()
  const { data: apps, saveData: persistApps, dataRef: appsRef, loadFailed: appsLoadFailed } =
    useModuleData<ApplicationEntry>(MODULE_NAME, APPS_DATA_KEY, open)
  useEffect(() => {
    if (appsLoadFailed) {
      toast.error("Couldn't load your college list — check your connection and reopen. "
        + 'Editing is paused so nothing already saved gets overwritten.')
    }
  }, [appsLoadFailed, toast])

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
    const entry: ApplicationEntry = { collegeId: id, category, deadlineType: 'RD', status: 'not-started', name: college.name, subtitle: collegeSubtitle(college), source: 'scorecard', state: college.state, city: college.city, mapX, mapY, website: domainOf(college.url), ownership: college.ownership, institutionType: college.institution_type }
    // Only seed tasks when a shared one is already done elsewhere; otherwise
    // leave them unset so the default checklist keeps tracking the entry.
    const tasks = initialTasksFor(entry, current)
    persistApps([...current, tasks.some((t) => t.done) ? { ...entry, tasks } : entry])
  }, [persistApps, appsRef])

  const handleAddFromDiscover = useCallback((college: College, band: AdmissionBand) => {
    addCollegeSnapshot(college, band === 'reach' ? 'reach' : band === 'target' ? 'match' : 'safety')
  }, [addCollegeSnapshot])

  const handleAddManual = useCallback((college: College) => addCollegeSnapshot(college, 'unranked'), [addCollegeSnapshot])

  const handleUpdateApp = useCallback((collegeId: string, fields: Partial<ApplicationEntry>) => {
    persistApps(appsRef.current.map(a => a.collegeId === collegeId ? { ...a, ...fields } : a))
  }, [persistApps, appsRef])

  const handleSetSharedTask = useCallback((taskId: string, done: boolean) => {
    const next = setSharedTask(appsRef.current, taskId, done)
    persistApps(next)
    return next
  }, [persistApps, appsRef])

  const handleRemoveApp = useCallback((collegeId: string) => {
    persistApps(appsRef.current.filter(a => a.collegeId !== collegeId))
  }, [persistApps, appsRef])

  const incomeLevel = profile?.demographics?.income_level
  const dismissFeeWaiver = useCallback(() => {
    setFeeWaiverDismissed(true)
    if (user) markIntroSeen(FEE_WAIVER_NOTICE_KEY).then(refreshProfile).catch(() => {})
  }, [user, refreshProfile])

  // Only on the tabs where fees are actually in view — the overview tab hands
  // its whole surface over to article reading, and a banner above that intrudes.
  const showFeeWaiver =
    !feeWaiverDismissed
    && (tab === 'list' || tab === 'status')
    && shouldShowFeeWaiverNotice(incomeLevel, profile?.settings?.intros_seen)

  const content =
    tab === 'overview' ? <ModuleOverviewTab progress={progress} onToggle={handleToggle} onMarkComplete={handleMarkComplete} checklist={APPLICATIONS_CHECKLIST} contentMap={APPLICATIONS_CONTENT_MAP} allIds={APPLICATIONS_ALL_IDS} totalItems={APPLICATIONS_TOTAL_ITEMS} accent={MC} title="Application Strategy Checklist" subtitle={"Click an item title to read it. Click the circle to cycle status: empty → in-progress → done."} itemTypeIcon={itemTypeIcon} /> :
    tab === 'discover' ? <CollegeDiscoverTab open={open} existingIds={apps.map(a => a.collegeId)} onAdd={handleAddFromDiscover} /> :
    tab === 'list' ? <CollegeListTab apps={apps} onUpdate={handleUpdateApp} onRemove={handleRemoveApp} onAdd={handleAddManual} /> :
    <ApplicationStatusTab apps={apps} onUpdate={handleUpdateApp} onSetShared={handleSetSharedTask} gradeStartIdx={profile?.grade_start_idx} />

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
      {showFeeWaiver && (
        <FeeWaiverNotice
          eligibility={feeWaiverEligibility(incomeLevel)}
          variant="module"
          // Qualifying students go to the checklist that holds the
          // "Application Fees & Fee Waivers" article; students with no income
          // on file are handed off to the profile page to add it.
          onPrimary={() => {
            if (feeWaiverEligibility(incomeLevel) === 'likely') setTab('overview')
            else onEditIncome?.()
          }}
          onDismiss={dismissFeeWaiver}
        />
      )}
      {content}
    </ModuleShell>
  )
}
