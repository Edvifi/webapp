/**
 * applicationDeadlines — derives dated deadline events from the student's
 * college list. This is the single source of truth that feeds the calendar,
 * the timeline "upcoming" rail, and the dashboard "next due" chips.
 *
 * College deadlines live in collegeData as human-readable strings ("Nov 1,
 * 2026"); an ApplicationEntry only records the *type* (ED/EA/RD/…). This module
 * resolves each entry to its actual date and normalises everything into a flat,
 * date-sorted DeadlineEvent list.
 */

import { getCollegeById } from './collegeData'
import type { ApplicationEntry, AppDeadlineType } from './applicationsChecklist'

/** Where the college list is persisted (profiles.settings.module_data[MODULE][KEY]). */
export const APPLICATIONS_MODULE = 'applications'
export const APPLICATIONS_DATA_KEY = 'apps'

export type DeadlineModule = 'Application Tracking' | 'Financial Aid'

export interface DeadlineEvent {
  id: string
  /** null for aggregate events (e.g. FAFSA) that aren't tied to one college. */
  collegeId: string | null
  /** Full label, e.g. "Harvard — Early Action". */
  title: string
  /** Compact label for tight spots, e.g. "Harvard EA". */
  shortTitle: string
  emoji: string
  module: DeadlineModule
  deadlineType?: AppDeadlineType
  date: Date
  /** Original human-readable string, e.g. "Nov 1, 2026". */
  dateDisplay: string
  color: string
  /** true when the date is a smart default rather than a curated real deadline. */
  estimated: boolean
}

export const DEADLINE_TYPE_LABEL: Record<AppDeadlineType, string> = {
  ED: 'Early Decision',
  EA: 'Early Action',
  REA: 'Restrictive Early Action',
  RD: 'Regular Decision',
  Rolling: 'Rolling',
}

export const DEADLINE_TYPE_COLOR: Record<AppDeadlineType, string> = {
  ED: '#B93A3A',
  REA: '#B93A3A',
  EA: '#C47A12',
  RD: '#1D7FC4',
  Rolling: '#2D9E72',
}

const FAFSA_COLOR = '#C47A12'

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/**
 * Parse a college-data date string ("Nov 1, 2026") to a local Date at midnight.
 * Returns null for empty / "Rolling" / unparseable input.
 */
export function parseCollegeDate(str: string | null | undefined): Date | null {
  if (!str) return null
  const m = str.trim().match(/^([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})$/)
  if (!m) return null
  const month = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase())
  if (month < 0) return null
  return new Date(parseInt(m[3], 10), month, parseInt(m[2], 10))
}

/** Resolve the concrete deadline string for an entry's chosen deadline type. */
function resolveAppDeadline(
  deadlines: { earlyAction?: string | null; earlyDecision?: string | null; regularDecision: string },
  type: AppDeadlineType,
): string | null {
  switch (type) {
    case 'ED':
      return deadlines.earlyDecision ?? null
    case 'EA':
      return deadlines.earlyAction ?? null
    case 'REA':
      return deadlines.earlyAction ?? deadlines.earlyDecision ?? null
    case 'RD':
      return deadlines.regularDecision
    case 'Rolling':
      return null
  }
}

/**
 * Turn the college list into dated events: one per application whose chosen
 * deadline type has a concrete date, plus a single FAFSA-priority event (the
 * earliest priority date across the list, since FAFSA is filed once).
 * Sorted ascending by date.
 */
export function deriveDeadlineEvents(apps: ApplicationEntry[]): DeadlineEvent[] {
  const events: DeadlineEvent[] = []

  for (const a of apps) {
    const college = getCollegeById(a.collegeId)
    if (!college) continue
    const raw = resolveAppDeadline(college.applicationDeadlines, a.deadlineType)
    const date = parseCollegeDate(raw)
    if (!date || !raw) continue
    events.push({
      id: `app-${a.collegeId}-${a.deadlineType}`,
      collegeId: college.id,
      title: `${college.name} — ${DEADLINE_TYPE_LABEL[a.deadlineType]}`,
      shortTitle: `${college.name} ${a.deadlineType}`,
      emoji: college.emoji,
      module: 'Application Tracking',
      deadlineType: a.deadlineType,
      date,
      dateDisplay: raw,
      color: DEADLINE_TYPE_COLOR[a.deadlineType],
      estimated: college.deadlinesEstimated ?? false,
    })
  }

  // FAFSA priority — collapse to the single earliest date across the list.
  let earliestFafsa: { date: Date; display: string; estimated: boolean } | null = null
  for (const a of apps) {
    const college = getCollegeById(a.collegeId)
    if (!college) continue
    const date = parseCollegeDate(college.financialAidDeadlines.fafsaPriority)
    if (!date) continue
    if (!earliestFafsa || date < earliestFafsa.date) {
      earliestFafsa = {
        date,
        display: college.financialAidDeadlines.fafsaPriority,
        estimated: college.deadlinesEstimated ?? false,
      }
    }
  }
  if (earliestFafsa) {
    events.push({
      id: 'fafsa-priority',
      collegeId: null,
      title: 'FAFSA priority deadline',
      shortTitle: 'FAFSA priority',
      emoji: '💰',
      module: 'Financial Aid',
      date: earliestFafsa.date,
      dateDisplay: earliestFafsa.display,
      color: FAFSA_COLOR,
      estimated: earliestFafsa.estimated,
    })
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime())
}

/** Events on or after `now` (midnight-compared), preserving sort order. */
export function upcomingEvents(events: DeadlineEvent[], now: Date): DeadlineEvent[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return events.filter((e) => e.date.getTime() >= startOfToday)
}

/** Soonest upcoming event for a module, or null. */
export function nextDueForModule(
  events: DeadlineEvent[],
  module: DeadlineModule,
  now: Date,
): DeadlineEvent | null {
  return upcomingEvents(events, now).find((e) => e.module === module) ?? null
}
