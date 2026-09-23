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

/**
 * What a deadline actually IS, which `module` only approximates: FAFSA and
 * scholarships both live in Financial Aid but a student rarely wants them
 * together. Set where each event is built, because that is the only place that
 * knows — consumers would otherwise be reduced to sniffing `id` prefixes.
 */
export type DeadlineCategory = 'application' | 'fafsa' | 'scholarship' | 'own'

/**
 * Who put this date on the calendar. A derived date is a fact about the world
 * — a college's Early Action deadline — that the student cannot move. A self
 * date is their own note to themselves. The design draws the second one dashed
 * precisely because missing it costs nothing outside their own plan.
 */
export type DeadlineSource = 'derived' | 'self'

/** The statuses a tick writes back to a college list entry. */
export type AppDoneStatus = Extract<AppStatus, 'submitted' | 'in-progress'>

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
  category: DeadlineCategory
  source: DeadlineSource
  /** Id of the record this was derived from — the college list entry's
   *  collegeId, or the tracker item's id. Ticking a deadline writes that
   *  record's status, so the tick means the same thing in the module that owns
   *  it; without this the writer would be reduced to parsing `id`. */
  sourceRef?: string
  /** Ticked off by the student. Applied by useDeadlineEvents from persisted
   *  state, not by derivation, which knows nothing about the student. */
  done?: boolean
  /** Applications only. */
  deadlineType?: AppDeadlineType
  date: Date
  /** Original human-readable string, e.g. "Nov 1, 2026". */
  dateDisplay: string
  color: string
  /** true when the date is not known to be exactly right. */
  estimated: boolean
  /**
   * Why it is estimated, because "estimated" covers two very different things
   * and a student should not be asked to treat them the same:
   *
   *   'cycle-year'     the month and day are real, from the curated set; only
   *                    the year was moved into this student's cycle
   *   'recurring-text' recovered from wording like "May 1 (annual)"
   *   'no-source'      we hold no deadline for this school at all and fell
   *                    back to a typical date for the round
   *
   * The last one is the dangerous one: nothing about it came from the school.
   */
  estimateReason?: 'cycle-year' | 'recurring-text' | 'no-source'
  /** The student replaced our date with one they read off the source. */
  corrected?: boolean
}

const DEADLINE_TYPE_LABEL: Record<AppDeadlineType, string> = {
  ED: 'Early Decision',
  EA: 'Early Action',
  REA: 'Restrictive Early Action',
  RD: 'Regular Decision',
  Rolling: 'Rolling',
}

/**
 * What each application round commits a student to, in a sentence.
 *
 * ED is the one that matters most: it is a binding agreement, and a sixteen
 * year old picking it off a dropdown labelled "ED" has made a promise to
 * attend and to withdraw every other application. The app offered these as
 * four initials with nothing to read.
 */
