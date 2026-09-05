/**
 * useDeadlineEvents — the student's dated deadlines, from every source that has
 * them, as one sorted list.
 *
 * The calendar, the timeline and the dashboard all want the same thing, and
 * each used to fetch and derive it separately. Adding scholarships would have
 * meant repeating the same second fetch in three places, so the merge lives
 * here instead.
 *
 * Two sources today: the college list (module_data) and tracked scholarships
 * (fafsa_tracker_items). A failure in one leaves the other's deadlines on
 * screen rather than blanking the view.
 */

import { useEffect, useMemo, useState } from 'react'
import { getModuleData } from './moduleProgress'
import { getTrackerItems, type TrackerItem } from './fafsaData'
import {
  APPLICATIONS_MODULE,
  APPLICATIONS_DATA_KEY,
  deriveDeadlineEvents,
  deriveScholarshipEvents,
  mergeDeadlineEvents,
  type DeadlineEvent,
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
}

export function useDeadlineEvents(
  gradeStartIdx: number | null | undefined,
  { active = true }: UseDeadlineEventsOptions = {},
): DeadlineEventsResult {
  const [apps, setApps] = useState<ApplicationEntry[]>([])
  const [scholarships, setScholarships] = useState<TrackerItem[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    getModuleData<ApplicationEntry[]>(APPLICATIONS_MODULE, APPLICATIONS_DATA_KEY)
      .then((data) => { if (!cancelled) setApps(data ?? []) })
      .catch(() => { if (!cancelled) setFailed(true) })
    getTrackerItems()
      .then((items) => { if (!cancelled) setScholarships(items) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [active])

  const events = useMemo(
    () =>
      mergeDeadlineEvents(
        deriveDeadlineEvents(apps, { gradeStartIdx }),
        deriveScholarshipEvents(scholarships, { gradeStartIdx }),
      ),
    [apps, scholarships, gradeStartIdx],
  )
  return { events, failed }
}
