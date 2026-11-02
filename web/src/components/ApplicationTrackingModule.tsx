/**
 * ApplicationTrackingModule — third concrete module.
 *
 * Tabs: Overview (strategy checklist), Discover (matches, with the student's
 * list and its map at the top), Application Status (per-app workflow, where
 * each school's category, round and removal live). Persists college list and statuses
 * via getModuleData/setModuleData (profiles.settings.module_data.applications).
 */

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { MODULE_ICONS } from './moduleIcons'
import { useAuth } from '../contexts/AuthContext'
import { markIntroSeen } from '../lib/profiles'
import { C, MODULE_COLORS } from '../lib/designTokens'
import { useModuleChecklist } from '../lib/useModuleState'
import { useApplications } from '../contexts/ApplicationsContext'
import { useToast } from '../contexts/ToastContext'
import {
  APPLICATIONS_CHECKLIST,
  APPLICATIONS_TOTAL_ITEMS,
  APPLICATIONS_ALL_IDS,
  withKnownCategory,
  type AppCategory,
  type ApplicationEntry,
  type ApplicationsItemType,
} from '../data/applicationsChecklist'
import { APPLICATIONS_CONTENT_MAP } from '../data/applicationsContent'
import { collegeSubtitle, fetchSavedColleges } from '../lib/collegeSearch'
import ApplicationsModuleTour, { type ApplicationsTabId } from './ApplicationsModuleTour'
import ModuleTabNav from './ModuleTabNav'
import ModuleOverviewTab from './ModuleOverviewTab'
import ModuleShell from './ModuleShell'
import YourListStrip from './YourListStrip'
import { useCollegePrefs, useLocatedProfile } from '../lib/useCollegePrefs'
import CollegeDiscoverTab from './CollegeDiscoverTab'
import AidCompare from './AidCompare'
import { FEATURES } from '../lib/features'
import ApplicationStatusTab from './ApplicationStatusTab'
import FeeWaiverNotice from './FeeWaiverNotice'
import { feeWaiverEligibility, shouldShowFeeWaiverNotice, FEE_WAIVER_NOTICE_KEY } from '../lib/feeWaivers'
import { initialTasksFor, isTwoYearOrTrade, setSharedTask, updateSharedTask } from '../data/applicationTasks'
import { collegeAppId, type College, type AdmissionBand } from '../lib/collegeMatch'
import { projectToMap } from '../lib/mapProjection'
import { domainOf } from '../lib/collegeLogo'
import { schoolDisplay } from '../lib/schoolDisplay'
import { routedItem, routedTab, useRoutedTab } from '../lib/hashRoute'

const MC = MODULE_COLORS.applications
const font = "'Outfit',sans-serif"
const MODULE_NAME = 'applications'
const TOUR_INTRO_KEY = 'applications-module-tour'

/* ─── primitives ─── */

const itemTypeIcon: Record<ApplicationsItemType, ReactNode> = {
  article: MODULE_ICONS.article,
  task: MODULE_ICONS.task,
  resource: MODULE_ICONS.resource,
}

/* ─── tab nav ─── */

type TabId = ApplicationsTabId

const TABS: Array<{ id: TabId; label: string; icon: ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: MODULE_ICONS.overview },
  { id: 'application-101', label: 'Application 101', icon: MODULE_ICONS.article },
  { id: 'discover', label: 'Discover', icon: MODULE_ICONS.compass },
  { id: 'status', label: 'Application Status', icon: MODULE_ICONS.chart },
  ...(FEATURES.aidCompare ? [{ id: 'aid-compare' as const, label: 'Aid Compare', icon: MODULE_ICONS.scale }] : []),
]
const TAB_IDS = TABS.map((t) => t.id)

/* ─── overview ─── */

/** The list at a glance, as Financial Aid's Overview is the aid: the map and
 *  balance strip from Discover, under a word on where this grade stands. */
