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
import { yearGroupOf } from './timelineData'
import type { ApplicationEntry, AppDeadlineType, AppStatus } from './applicationsChecklist'

/** Where the college list is persisted (profiles.settings.module_data[MODULE][KEY]). */
export const APPLICATIONS_MODULE = 'applications'
export const APPLICATIONS_DATA_KEY = 'apps'

export type DeadlineModule = 'Application Tracking' | 'Financial Aid'

export interface DeadlineEvent {
  id: string
  /** null for aggregate events (e.g. FAFSA) that aren't tied to one college. */
  collegeId: string | null
  /** School name on its own, so consumers don't have to split `title`.
   *  null for aggregate events. */
  collegeName: string | null
  /** Human label for the deadline, e.g. "Early Action". */
  typeLabel: string
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

const DEADLINE_TYPE_LABEL: Record<AppDeadlineType, string> = {
  ED: 'Early Decision',
  EA: 'Early Action',
  REA: 'Restrictive Early Action',
  RD: 'Regular Decision',
  Rolling: 'Rolling',
}

const DEADLINE_TYPE_COLOR: Record<AppDeadlineType, string> = {
  ED: '#B93A3A',
  REA: '#B93A3A',
  EA: '#C47A12',
  RD: '#1D7FC4',
  Rolling: '#2D9E72',
}

const FAFSA_COLOR = '#C47A12'
/** Financial Aid's module colour — distinguishes scholarship pins from the
 *  orange FAFSA marker they sit alongside. */
const SCHOLARSHIP_COLOR = '#2D9E72'

/**
 * Month/day of the smart-default deadlines, keyed by application type. The
 * *year* is not fixed here — it comes from the student's application cycle
 * (see `seniorFallYear`), so a junior sees next year's cycle rather than a
 * date that has already passed. Used for DB-sourced colleges, which don't
 * carry per-school deadline dates.
 */
const DEFAULT_APP_MONTH_DAY: Record<AppDeadlineType, { month: number; day: number } | null> = {
  ED: { month: 10, day: 1 }, // Nov 1
  REA: { month: 10, day: 1 },
  EA: { month: 10, day: 1 },
  RD: { month: 0, day: 1 }, // Jan 1
  Rolling: null,
}
const DEFAULT_FAFSA_MONTH_DAY = { month: 1, day: 1 } // Feb 1

/** Statuses where the submission deadline is still ahead of the student. Once
 *  an application is submitted (or decided, or withdrawn) its deadline is no
 *  longer something to count down to. */
const PRE_SUBMISSION: ReadonlySet<AppStatus> = new Set<AppStatus>(['not-started', 'in-progress'])

/**
 * US school years run Aug–Jul. A deadline in Aug–Dec belongs to the *fall* of
 * the cycle; Jan–Jul belongs to the spring half, i.e. the following calendar
 * year. Used to attach the right year to a month/day.
 */
const isFallMonth = (month: number): boolean => month >= 7

/**
 * Calendar year of the fall of the student's senior year — the year their
 * application cycle opens. A 12th grader applies during the current school
 * year; every grade below pushes the cycle out by one year.
 *
 * `gradeStartIdx` is `profiles.grade_start_idx` (a timeline milestone index).
 * When it's unknown we assume senior, which is the most common case for anyone
 * actively tracking applications and matches the pre-cycle behaviour.
 */
export function seniorFallYear(gradeStartIdx: number | null | undefined, now: Date): number {
  const grade = gradeStartIdx == null ? 12 : parseInt(yearGroupOf(gradeStartIdx).grade, 10)
  const schoolYearStart = isFallMonth(now.getMonth()) ? now.getFullYear() : now.getFullYear() - 1
  return schoolYearStart + (12 - (Number.isFinite(grade) ? grade : 12))
}

/** Place a month/day into the student's cycle. */
function dateInCycle(month: number, day: number, seniorFall: number): Date {
  return new Date(isFallMonth(month) ? seniorFall : seniorFall + 1, month, day)
}

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

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Inverse of parseCollegeDate — "Nov 1, 2026". */
export function formatCollegeDate(d: Date): string {
  return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
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

export interface DeriveOptions {
  /** `profiles.grade_start_idx`. Drives which application cycle the dates land
   *  in; defaults to senior year when unknown. */
  gradeStartIdx?: number | null
  /** Injectable clock, for tests and for deterministic rendering. */
  now?: Date
}

/**
 * Turn the college list into dated events: one per *unsubmitted* application
 * whose chosen deadline type has a concrete date, plus a single FAFSA-priority
 * event (the earliest priority date across the list, since FAFSA is filed
 * once). Sorted ascending by date.
 *
 * Every date is placed in the student's own application cycle. Curated dates
 * from the static college set contribute their real month/day; the year comes
 * from the cycle, so a junior sees next year's Nov 1 rather than one that has
 * already passed. A date whose year had to be shifted is reported as an
 * estimate, since only the month/day is known to be real.
 */
export function deriveDeadlineEvents(
  apps: ApplicationEntry[],
  { gradeStartIdx, now = new Date() }: DeriveOptions = {},
): DeadlineEvent[] {
  const events: DeadlineEvent[] = []
  const seniorFall = seniorFallYear(gradeStartIdx, now)

  // Applications already submitted / decided / withdrawn have no deadline left
  // to count down to.
  const pending = apps.filter((a) => PRE_SUBMISSION.has(a.status))

  for (const a of pending) {
    // Legacy static colleges carry real per-school month/day; DB-sourced
    // colleges (added from Discover/search) fall back to the smart default.
    const college = getCollegeById(a.collegeId)
    const curated = college ? resolveAppDeadline(college.applicationDeadlines, a.deadlineType) : null

    // Three distinct cases, and collapsing them invents deadlines:
    //   "Nov 1, 2026" — a curated date; use its month/day.
    //   "Rolling"     — curated and deliberately not a fixed date; emit nothing.
    //   null          — the school has no entry for this round (or is DB-sourced,
    //                   which carries no dates at all); fall back to the default.
    let monthDay: { month: number; day: number } | null
    let curatedYear: number | null = null
    if (curated != null) {
      const parsed = parseCollegeDate(curated)
      if (!parsed) continue
      monthDay = { month: parsed.getMonth(), day: parsed.getDate() }
      curatedYear = parsed.getFullYear()
    } else {
      monthDay = DEFAULT_APP_MONTH_DAY[a.deadlineType]
    }
    if (!monthDay) continue

    const date = dateInCycle(monthDay.month, monthDay.day, seniorFall)
    const name = college?.name ?? a.name ?? 'College'
    const typeLabel = DEADLINE_TYPE_LABEL[a.deadlineType]
    events.push({
      id: `app-${a.collegeId}-${a.deadlineType}`,
      collegeId: a.collegeId,
      collegeName: name,
      typeLabel,
      title: `${name} — ${typeLabel}`,
      shortTitle: `${name} ${a.deadlineType}`,
      emoji: college?.emoji ?? '🎓',
      module: 'Application Tracking',
      deadlineType: a.deadlineType,
      date,
      dateDisplay: formatCollegeDate(date),
      color: DEADLINE_TYPE_COLOR[a.deadlineType],
      // Real only when a curated date supplied the month/day *and* it already
      // sits in this student's cycle year.
      estimated: curatedYear == null || curatedYear !== date.getFullYear(),
    })
  }

  // FAFSA priority — one event (earliest real date across the list, else
  // default). Filed once, independent of how far along each application is, so
  // this is driven by the whole list rather than just the pending ones.
  const active = apps.filter((a) => a.status !== 'withdrawn')
  if (active.length > 0) {
    let best = {
      date: dateInCycle(DEFAULT_FAFSA_MONTH_DAY.month, DEFAULT_FAFSA_MONTH_DAY.day, seniorFall),
      estimated: true,
    }
    for (const a of active) {
      const college = getCollegeById(a.collegeId)
      const d = college ? parseCollegeDate(college.financialAidDeadlines.fafsaPriority) : null
      if (!d) continue
      const inCycle = dateInCycle(d.getMonth(), d.getDate(), seniorFall)
      // `<=` rather than `<`: a curated date that merely *matches* the default
      // still confirms it, so it should replace the estimate and drop the
      // "· est." marker instead of losing the tie to a guess.
      const ties = best.estimated && inCycle.getTime() === best.date.getTime()
      if (inCycle < best.date || ties) {
        best = { date: inCycle, estimated: d.getFullYear() !== inCycle.getFullYear() }
      }
    }
    events.push({
      id: 'fafsa-priority',
      collegeId: null,
      collegeName: null,
      typeLabel: 'FAFSA priority',
      title: 'FAFSA priority deadline',
      shortTitle: 'FAFSA priority',
      emoji: '💰',
      module: 'Financial Aid',
      date: best.date,
      dateDisplay: formatCollegeDate(best.date),
      color: FAFSA_COLOR,
      estimated: best.estimated,
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


/* ─────────────────────────── scholarships ───────────────────────────── */

/**
 * A tracked scholarship, reduced to what a dated view needs. Structural rather
 * than importing TrackerItem so this module keeps no data-layer dependency.
 */
export interface ScholarshipDeadlineInput {
  id: string
  name: string
  /** Real date (ISO `YYYY-MM-DD`) when the catalogue knew one. */
  deadlineDate?: string | null
  /** What the student reads, e.g. "May 1 (annual)". */
  deadline?: string | null
  /** Tracker status. Submitted / awarded entries have no deadline left. */
  status?: string
}

/** Tracker statuses where the deadline is still ahead of the student. */
const SCHOLARSHIP_PENDING: ReadonlySet<string> = new Set(['researching', 'planning', 'ready'])

/**
 * Text that states there is no fixed date. Checked before looking for a month,
 * so "Rolling (opens Jan 1)" is correctly read as having no deadline rather
 * than as a January one.
 */
const NO_FIXED_DATE = /\b(rolling|varies|ongoing|continuous|year[\s-]?round)\b/i

/**
 * First month (with optional day) in a free-text deadline, e.g.
 * "May 1 (annual)", "Late May", "Application cycle Jan 15 - Apr 15".
 * Leftmost match wins, which is what we want for "June 1 (application opens
 * January 1)" — the deadline is June, the January date is incidental.
 */
const MONTH_IN_TEXT =
  /\b(?:(early|mid|late)\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:\s+(\d{1,2})(?!\d))?/i

/** Day implied by a vague qualifier when the text names no day. */
const QUALIFIER_DAY: Record<string, number> = { early: 1, mid: 15, late: 25 }

const daysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate()

/**
 * Month/day from a recurring or partial deadline string, or null when the text
 * names no date at all.
 *
 * Roughly 9 in 10 catalogue rows have no parseable `deadline` date, because the
 * source text is recurring ("May 1 annually"), month-only ("Mar 2027") or vague
 * ("Check official site"). The first two are still genuinely useful to a
 * student, so we recover a month/day and let the caller mark it estimated.
 * When only a month is known we take the *start* of it: being early is the safe
 * direction to be wrong about a deadline.
 */
export function parseRecurringDeadline(text: string | null | undefined): { month: number; day: number } | null {
  if (!text) return null
  if (NO_FIXED_DATE.test(text)) return null
  const m = text.match(MONTH_IN_TEXT)
  if (!m) return null
  const month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase())
  if (month < 0) return null
  const explicitDay = m[3] ? parseInt(m[3], 10) : null
  const day = explicitDay ?? QUALIFIER_DAY[(m[1] ?? '').toLowerCase()] ?? 1
  if (!Number.isFinite(day) || day < 1) return null
  return { month, day }
}

/** Parse an ISO `YYYY-MM-DD` as local midnight (avoids a UTC off-by-one). */
function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const d = new Date(`${iso}T00:00:00`)
  return isNaN(d.getTime()) ? null : d
}

const shortenName = (name: string): string => (name.length <= 26 ? name : `${name.slice(0, 25)}…`)

/**
 * Turn tracked scholarships into dated events, so they appear on the calendar
 * and the timeline beside college deadlines.
 *
 * Two date sources, deliberately handled differently:
 *   - a real `deadlineDate` is absolute and used as-is. It came from the source
 *     with its own year; re-basing it into the student's cycle would move a
 *     genuine deadline to the wrong day.
 *   - recurring text ("May 1 annually") carries no year, so it is placed in the
 *     student's own cycle exactly as college deadlines are, and marked
 *     estimated.
 * Anything with neither is skipped rather than given an invented date.
 */
export function deriveScholarshipEvents(
  items: ScholarshipDeadlineInput[],
  { gradeStartIdx, now = new Date() }: DeriveOptions = {},
): DeadlineEvent[] {
  const seniorFall = seniorFallYear(gradeStartIdx, now)
  const events: DeadlineEvent[] = []

  for (const item of items) {
    if (item.status != null && !SCHOLARSHIP_PENDING.has(item.status)) continue

    // A student who typed "May 1, 2027" into a custom entry gave a real date
    // even though no catalogue row backs it, so honour that too.
    const exact = parseIsoDate(item.deadlineDate) ?? parseCollegeDate(item.deadline)
    let date: Date
    let estimated: boolean
    if (exact) {
      date = exact
      estimated = false
    } else {
      const md = parseRecurringDeadline(item.deadline)
      if (!md) continue
      const year = isFallMonth(md.month) ? seniorFall : seniorFall + 1
      date = dateInCycle(md.month, Math.min(md.day, daysInMonth(year, md.month)), seniorFall)
      estimated = true
    }

    const name = item.name?.trim() || 'Scholarship'
    events.push({
      id: `scholarship-${item.id}`,
      collegeId: null,
      collegeName: null,
      typeLabel: 'Scholarship deadline',
      title: name,
      shortTitle: shortenName(name),
      emoji: '🏆',
      module: 'Financial Aid',
      date,
      // The student's own words win for display; the parsed date only drives
      // placement. Falls back to the formatted date for real dates.
      dateDisplay: estimated && item.deadline ? item.deadline : formatCollegeDate(date),
      color: SCHOLARSHIP_COLOR,
      estimated,
    })
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime())
}

/** Merge already-derived event lists into one date-sorted list. */
export function mergeDeadlineEvents(...lists: DeadlineEvent[][]): DeadlineEvent[] {
  return lists.flat().sort((a, b) => a.date.getTime() - b.date.getTime())
}