export const DEADLINE_TYPE_MEANING: Record<AppDeadlineType, string> = {
  ED: 'Binding. If they accept you, you must go, and you withdraw your other applications. Apply ED to one school only.',
  EA: 'Early, not binding. You hear back sooner and can still compare offers before deciding.',
  REA: 'Early and not binding, but you may not apply early anywhere else. You are still free to say no.',
  RD: 'The normal deadline. Not binding, and you compare every offer in the spring.',
  Rolling: 'No fixed date — they read applications as they arrive and places fill up. Earlier is better.',
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

/** Statuses where the submission deadline is still ahead of the student. */
const PRE_SUBMISSION: ReadonlySet<AppStatus> = new Set<AppStatus>(['not-started', 'in-progress'])

/**
 * Submitted, but not yet decided. The deadline still belongs on the calendar —
 * struck through, so the student can see they handled it and can untick a
 * mis-tap — where a decision (accepted, rejected, deferred, waitlisted) or a
 * withdrawal ends the matter and the date stops being shown at all.
 */
const APP_DONE: ReadonlySet<AppStatus> = new Set<AppStatus>(['submitted'])

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
  // July is the summer *before* the next school year, not the tail of the last
  // one. Counting it backwards put every grade a year behind for that month,
  // so a rising senior in July saw their whole cycle dated to the year that
  // had just finished.
  const month = now.getMonth()
  const schoolYearStart = month >= 6 ? now.getFullYear() : now.getFullYear() - 1
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
  const pending = apps.filter((a) => PRE_SUBMISSION.has(a.status) || APP_DONE.has(a.status))

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
      category: 'application',
      source: 'derived',
      sourceRef: a.collegeId,
      done: APP_DONE.has(a.status),
      deadlineType: a.deadlineType,
      date,
      dateDisplay: formatCollegeDate(date),
      color: DEADLINE_TYPE_COLOR[a.deadlineType],
      // Real only when a curated date supplied the month/day *and* it already
      // sits in this student's cycle year.
      estimated: curatedYear == null || curatedYear !== date.getFullYear(),
      // A curated month/day moved into the student's cycle is a small
      // inference. A date for a school we hold nothing for is a guess.
      estimateReason: curatedYear != null
        ? (curatedYear === date.getFullYear() ? undefined : 'cycle-year')
        : 'no-source',
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
      category: 'fafsa',
      source: 'derived',
      date: best.date,
      dateDisplay: formatCollegeDate(best.date),
      color: FAFSA_COLOR,
      estimated: best.estimated,
      estimateReason: best.estimated ? 'no-source' : undefined,
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


/** Red inside ten days, amber inside thirty, otherwise null (no emphasis). */
export const urgencyColor = (days: number | null): string | null =>
  days == null || days < 0 ? null : days <= 10 ? '#B93A3A' : days <= 30 ? '#C47A12' : null

/**
 * A distance in days, rounded the way a person would say it: exact under two
 * weeks, then weeks, then months. "433 days" means nothing at a glance;
 * "about 14 months" does.
 */
export function roughDuration(days: number, { approx = true }: { approx?: boolean } = {}): string {
  if (days < 14) return `${days} ${days === 1 ? 'day' : 'days'}`
  if (days < 60) return `${Math.round(days / 7)} weeks`
  const months = Math.round(days / 30.44)
  return `${approx ? 'about ' : ''}${months} months`
}

/** "today" / "tomorrow" / "in 5 days" / "in 3 weeks" / "in about 14 months". */
export const daysLabel = (days: number): string =>
  days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${roughDuration(days)}`

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

/** Applied for, but not yet awarded — the mirror of APP_DONE above. */
const SCHOLARSHIP_DONE: ReadonlySet<string> = new Set(['submitted'])

/**
 * Text that states there is no fixed date. Checked before looking for a month,
 * so "Rolling (opens Jan 1)" is correctly read as having no deadline rather
 * than as a January one.
 */
const NO_FIXED_DATE = /\b(rolling|varies|ongoing|continuous|year[\s-]?round)\b/i

/**
 * Every month mentioned in the text, with an optional qualifier, day and year.
 * Scanned globally: the deadline is often *not* the first date named, so each
 * one is classified below rather than taking the leftmost.
 *
 * Month names are matched whole. An earlier version matched a three-letter
 * prefix followed by any letters, which read "Jun" out of "junior" and pinned a
 * June deadline on a string whose only month was October.
 */
const MONTH_SCAN = new RegExp(
  String.raw`\b(?:(early|mid|late)[\s-]+)?` +
    String.raw`(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|` +
    String.raw`aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b\.?` +
    String.raw`(?:\s+(\d{1,2})(?:st|nd|rd|th)?(?!\d))?(?:,?\s+((?:19|20)\d{2}))?`,
  'gi',
)

/** Wording that marks a date as when applications OPEN, not when they close. */
const OPENS = /\b(open|opens|opening|opened|available|begins|begin|starts|start|launch|launches|accepted\s+from|from)\b[^.;]{0,24}$/i
/** Wording that marks a date as the actual deadline. */
const CLOSES = /\b(close|closes|closing|deadline|due|ends|end|final|postmark|submit)\b/i
/**
 * Wording that marks a date as something other than a deadline — when the
 * contest happens, when the qualifying test is sat, when awards are given.
 * These dated mentions are not something a student applies by.
 */
const EVENT = /\b(held|event|takes\s+place|ceremony|administered|competitions?|contests?|psat|nmsqt|amc)\b/i
/** Wording that joins two dates into a range. */
const RANGE_JOINER = /(?:^|\s)(?:-|–|—|to|through|thru|until|till)(?:\s|$)/i
/** A joiner spelled as a word states a span that ENDS at the second date, so
 *  it marks a real application window even when neither end names a day. A bare
 *  hyphen does not: "Spring (April-June)" is a season, not a cycle. */
const SPAN_JOINER = /(?:^|\s)(?:to|through|thru|until|till)(?:\s|$)/i

/** Day implied by a vague qualifier when the text names no day. */
const QUALIFIER_DAY: Record<string, number> = { early: 1, mid: 15, late: 25 }

const daysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate()

interface DateCandidate {
  month: number
  day: number
  /** false when the day was inferred rather than stated. */
  hasDay: boolean
  year: number | null
  opens: boolean
  closes: boolean
  event: boolean
  start: number
  end: number
}

/** Every dated mention in the text, in order, tagged with what it looks like. */
function scanDates(text: string): DateCandidate[] {
  const out: DateCandidate[] = []
  MONTH_SCAN.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = MONTH_SCAN.exec(text)) !== null) {
    const month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase())
    if (month < 0) continue
    const explicitDay = m[3] ? parseInt(m[3], 10) : null
    const day = explicitDay ?? QUALIFIER_DAY[(m[1] ?? '').toLowerCase()] ?? 1
    if (!Number.isFinite(day) || day < 1 || day > 31) continue
    // Look back only as far as the previous date, so wording attaches to the
    // date it actually describes.
    const lead = text.slice(out.length ? out[out.length - 1].end : 0, m.index)
    const trail = text.slice(m.index + m[0].length, m.index + m[0].length + 20)
    out.push({
      month,
      day,
      hasDay: explicitDay != null,
      year: m[4] ? parseInt(m[4], 10) : null,
      opens: OPENS.test(lead),
      closes: CLOSES.test(lead) || CLOSES.test(trail),
      event: EVENT.test(lead) || EVENT.test(trail),
      start: m.index,
      end: m.index + m[0].length,
    })
  }
  return out
}

/**
 * Collapse open-to-close ranges into the date the student must act by.
 *
 * Only a range whose *both* ends state a day is treated as an application
 * window: "Jan 15 - Apr 15" is a cycle and closes on the later date, whereas
 * "Spring (April-June)" or "deadlines May-June" is a vague span, where the
 * later end would push the estimate months past a real deadline. A window that
 * opens with an opening marker is an opening window throughout, so both ends
 * carry that marker forward.
 */
function collapseRanges(found: DateCandidate[], text: string): DateCandidate[] {
  const out: DateCandidate[] = []
  for (let i = 0; i < found.length; i++) {
    const a = found[i]
    const b = found[i + 1]
    const joined = b != null && RANGE_JOINER.test(text.slice(a.end, b.start))
    if (!joined) { out.push(a); continue }
    // Whatever the first end is, the second is the same kind of thing:
    // "Applications open March-April" is an opening window throughout, and
    // "competitions January-May" is a season throughout.
    const marks = { opens: a.opens || b.opens, event: a.event || b.event, closes: a.closes || b.closes }
    if (a.hasDay || b.hasDay || SPAN_JOINER.test(text.slice(a.end, b.start))) {
      // A dated window, or one spelled "November through April 30", is an
      // application cycle: the deadline is when it shuts. The opening marker
      // describes the start of the window, so it must not disqualify the end —
      // "Applications open January 2 - March 31" is due on 31 March.
      out.push({ ...b, ...marks, opens: false })
    } else {
      // A vague span names no cycle, so keep both ends and let the
      // earliest-wins rule below pick the safe one.
      out.push({ ...a, ...marks }, { ...b, ...marks })
    }
    i++
  }
  return out
}

/**
 * The deadline named in a free-text string, or null when it names none.
 *
 * Roughly 9 in 10 catalogue rows have no real `deadline` date, because the
 * source text is recurring ("May 1 annually"), month-only ("Mar 2027") or vague
 * ("Check official site"). The first two are still useful to a student, so the
 * month/day is recovered here and the caller marks the result estimated.
 *
 * Picking the *right* date matters more than picking one. A third of these
 * strings name more than one date, and taking the first gets the day
 * applications open rather than the day they are due. So:
 *
 *   1. Ranges of the form "Jan 15 - Apr 15" collapse to their closing date.
 *   2. Dates that describe an opening, or an event such as the contest itself
 *      or a qualifying test, are discarded — they are not something to apply by.
 *   3. A date the wording marks as a closing deadline wins.
 *   4. Otherwise the earliest remaining date wins, because when the text is
 *      ambiguous ("April 3 (freshman applicants: March 2)") being early is the
 *      safe direction to be wrong.
 *
 * A year stated in the text is returned as-is; the caller treats it as absolute
 * rather than re-basing it into the student's cycle.
 */
export function parseRecurringDeadline(
  text: string | null | undefined,
): { month: number; day: number; year: number | null } | null {
  if (!text) return null
  if (NO_FIXED_DATE.test(text)) return null

  const found = scanDates(text)
  if (found.length === 0) return null

  const collapsed = collapseRanges(found, text)
  // The lead-in decides what a date IS. A trailing "closes" belongs to the date
  // that follows it, so it must not rescue an opening date: in "Opens Nov 1,
  // closes ~Feb 14" the deadline is February, not November.
  const usable = collapsed.filter((c) => !c.opens && !c.event)
  if (usable.length === 0) return null

  const pick = (c: DateCandidate) => ({ month: c.month, day: c.day, year: c.year ?? loneYear(text) })

  const closing = usable.filter((c) => c.closes)
  const pool = closing.length > 0 ? closing : usable
  // Earliest wins: several of these strings list a deadline per applicant
  // category or per cycle, and the student reading it may be in any of them.
  // "Earliest" means earliest in the school year, not the lowest month number —
  // in "December 1 (College); January 15 (Exceptional Athlete)" December comes
  // first, and a College applicant shown January would already have missed it.
  return pick([...pool].sort((a, b) => (cycleRank(a.month) - cycleRank(b.month)) || (a.day - b.day))[0])
}

/** Position of a month within the Aug-Jul school year. */
const cycleRank = (month: number): number => (month >= 7 ? month - 7 : month + 5)

/** The year the text names, when it names exactly one ("Mar 2027" but not
 *  "2026-2027 academic year", where neither is the deadline's year). */
function loneYear(text: string): number | null {
  const years = new Set((text.match(/\b(?:19|20)\d{2}\b/g) ?? []).map(Number))
  return years.size === 1 ? [...years][0] : null
}

/** Parse an ISO `YYYY-MM-DD` as local midnight (avoids a UTC off-by-one). */
function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const d = new Date(`${iso}T00:00:00`)
  return isNaN(d.getTime()) ? null : d
}

/** A date that cannot roll into the next month (e.g. "Feb 30"). */
function clampedDate(year: number, month: number, day: number): Date {
  return new Date(year, month, Math.min(day, daysInMonth(year, month)))
}

const startOfDay = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

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
    const isDone = item.status != null && SCHOLARSHIP_DONE.has(item.status)
    if (item.status != null && !SCHOLARSHIP_PENDING.has(item.status) && !isDone) continue

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
      if (md.year != null) {
        // The source named a year, so this is a specific date, not a yearly
        // one. Re-basing it into the student's cycle would move a real
        // deadline — for a junior it moved "Mar 2027" to March 2028.
        date = clampedDate(md.year, md.month, md.day)
        estimated = true
      } else {
        // No year means it recurs, so place it in the student's cycle and, if
        // that has already gone by, roll on to the next occurrence. Without
        // this, "August 31 (annual)" resolved to a date in the past and the
        // student was shown a deadline they could no longer act on.
        let year = isFallMonth(md.month) ? seniorFall : seniorFall + 1
        date = clampedDate(year, md.month, md.day)
        while (date.getTime() < startOfDay(now)) {
          year += 1
          date = clampedDate(year, md.month, md.day)
        }
        estimated = true
      }
    }

    // A specific deadline that has already passed cannot be acted on, and
    // pinning it on the senior path would misrepresent it as upcoming.
    if (date.getTime() < startOfDay(now)) continue

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
      category: 'scholarship',
      source: 'derived',
      sourceRef: item.id,
      done: isDone,
      date,
      // The student's own words win for display; the parsed date only drives
      // placement. Falls back to the formatted date for real dates.
      dateDisplay: estimated && item.deadline ? item.deadline : formatCollegeDate(date),
      color: SCHOLARSHIP_COLOR,
      estimated,
      estimateReason: estimated ? 'recurring-text' : undefined,
    })
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime())
}

/** Merge already-derived event lists into one date-sorted list. */
export function mergeDeadlineEvents(...lists: DeadlineEvent[][]): DeadlineEvent[] {
  return lists.flat().sort((a, b) => a.date.getTime() - b.date.getTime())
}


/* ────────────────────── grouping and selection ───────────────────────── */

/**
 * A named subset of the student's deadlines.
 *
 * Declared as data rather than as branches in the export code, so a new
 * grouping is one row here and nothing else: the picker, the filename and the
 * calendar name all read off this list. `match` is a predicate over a single
 * event, which keeps every group independent of every other.
 */
export interface DeadlineGroup {
  /** Stable — it is also the filename slug and the persisted selection. */
  id: string
  label: string
  /** Heading to file this group under in a picker. Top-level when absent. */
  section?: string
  /** Disambiguates a label that isn't self-explanatory. */
  hint?: string
  match: (e: DeadlineEvent) => boolean
}

/** Rounds that close before regular decision. Rolling is deliberately absent:
 *  it has no fixed date and never produces an event. */
const EARLY_TYPES: ReadonlySet<string> = new Set<string>(['ED', 'EA', 'REA'])

export const DEADLINE_GROUPS: readonly DeadlineGroup[] = [
  { id: 'all', label: 'All deadlines', match: () => true },

  {
    id: 'applications',
    section: 'College applications',
    label: 'Every college deadline',
    match: (e) => e.category === 'application',
  },
  {
    id: 'early',
    section: 'College applications',
    label: 'Early rounds only',
    hint: 'ED, EA, REA',
    match: (e) => e.category === 'application' && EARLY_TYPES.has(e.deadlineType ?? ''),
  },
  {
    id: 'regular',
    section: 'College applications',
    label: 'Regular decision only',
    match: (e) => e.category === 'application' && e.deadlineType === 'RD',
  },

  {
    id: 'financial-aid',
    section: 'Financial aid',
    label: 'Every financial aid deadline',
    match: (e) => e.module === 'Financial Aid',
  },
  { id: 'fafsa', section: 'Financial aid', label: 'FAFSA only', match: (e) => e.category === 'fafsa' },
  {
    id: 'scholarships',
    section: 'Financial aid',
    label: 'Scholarships only',
    match: (e) => e.category === 'scholarship',
  },
]

/** Falls back to "all" — a stale saved selection shouldn't export nothing. */
export function deadlineGroupById(id: string | null | undefined): DeadlineGroup {
  return DEADLINE_GROUPS.find((g) => g.id === id) ?? DEADLINE_GROUPS[0]
}

export interface DeadlineSelection {
  groupId?: string
  /** Drop dates we inferred rather than read from a source. */
  confirmedOnly?: boolean
  /** Drop deadlines that have already passed. */
  upcomingOnly?: boolean
  /** Keep deadlines the student has already ticked off. Off by default: an
   *  application already sent is not something to put in a calendar. */
  includeDone?: boolean
  now?: Date
}

/**
 * The events a selection covers, in the order they were given.
 *
 * The two flags are orthogonal to the group — folding them into the list would
 * multiply seven groups into twenty-eight — so they compose rather than nest.
 * Both default off: selecting nothing extra is the least surprising default for
 * a caller that only names a group.
 */
export function selectDeadlines(
  events: DeadlineEvent[],
  {
    groupId, confirmedOnly = false, upcomingOnly = false, includeDone = false, now = new Date(),
  }: DeadlineSelection = {},
): DeadlineEvent[] {
  const group = deadlineGroupById(groupId)
  const pool = upcomingOnly ? upcomingEvents(events, now) : events
  return pool.filter(
    (e) => group.match(e) && !(confirmedOnly && e.estimated) && (includeDone || !e.done),
  )
}


/* ────────────────── labelling and bucketing for the UI ───────────────── */

/**
 * Who set the date, in one word, for the tag beside a deadline. The student
 * reading "Scholarship" next to a date understands they cannot move it;
 * "Mine" says they can.
 */
export function kindLabel(e: DeadlineEvent): string {
  if (e.source === 'self') return 'Mine'
  switch (e.category) {
    case 'application': return 'College'
    case 'scholarship': return 'Scholarship'
    case 'fafsa': return 'Federal'
    case 'own': return 'Mine'
  }
}

/** Whole days from `now` to the event, negative once it has passed. */
export function daysUntil(e: DeadlineEvent, now: Date): number {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfDay = new Date(e.date.getFullYear(), e.date.getMonth(), e.date.getDate()).getTime()
  return Math.round((startOfDay - startOfToday) / 86_400_000)
}

/**
 * The heading a deadline sits under in the panel. Near dates are named in the
 * words a student would use — a row under "Tomorrow" needs no date read off it
 * — and anything further out falls back to the weekday and date.
 */
export function bucketLabel(offset: number, date: Date): string {
  if (offset < 0) return 'Overdue'
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tomorrow'
  return `${date.toLocaleDateString(undefined, { weekday: 'long' })}, ${
    date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

export interface DeadlineBucket {
  label: string
  /** 'now' for overdue and today, 'soon' inside the urgency window, else ''.
   *  Drives only colour, so a bucket is still readable without it. */
  tone: 'now' | 'soon' | ''
  events: DeadlineEvent[]
}

/**
 * Group events into the panel's headed sections, in date order.
 *
 * `urgentWindow` is how many days ahead still counts as urgent; the artifact
 * makes this a setting, and the default of 3 matches it. Events must already
 * be date-sorted — every producer here sorts, and re-sorting would hide a
 * caller that forgot to merge properly.
 */
export function bucketDeadlines(
  events: DeadlineEvent[],
  now: Date,
  urgentWindow = 3,
): DeadlineBucket[] {
  const buckets: DeadlineBucket[] = []
  for (const e of events) {
    const offset = daysUntil(e, now)
    const label = bucketLabel(offset, e.date)
    const last = buckets.at(-1)
    if (last && last.label === label) { last.events.push(e); continue }
    buckets.push({
      label,
      tone: offset <= 0 ? 'now' : offset <= urgentWindow ? 'soon' : '',
      events: [e],
    })
  }
  return buckets
}

/** Start of the week (Sunday) containing `now`, shifted by `weekOffset`. */
export function weekStart(now: Date, weekOffset = 0): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  d.setDate(d.getDate() - d.getDay() + weekOffset * 7)
  return d
}

/** True when two Dates fall on the same local calendar day. */
export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Events falling on `day`, preserving sort order. */
export function eventsOn(events: DeadlineEvent[], day: Date): DeadlineEvent[] {
  return events.filter((e) => sameDay(e.date, day))
}

/**
 * Everything the student has chosen to see.
 *
 * Separate from `selectDeadlines`, which picks a subset for one export. This is
 * the standing filter behind every dated view, so the panel, the week strip and
 * the calendar cannot show different sets of the same deadlines.
 *
 * An empty `modules` means all of them: a student who turns off every module
 * has almost certainly mis-tapped, and blanking every view is the worse answer.
 */
export function visibleDeadlines(
  events: DeadlineEvent[],
  { showEstimated = true, modules = [] as readonly string[] } = {},
): DeadlineEvent[] {
  return events.filter(
    (e) =>
      (showEstimated || !e.estimated) &&
      (modules.length === 0 || modules.includes(e.module)),
  )
}