function OverviewTab({ open, apps, listLoaded, year, aside, onOpenSchool, onManage, onDiscover }: {
  open: boolean
  apps: ApplicationEntry[]
  listLoaded: boolean
  year?: number
  aside?: ReactNode
  onOpenSchool: (collegeId: string) => void
  onManage: () => void
  onDiscover: () => void
}) {
  const { studentProfile } = useCollegePrefs(open)
  const { profile, origin } = useLocatedProfile(studentProfile)
  const intro = (year ?? 11) >= 12
    ? 'Senior year is when it all gets sent. Every school’s deadline and requirements live in Application Status; mark each one off as it goes in.'
    : year === 11
      ? 'Junior year is for building the list. Find schools that fit in Discover, and aim for a mix of reaches, targets and likely schools by the end of the summer.'
      : 'You’re early, and that’s an advantage. Start a list of schools you’re curious about in Discover. It will change, and that’s the point.'
  return (
    <div className="mov" style={{ display: 'flex', alignItems: 'flex-start', gap: 26, padding: '28px 30px' }}>
      <div className="mov-main" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: font, fontSize: 11, fontWeight: 600, color: MC, textTransform: 'uppercase', letterSpacing: '0.07em', background: `${MC}12`, padding: '4px 10px', borderRadius: 99, border: `1px solid ${MC}20`, marginBottom: 12 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: MC }} />Building Your List
        </div>
        <h1 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, fontWeight: 400, color: C.text, margin: '0 0 8px' }}>Application Tracking</h1>
        <p style={{ fontFamily: font, fontSize: 14, color: C.textMuted, margin: '0 0 20px', lineHeight: 1.6, maxWidth: 520 }}>{intro}</p>
        {!listLoaded ? (
          <div style={{ fontFamily: font, fontSize: 13, color: C.textMuted }}>Loading your list…</div>
        ) : apps.length > 0 ? (
          <YourListStrip apps={apps} profile={profile} origin={origin} onOpenSchool={onOpenSchool} onManage={onManage} />
        ) : (
          <div style={{ border: `1px dashed ${C.borderStrong}`, borderRadius: 14, padding: '18px 20px', fontFamily: font, fontSize: 13, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ flex: '1 1 240px' }}><b style={{ color: C.text, fontWeight: 600 }}>Your list is empty.</b> Schools you add land here, pinned on a map.</span>
            <button onClick={onDiscover} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: MC, color: '#fff', cursor: 'pointer', fontFamily: font, fontSize: 13, fontWeight: 600 }}>Find colleges in Discover</button>
          </div>
        )}
      </div>
      {aside}
    </div>
  )
}

/* ─── module shell ─── */

interface Props {
  open: boolean
  onClose: () => void
  /** Close the module and open the profile page, where household income is editable. */
  onEditIncome?: () => void
  /** Deadline rail for the Overview tab. Built by the dashboard so every
   *  panel shares one set of handlers and one copy of the student's dates. */
  aside?: ReactNode
  /** The student's grade, for the header's year badge. */
  year?: number
}

