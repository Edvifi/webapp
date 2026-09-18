/**
 * useDeadlineEvents — the student's dated deadlines, from every source that has
 * them, as one sorted list.
 *
 * The calendar, the timeline, the week strip and the dashboard all want the
 * same thing, and each used to fetch and derive it separately. Adding
 * scholarships would have meant repeating the same second fetch in three
 * places, so the merge lives here instead.
 *
 * Four sources today: the college list (module_data), tracked scholarships
 * (fafsa_tracker_items), the dates the student set for themselves, and the set
 * of ids they have ticked off. A failure in one leaves the others' deadlines on
 * screen rather than blanking the view.
 *
 * This is also the only layer that knows about *student state*. Derivation
 * turns colleges into dates and knows nothing about who is looking; the done
 * flag and self-set rows are applied here, on the way out.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getModuleData, setModuleData } from './moduleProgress'
import { getTrackerItems, updateTrackerStatus, type TrackerItem } from './fafsaData'
import {
  getDoneIds,
  saveDoneIds,
  getPersonalDeadlines,
  savePersonalDeadlines,
  deriveOwnEvents,
  makePersonalDeadline,
  type PersonalDeadline,
} from './personalDeadlines'
import {
  APPLICATIONS_MODULE,
  APPLICATIONS_DATA_KEY,
  deriveDeadlineEvents,
  deriveScholarshipEvents,
  mergeDeadlineEvents,
  visibleDeadlines,
  type AppDoneStatus,
  type DeadlineEvent,
  type DeadlineModule,
} from '../data/applicationDeadlines'
import type { ApplicationEntry } from '../data/applicationsChecklist'

export interface UseDeadlineEventsOptions {
  /** Skip fetching while false — e.g. the dashboard pauses whilst a module is
   *  open, then refetches on the way back so new entries surface. */
  active?: boolean
  /** The student's standing deadline preferences, from the settings page.
   *  Applied here so every dated view filters identically; omitted means no
   *  filtering, which is what the pure tests want. */
  visibility?: { showEstimated?: boolean; modules?: readonly string[] }
  /** Told what a tick just did, so the view can say so. Ticking a deadline
   *  edits a record on another page; doing that silently is how a student ends
   *  up with an application marked submitted and no idea why. */
  onNotice?: (message: string) => void
}

export interface DeadlineEventsResult {
  events: DeadlineEvent[]
  /** True when a source failed to load. Without it an empty list is
   *  indistinguishable from "you have nothing tracked", and the view tells the
   *  student to add what they have already added. */
  failed: boolean
  /** Tick an event off, or untick it.
   *
   *  Where a record owns the deadline, this writes *that record's* status, so
   *  ticking Harvard's Early Action here and marking it submitted inside
   *  Application Tracking are the same act and can never disagree. Only
   *  deadlines no record owns — the aggregate FAFSA date, and the student's own
   *  notes — fall back to a stored id list. */
  toggleDone: (event: DeadlineEvent) => void
  addOwn: (title: string, date: string, module: DeadlineModule) => void
  removeOwn: (id: string) => void
}

