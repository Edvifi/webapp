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
import { MODULE_COLORS } from '../lib/designTokens'
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
import CollegeDiscoverTab from './CollegeDiscoverTab'
import AidCompare from './AidCompare'
import { FEATURES } from '../lib/features'
import ApplicationStatusTab from './ApplicationStatusTab'
import FeeWaiverNotice from './FeeWaiverNotice'
import { feeWaiverEligibility, shouldShowFeeWaiverNotice, FEE_WAIVER_NOTICE_KEY } from '../lib/feeWaivers'
import { initialTasksFor, setSharedTask, updateSharedTask } from '../data/applicationTasks'
import { collegeAppId, type College, type AdmissionBand } from '../lib/collegeMatch'
import { projectToMap } from '../lib/mapProjection'
import { domainOf } from '../lib/collegeLogo'
import { routedTab, useRoutedTab } from '../lib/hashRoute'

const MC = MODULE_COLORS.applications
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
  { id: 'discover', label: 'Discover', icon: MODULE_ICONS.compass },
  { id: 'status', label: 'Application Status', icon: MODULE_ICONS.chart },
  ...(FEATURES.aidCompare ? [{ id: 'aid-compare' as const, label: 'Aid Compare', icon: MODULE_ICONS.scale }] : []),
]
const TAB_IDS = TABS.map((t) => t.id)

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
  // Opens on Application Status: a returning student wants to see where each
  // application stands. The nav keeps its teaching order (the tour walks it).
  const [tab, setTab] = useRoutedTab<TabId>('Application Tracking', open, TAB_IDS, 'status')
  // A school to open straight onto when switching to Application Status
  // (clicking a logo in Discover's list strip). Any other tab change clears it.
  const [statusSchool, setStatusSchool] = useState<string | null>(null)
  const switchTab = useCallback((t: TabId) => { setStatusSchool(null); setTab(t) }, [setTab])

  // The module stays mounted while closed — it holds the college list and its
  // checklist — so without this it reopens wherever it was left. Someone who
  // last looked at Discover came back to Discover, days later, with no memory
  // of having gone there. Adjusted on the open transition rather than in an
  // effect, so the first paint is already the right tab.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    // A tab named in the URL (back/forward, or a refresh) wins over the default.
    if (open) { setTab(routedTab('Application Tracking', TAB_IDS) ?? 'status'); setStatusSchool(null) }
  }
  const openInStatus = useCallback((collegeId: string | null) => { setStatusSchool(collegeId); setTab('status') }, [setTab])
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
    const entry: ApplicationEntry = { collegeId: id, category, deadlineType: 'RD', status: 'not-started', name: college.name, subtitle: collegeSubtitle(college), source: 'scorecard', state: college.state, city: college.city, mapX, mapY, website: domainOf(college.url), ownership: college.ownership, institutionType: college.institution_type, applicationFeeCents: college.application_fee_cents, feeWaiverPolicy: college.fee_waiver_policy }
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

  // Only on the tabs where fees are actually in view — the overview tab hands
  // its whole surface over to article reading, and a banner above that intrudes.
  const showFeeWaiver =
    !feeWaiverDismissed
    && tab === 'status'
    && shouldShowFeeWaiverNotice(incomeLevel, profile?.settings?.intros_seen)

  const content =
    tab === 'overview' ? <ModuleOverviewTab progress={progress} onToggle={handleToggle} onMarkComplete={handleMarkComplete} checklist={APPLICATIONS_CHECKLIST} contentMap={APPLICATIONS_CONTENT_MAP} allIds={APPLICATIONS_ALL_IDS} totalItems={APPLICATIONS_TOTAL_ITEMS} accent={MC} title="Application Strategy Checklist" subtitle={"Click an item title to read it. Click the circle to cycle status: empty → in-progress → done."} itemTypeIcon={itemTypeIcon} aside={aside} /> :
    tab === 'aid-compare' && FEATURES.aidCompare ? <AidCompare collegeIds={apps.map((a) => a.collegeId)} accent={MC} /> :
    tab === 'discover' ? <CollegeDiscoverTab open={open} apps={apps} listLoaded={appsLoaded} onAdd={handleAddFromDiscover} onOpenSchool={openInStatus} onManageList={() => openInStatus(null)} onRemove={handleRemoveApp} /> :
    <ApplicationStatusTab key={statusSchool ?? ''} onFindColleges={() => switchTab('discover')} apps={apps} onUpdate={handleUpdateApp} onRemove={handleRemoveApp} onSetShared={handleSetSharedTask} onSetSharedDue={handleSetSharedDue} gradeStartIdx={profile?.grade_start_idx} initialOpenId={statusSchool} colleges={collegeRows} />

  return (
    <ModuleShell
      open={open}
      onClose={onClose}
      breadcrumbLabel="Application Tracking"
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
          // Qualifying students go to the checklist that holds the
          // "Application Fees & Fee Waivers" article; students with no income
          // on file are handed off to the profile page to add it.
          onPrimary={() => {
            if (feeWaiverEligibility(incomeLevel) === 'likely') switchTab('overview')
            else onEditIncome?.()
          }}
          onDismiss={dismissFeeWaiver}
        />
      )}
      {content}
    </ModuleShell>
  )
}