export default function ApplicationTrackingModule({ open, onClose, onEditIncome, aside, year }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const tourSeen = profile?.settings?.intros_seen?.includes(TOUR_INTRO_KEY) ?? false
  const [showTour, setShowTour] = useState(false)
  // Opens on Overview, as Financial Aid does. The school whose page is open is
  // in the URL too, under its tab, so Back returns to the list and a link or
  // refresh lands on the school.
  const [tab, setTab, routedSchool, setSchool] = useRoutedTab<TabId>('Application Tracking', open, TAB_IDS, 'overview')
  // Changing tab closes the school's page (useRoutedTab does that).
  const switchTab = setTab
  const school = tab === 'status' ? routedSchool : null

  // The module stays mounted while closed — it holds the college list and its
  // checklist — so without this it reopens wherever it was left. Someone who
  // last looked at Discover came back to Discover, days later, with no memory
  // of having gone there. Adjusted on the open transition rather than in an
  // effect, so the first paint is already the right tab.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    // A tab named in the URL (back/forward, or a refresh) wins over the default.
    if (open) { setTab(routedTab('Application Tracking', TAB_IDS) ?? 'overview'); setSchool(routedItem('Application Tracking', TAB_IDS)) }
  }
  // From Discover's list strip: a school's page, or the list itself.
  const openInStatus = useCallback((collegeId: string | null) => { setTab('status'); setSchool(collegeId) }, [setTab, setSchool])
  // Dismissal persists via mark_intro_seen, but that round-trips through a
  // profile refresh; track it locally so the banner goes away on the click.
  const [feeWaiverDismissed, setFeeWaiverDismissed] = useState(false)
  const { progress, handleToggle, handleMarkComplete } = useModuleChecklist(MODULE_NAME, open)
  const toast = useToast()
  // Shared with the dashboard and the deadline panels rather than loaded
  // again here: the list persists as one whole array, so a second copy meant
  // whichever view saved last replaced what the other had just written.
  const { apps: storedApps, saveApps: persistApps, appsRef, loaded: appsLoaded, loadFailed: appsLoadFailed, colleges: collegeRows } = useApplications()
  // Views get only categories they know; what's stored is left as it is.
  const apps = useMemo(() => storedApps.map(withKnownCategory), [storedApps])
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

  // Entries saved before the map stored coordinates (including every school
  // from the old static list) have no pin, and the old list's entries no name
  // of their own, so they showed its short names ("Harvard", "UNC Chapel
  // Hill") beside every newer school's official one. Look both up once per
  // session and save them onto the entry, the same fields a new add writes.
  const locationBackfillTried = useRef(false)
  useEffect(() => {
    if (!open || appsLoadFailed || locationBackfillTried.current) return
    const missing = apps.filter((a) => a.mapX == null || a.mapY == null || !a.name)
    if (missing.length === 0) return
    locationBackfillTried.current = true
    fetchSavedColleges(missing.map((a) => a.collegeId))
      .then((rows) => {
        let changed = false
        const next = appsRef.current.map((a) => {
          const row = rows.get(a.collegeId)
          if (!row) return a
          let out = a
          if (!a.name) out = { ...out, name: row.name, website: a.website ?? domainOf(row.url) }
          const xy = a.mapX == null || a.mapY == null ? projectToMap(row.longitude, row.latitude, row.state) : null
          if (xy) out = { ...out, mapX: xy[0], mapY: xy[1], city: a.city ?? row.city, state: a.state ?? row.state } // territories stay off the map
          if (out !== a) changed = true
          return out
        })
        if (changed) persistApps(next)
      })
      // Pins are supplementary; a failed lookup leaves the map as it was.
      .catch(() => {})
  }, [open, apps, appsLoadFailed, appsRef, persistApps])

  const addCollegeSnapshot = useCallback((college: College, category: AppCategory) => {
    const current = appsRef.current
    const id = collegeAppId(college)
    if (current.some(a => a.collegeId === id)) return
    const [mapX, mapY] = projectToMap(college.longitude, college.latitude, college.state) ?? [null, null]
    // Community colleges and trade schools admit on a rolling basis; there is
    // no Regular Decision date to give them.
    const deadlineType = isTwoYearOrTrade({ institutionType: college.institution_type }) ? 'Rolling' : 'RD'
    const entry: ApplicationEntry = { collegeId: id, category, deadlineType, status: 'not-started', name: college.name, subtitle: collegeSubtitle(college), source: 'scorecard', state: college.state, city: college.city, mapX, mapY, website: domainOf(college.url), ownership: college.ownership, institutionType: college.institution_type, applicationFeeCents: college.application_fee_cents, feeWaiverPolicy: college.fee_waiver_policy }
    // Only seed tasks when a shared one is already done or dated elsewhere; otherwise
    // leave them unset so the default checklist keeps tracking the entry.
    const tasks = initialTasksFor(entry, current)
    persistApps([...current, tasks.some((t) => t.done || t.due) ? { ...entry, tasks } : entry])
  }, [persistApps, appsRef])

  const handleAddFromDiscover = useCallback((college: College, band: AdmissionBand) => {
    addCollegeSnapshot(college, band === 'reach' ? 'reach' : band === 'target' ? 'match' : 'safety')
  }, [addCollegeSnapshot])

  const handleUpdateApp = useCallback((collegeId: string, fields: Partial<ApplicationEntry>) => {
    persistApps(appsRef.current.map(a => a.collegeId === collegeId ? { ...a, ...fields } : a))
  }, [persistApps, appsRef])

  // One date for a shared task, on every school that needs it.
  const handleSetSharedDue = useCallback((taskId: string, due: string | undefined) => {
    persistApps(updateSharedTask(appsRef.current, taskId, { due }))
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

  // Only on the tabs where fees are actually in view — Application 101 hands
  // its whole surface over to article reading, and a banner above that intrudes.
  const showFeeWaiver =
    !feeWaiverDismissed
    && tab === 'status'
    && shouldShowFeeWaiverNotice(incomeLevel, profile?.settings?.intros_seen)

  const content =
    tab === 'overview' ? <OverviewTab open={open} apps={apps} listLoaded={appsLoaded} year={year} aside={aside} onOpenSchool={(id) => openInStatus(id)} onManage={() => openInStatus(null)} onDiscover={() => switchTab('discover')} /> :
    tab === 'application-101' ? <ModuleOverviewTab progress={progress} onToggle={handleToggle} onMarkComplete={handleMarkComplete} checklist={APPLICATIONS_CHECKLIST} contentMap={APPLICATIONS_CONTENT_MAP} allIds={APPLICATIONS_ALL_IDS} totalItems={APPLICATIONS_TOTAL_ITEMS} accent={MC} title="Application 101" subtitle={"Click an item title to read it. Click the circle to cycle status: empty → in-progress → done."} itemTypeIcon={itemTypeIcon} backLabel="Back to Application 101" /> :
    tab === 'aid-compare' && FEATURES.aidCompare ? <AidCompare collegeIds={apps.map((a) => a.collegeId)} accent={MC} /> :
    tab === 'discover' ? <CollegeDiscoverTab open={open} apps={apps} listLoaded={appsLoaded} onAdd={handleAddFromDiscover} onOpenSchool={openInStatus} onManageList={() => openInStatus(null)} onRemove={handleRemoveApp} /> :
    <ApplicationStatusTab onFindColleges={() => switchTab('discover')} apps={apps} onUpdate={handleUpdateApp} onRemove={handleRemoveApp} onSetShared={handleSetSharedTask} onSetSharedDue={handleSetSharedDue} gradeStartIdx={profile?.grade_start_idx} openId={school} onOpen={setSchool} colleges={collegeRows} />
  const openApp = school ? apps.find((a) => a.collegeId === school) : undefined

  return (
    <ModuleShell
      open={open}
      onClose={onClose}
      breadcrumbLabel="Application Tracking"
      tabLabel={TABS.find((t) => t.id === tab)?.label}
      pageLabel={openApp && schoolDisplay(openApp).name}
      onBack={openApp && (() => setSchool(null))}
      year={year}
      scrollKey={tab}
      nav={<ModuleTabNav active={tab} onTab={switchTab} progress={progress} totalItems={APPLICATIONS_TOTAL_ITEMS} accent={MC} title="Applications" subtitle="Building Your List" tabs={TABS} onTour={() => setShowTour(true)} />}
      tour={showTour && (
        <ApplicationsModuleTour
          onStart={() => { if (user) markIntroSeen(TOUR_INTRO_KEY).then(refreshProfile).catch(() => {}) }}
          onDismiss={() => setShowTour(false)}
          onSwitchTab={switchTab}
        />
      )}
    >
      {showFeeWaiver && (
        <FeeWaiverNotice
          eligibility={feeWaiverEligibility(incomeLevel)}
          variant="module"
          // Students who (may) qualify go to the checklist that holds the
          // "Application Fees & Fee Waivers" article; students with no income
          // on file are handed off to the profile page to add it.
          onPrimary={() => {
            if (feeWaiverEligibility(incomeLevel) === 'unknown') onEditIncome?.()
            else switchTab('application-101')
          }}
          onDismiss={dismissFeeWaiver}
        />
      )}
      {content}
    </ModuleShell>
  )
}