export function useDeadlineEvents(
  gradeStartIdx: number | null | undefined,
  { active = true, visibility, onNotice }: UseDeadlineEventsOptions = {},
): DeadlineEventsResult {
  const [apps, setApps] = useState<ApplicationEntry[]>([])
  const [scholarships, setScholarships] = useState<TrackerItem[]>([])
  const [own, setOwn] = useState<PersonalDeadline[]>([])
  const [doneIds, setDoneIds] = useState<string[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    const fail = () => { if (!cancelled) setFailed(true) }
    getModuleData<ApplicationEntry[]>(APPLICATIONS_MODULE, APPLICATIONS_DATA_KEY)
      .then((data) => { if (!cancelled) setApps(data ?? []) })
      .catch(fail)
    getTrackerItems()
      .then((items) => { if (!cancelled) setScholarships(items) })
      .catch(fail)
    getPersonalDeadlines()
      .then((items) => { if (!cancelled) setOwn(items) })
      .catch(fail)
    getDoneIds()
      .then((ids) => { if (!cancelled) setDoneIds(ids) })
      .catch(fail)
    return () => { cancelled = true }
  }, [active])

  /**
   * Local state moves first and the write follows, so a tick feels immediate.
   * A failed write leaves the optimistic value in place rather than snapping
   * back: the next load corrects it, and silently undoing a student's tick
   * mid-session is the worse of the two wrong answers.
   */
  /**
   * What each record's status was before a tick set it to submitted, so an
   * untick puts back what was actually there.
   *
   * A mis-tap on a not-yet-started application used to leave it in-progress
   * for good, because untick had no way of knowing what it had overwritten.
   * Session-scoped on purpose: the case worth fixing is a tap undone seconds
   * later, and persisting a shadow copy of every status is a second source of
   * truth for the thing this whole change exists to stop.
   */
  const priorStatus = useRef(new Map<string, string>())

  const setAppStatus = useCallback((collegeId: string, done: boolean, title: string) => {
    setApps((prev) => {
      const current = prev.find((a) => a.collegeId === collegeId)?.status
      if (done && current) priorStatus.current.set(collegeId, current)
      const restored = priorStatus.current.get(collegeId) ?? 'in-progress'
      const next = prev.map((a) =>
        a.collegeId === collegeId
          ? { ...a, status: (done ? 'submitted' : restored) as AppDoneStatus }
          : a,
      )
      if (!done) priorStatus.current.delete(collegeId)
      setModuleData(APPLICATIONS_MODULE, APPLICATIONS_DATA_KEY, next)
        .catch(() => setFailed(true))
      return next
    })
    onNotice?.(done
      ? `${title} marked submitted in Application Tracking.`
      : `${title} moved back in Application Tracking.`)
  }, [onNotice])

  /** The tracker's mirror of the above. */
  const setScholarshipStatus = useCallback((itemId: string, done: boolean, title: string) => {
    setScholarships((prev) => {
      const current = prev.find((s) => s.id === itemId)?.status
      if (done && current) priorStatus.current.set(itemId, current)
      const restored = (priorStatus.current.get(itemId) ?? 'ready') as TrackerItem['status']
      const status = done ? ('submitted' as TrackerItem['status']) : restored
      if (!done) priorStatus.current.delete(itemId)
      updateTrackerStatus(itemId, status).catch(() => setFailed(true))
      return prev.map((s) => (s.id === itemId ? { ...s, status } : s))
    })
    onNotice?.(done
      ? `${title} marked submitted in Financial Aid.`
      : `${title} moved back in Financial Aid.`)
  }, [onNotice])

  const toggleDone = useCallback((event: DeadlineEvent) => {
    const done = !event.done
    if (event.category === 'application' && event.sourceRef) {
      setAppStatus(event.sourceRef, done, event.shortTitle)
      return
    }
    if (event.category === 'scholarship' && event.sourceRef) {
      setScholarshipStatus(event.sourceRef, done, event.shortTitle)
      return
    }
    // FAFSA is one date derived from the whole college list, and a self-set
    // date is its own record with no status field — both keep their tick here.
    setDoneIds((prev) => {
      const next = done ? [...prev, event.id] : prev.filter((x) => x !== event.id)
      saveDoneIds(next).catch(() => setFailed(true))
      return next
    })
  }, [setAppStatus, setScholarshipStatus])

  const addOwn = useCallback((title: string, date: string, module: DeadlineModule) => {
    setOwn((prev) => {
      const next = [...prev, makePersonalDeadline(title, date, module)]
      savePersonalDeadlines(next).catch(() => setFailed(true))
      return next
    })
  }, [])

  const removeOwn = useCallback((id: string) => {
    setOwn((prev) => {
      const next = prev.filter((x) => x.id !== id)
      savePersonalDeadlines(next).catch(() => setFailed(true))
      return next
    })
    // A removed row should not keep a tick alive in storage forever.
    setDoneIds((prev) => {
      if (!prev.includes(id)) return prev
      const next = prev.filter((x) => x !== id)
      saveDoneIds(next).catch(() => setFailed(true))
      return next
    })
  }, [])

  const showEstimated = visibility?.showEstimated
  const modules = visibility?.modules
  const events = useMemo(() => {
    const done = new Set(doneIds)
    const all = mergeDeadlineEvents(
      deriveDeadlineEvents(apps, { gradeStartIdx }),
      deriveScholarshipEvents(scholarships, { gradeStartIdx }),
      deriveOwnEvents(own),
      // A derived event already carries `done` from its own record's status;
      // the stored list only covers the ones no record owns.
    ).map((e) => (done.has(e.id) ? { ...e, done: true } : e))
    return visibility ? visibleDeadlines(all, { showEstimated, modules }) : all
  }, [apps, scholarships, own, doneIds, gradeStartIdx, visibility, showEstimated, modules])

  return { events, failed, toggleDone, addOwn, removeOwn }
}
