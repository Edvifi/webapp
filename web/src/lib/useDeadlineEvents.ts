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

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getModuleData } from './moduleProgress'
import { getTrackerItems, type TrackerItem } from './fafsaData'
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
  type DeadlineEvent,
  type DeadlineModule,
} from '../data/applicationDeadlines'
import type { ApplicationEntry } from '../data/applicationsChecklist'

export interface UseDeadlineEventsOptions {
  /** Skip fetching while false — e.g. the dashboard pauses whilst a module is
   *  open, then refetches on the way back so new entries surface. */
  active?: boolean
}

export interface DeadlineEventsResult {
  events: DeadlineEvent[]
  /** True when a source failed to load. Without it an empty list is
   *  indistinguishable from "you have nothing tracked", and the view tells the
   *  student to add what they have already added. */
  failed: boolean
  /** Tick an event off, or untick it. Works for derived events too — a student
   *  who has sent their Harvard application wants it to stop shouting. */
  toggleDone: (id: string) => void
  addOwn: (title: string, date: string, module: DeadlineModule) => void
  removeOwn: (id: string) => void
}

export function useDeadlineEvents(
  gradeStartIdx: number | null | undefined,
  { active = true }: UseDeadlineEventsOptions = {},
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
  const toggleDone = useCallback((id: string) => {
    setDoneIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      saveDoneIds(next).catch(() => setFailed(true))
      return next
    })
  }, [])

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

  const events = useMemo(() => {
    const done = new Set(doneIds)
    return mergeDeadlineEvents(
      deriveDeadlineEvents(apps, { gradeStartIdx }),
      deriveScholarshipEvents(scholarships, { gradeStartIdx }),
      deriveOwnEvents(own),
    ).map((e) => (done.has(e.id) ? { ...e, done: true } : e))
  }, [apps, scholarships, own, doneIds, gradeStartIdx])

  return { events, failed, toggleDone, addOwn, removeOwn }
}
