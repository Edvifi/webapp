import { describe, it, expect, beforeAll } from 'vitest'
import {
  parseCollegeDate,
  deriveDeadlineEvents,
  deriveScholarshipEvents,
  parseRecurringDeadline,
  mergeDeadlineEvents,
  upcomingEvents,
  nextDueForModule,
  type ScholarshipDeadlineInput,
} from './applicationDeadlines'
import type { ApplicationEntry, AppDeadlineType, AppStatus } from './applicationsChecklist'

const app = (
  collegeId: string,
  deadlineType: AppDeadlineType,
  name?: string,
  status: AppStatus = 'not-started',
): ApplicationEntry => ({
  collegeId,
  category: 'unranked',
  deadlineType,
  status,
  name,
})

/** Pinned clock: Aug 2026, i.e. the start of the 2026–27 school year. A senior
 *  on this date applies in the 2026–27 cycle. Pinned so the suite doesn't drift
 *  as real time passes. */
const NOW = new Date(2026, 7, 4)
/** grade_start_idx values from YEAR_GROUPS (senior = 10, junior = 6). */
const SENIOR = 10
const JUNIOR = 6

const derive = (apps: ApplicationEntry[], gradeStartIdx: number = SENIOR) =>
  deriveDeadlineEvents(apps, { gradeStartIdx, now: NOW })

describe('parseCollegeDate', () => {
  it('parses "Nov 1, 2026"', () => {
    const d = parseCollegeDate('Nov 1, 2026')!
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(10) // Nov
    expect(d.getDate()).toBe(1)
  })
  it('returns null for empty / unparseable', () => {
    expect(parseCollegeDate(null)).toBeNull()
    expect(parseCollegeDate('Rolling')).toBeNull()
    expect(parseCollegeDate('sometime 2026')).toBeNull()
  })
})

describe('deriveDeadlineEvents', () => {
  it('resolves an EA entry to the college early-action date', () => {
    const events = derive([app('harvard', 'EA')])
    const ea = events.find((e) => e.deadlineType === 'EA')!
    expect(ea.module).toBe('Application Tracking')
    expect(ea.date.getMonth()).toBe(10) // Harvard EA = Nov 1
  })

  it('skips Rolling (no fixed date)', () => {
    const events = derive([app('harvard', 'Rolling')])
    expect(events.some((e) => e.module === 'Application Tracking')).toBe(false)
  })

  it('does not invent a date for a rolling-admission school picked as RD', () => {
    // 'smc' is curated with regularDecision: 'Rolling'. A curated-but-undated
    // round must emit nothing, NOT fall through to the Jan 1 default — that
    // would show a hard deadline for a school that has none.
    const events = derive([app('smc', 'RD')])
    expect(events.some((e) => e.module === 'Application Tracking')).toBe(false)
  })

  it('still falls back to the default when a school omits the chosen round', () => {
    // Harvard has no earlyDecision, so ED resolves to null — a genuine "no
    // entry", which should use the smart default rather than be dropped.
    const ed = derive([app('harvard', 'ED')]).find((e) => e.deadlineType === 'ED')!
    expect(ed).toBeDefined()
    expect(ed.estimated).toBe(true)
    expect(ed.date.getMonth()).toBe(10) // Nov 1 default
  })

  it('emits a single earliest FAFSA event across the list', () => {
    const events = derive([app('harvard', 'RD'), app('ucla', 'RD')])
    const fafsa = events.filter((e) => e.module === 'Financial Aid')
    expect(fafsa).toHaveLength(1)
  })

  it('returns events sorted ascending by date', () => {
    const events = derive([app('ucla', 'RD'), app('harvard', 'EA')])
    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].date.getTime()).toBeLessThanOrEqual(events[i].date.getTime())
    }
  })

  it('gives DB-sourced colleges a smart-default (estimated) date', () => {
    const events = derive([app('sc-123', 'RD', 'Some University')])
    const appEvent = events.find((e) => e.module === 'Application Tracking')!
    expect(appEvent.estimated).toBe(true)
    expect(appEvent.title).toContain('Some University')
    expect(appEvent.date.getMonth()).toBe(0) // RD default = Jan 1, 2027
  })
})

describe('application cycle by grade', () => {
  it('dates a senior into the current cycle (fall 2026 / spring 2027)', () => {
    const events = derive([app('sc-1', 'EA', 'U'), app('sc-2', 'RD', 'V')], SENIOR)
    const ea = events.find((e) => e.deadlineType === 'EA')!
    const rd = events.find((e) => e.deadlineType === 'RD')!
    expect([ea.date.getFullYear(), ea.date.getMonth()]).toEqual([2026, 10]) // Nov 1, 2026
    expect([rd.date.getFullYear(), rd.date.getMonth()]).toEqual([2027, 0]) // Jan 1, 2027
  })

  it('pushes a junior out to the following cycle', () => {
    const events = derive([app('sc-1', 'EA', 'U'), app('sc-2', 'RD', 'V')], JUNIOR)
    const ea = events.find((e) => e.deadlineType === 'EA')!
    const rd = events.find((e) => e.deadlineType === 'RD')!
    expect([ea.date.getFullYear(), ea.date.getMonth()]).toEqual([2027, 10]) // Nov 1, 2027
    expect([rd.date.getFullYear(), rd.date.getMonth()]).toEqual([2028, 0]) // Jan 1, 2028
  })

  it('keeps a curated date in the student\'s own cycle, and marks it estimated when shifted', () => {
    const senior = derive([app('harvard', 'EA')], SENIOR).find((e) => e.deadlineType === 'EA')!
    const junior = derive([app('harvard', 'EA')], JUNIOR).find((e) => e.deadlineType === 'EA')!
    // Same real month/day either way...
    expect(junior.date.getMonth()).toBe(senior.date.getMonth())
    expect(junior.date.getDate()).toBe(senior.date.getDate())
    // ...but a year out, and therefore no longer a confirmed date.
    expect(junior.date.getFullYear()).toBe(senior.date.getFullYear() + 1)
    expect(senior.estimated).toBe(false)
    expect(junior.estimated).toBe(true)
  })

  it('rolls the cycle forward once the next school year starts', () => {
    const nextYear = deriveDeadlineEvents([app('sc-1', 'EA', 'U')], {
      gradeStartIdx: SENIOR,
      now: new Date(2027, 7, 4), // Aug 2027
    })
    expect(nextYear.find((e) => e.deadlineType === 'EA')!.date.getFullYear()).toBe(2027)
  })

  it('falls back to senior year when the grade is unknown', () => {
    const events = deriveDeadlineEvents([app('sc-1', 'EA', 'U')], { now: NOW })
    expect(events.find((e) => e.deadlineType === 'EA')!.date.getFullYear()).toBe(2026)
  })
})

describe('status filtering', () => {
  it('drops applications that are already submitted or decided', () => {
    for (const status of ['submitted', 'accepted', 'rejected', 'waitlisted', 'deferred', 'withdrawn'] as AppStatus[]) {
      const events = derive([app('harvard', 'EA', undefined, status)])
      expect(events.some((e) => e.module === 'Application Tracking')).toBe(false)
    }
  })

  it('keeps applications that are still pre-submission', () => {
    for (const status of ['not-started', 'in-progress'] as AppStatus[]) {
      const events = derive([app('harvard', 'EA', undefined, status)])
      expect(events.some((e) => e.module === 'Application Tracking')).toBe(true)
    }
  })

  it('still emits FAFSA once applications are submitted (it is filed separately)', () => {
    const events = derive([app('harvard', 'EA', undefined, 'submitted')])
    expect(events.filter((e) => e.module === 'Financial Aid')).toHaveLength(1)
  })

  it('emits nothing at all when every application is withdrawn', () => {
    expect(derive([app('harvard', 'EA', undefined, 'withdrawn')])).toHaveLength(0)
  })
})

describe('upcomingEvents / nextDueForModule', () => {
  // Computed in beforeAll so the college cache is seeded first.
  let events: ReturnType<typeof deriveDeadlineEvents>
  beforeAll(() => { events = derive([app('harvard', 'EA'), app('ucla', 'RD')]) })

  it('filters out past events', () => {
    const after = new Date(2030, 0, 1)
    expect(upcomingEvents(events, after)).toHaveLength(0)
  })

  it('finds the soonest upcoming event for a module', () => {
    const before = new Date(2026, 0, 1)
    const next = nextDueForModule(events, 'Application Tracking', before)!
    expect(next.module).toBe('Application Tracking')
    // Harvard EA (Nov 1) is before UCLA RD (Nov 30)
    expect(next.collegeId).toBe('harvard')
  })
})

/* ─────────────────────────── scholarships ───────────────────────────── */

const sch = (
  over: Partial<ScholarshipDeadlineInput> = {},
): ScholarshipDeadlineInput => ({
  id: 's1',
  name: 'Test Scholarship',
  deadlineDate: null,
  deadline: null,
  status: 'researching',
  ...over,
})

describe('parseRecurringDeadline', () => {
  const at = (month: number, day: number, year: number | null = null) => ({ month, day, year })

  it('reads a month and day out of recurring text', () => {
    expect(parseRecurringDeadline('May 1 (annual)')).toEqual(at(4, 1))
    expect(parseRecurringDeadline('March 15 (annual)')).toEqual(at(2, 15))
  })

  it('takes the closing date, not the date applications open', () => {
    // The single most damaging misread: 42 catalogue rows name both, and
    // taking the first tells a student they have months longer than they do.
    expect(parseRecurringDeadline('Opens Nov 1, closes ~Feb 14 (annual)')).toEqual(at(1, 14))
    expect(parseRecurringDeadline('Applications accepted November through April 30')).toEqual(at(3, 30))
    expect(parseRecurringDeadline('Opens in October; January deadline')).toEqual(at(0, 1))
    expect(parseRecurringDeadline('October 1 (applications open August 1)')).toEqual(at(9, 1))
  })

  it('takes the later end of an open-to-close range', () => {
    expect(parseRecurringDeadline('Application cycle Jan 15 - Apr 15')).toEqual(at(3, 15))
    expect(parseRecurringDeadline('Applications typically open January 2 - March 31')).toEqual(at(2, 31))
  })

  it('prefers the earlier date when the text is genuinely ambiguous', () => {
    // Two deadlines for different applicant classes. Every user of this
    // product is in the earlier group, and early is the safe way to be wrong.
    expect(parseRecurringDeadline('April 3 (freshman applicants: March 2)')).toEqual(at(2, 2))
  })

  it('keeps a year the text states, rather than leaving it to the cycle', () => {
    expect(parseRecurringDeadline('Mar 2027')).toEqual(at(2, 1, 2027))
    expect(parseRecurringDeadline('Opens Jan 4, 2027; closes June 4, 2027')).toEqual(at(5, 4, 2027))
  })

  it('ignores a year span, which names no single deadline year', () => {
    expect(parseRecurringDeadline('Applications for the 2026-2027 year close in March'))
      .toEqual(at(2, 1))
  })

  it('turns a vague qualifier into a day, erring early', () => {
    expect(parseRecurringDeadline('Early November')).toEqual(at(10, 1))
    expect(parseRecurringDeadline('Mid March')).toEqual(at(2, 15))
    expect(parseRecurringDeadline('Late May (annual)')).toEqual(at(4, 25))
  })

  it('reads the hyphenated qualifier form the catalogue actually uses', () => {
    expect(parseRecurringDeadline('Opens December, closes mid-February')).toEqual(at(1, 15))
  })

  it('falls back to the start of a month-only deadline', () => {
    // Being early is the safe direction to be wrong about a deadline.
    expect(parseRecurringDeadline('Spring (annual)')).toBeNull()
    expect(parseRecurringDeadline('March (annual)')).toEqual(at(2, 1))
  })

  it('does not read a month out of an ordinary word', () => {
    // "junior" begins with "jun". This pinned a June deadline on a string
    // whose only month was October.
    expect(parseRecurringDeadline('PSAT/NMSQT in Oct of junior year')).toBeNull()
  })

  it('ignores dates that describe an event rather than a deadline', () => {
    // When the contest is held, or the qualifying test sat, is not something a
    // student applies by.
    expect(parseRecurringDeadline('Held annually in late November (Stuttgart, AR)')).toBeNull()
    expect(parseRecurringDeadline('New challenges launch in September; deadlines vary')).toBeNull()
    expect(parseRecurringDeadline('Regional registration opens in fall; competitions January-May')).toBeNull()
  })

  it('keeps the closing end of a dated window, even when it opens with one', () => {
    expect(parseRecurringDeadline('Applications typically open January 2 - March 31')).toEqual(at(2, 31))
    expect(parseRecurringDeadline('Applications accepted November through April 30')).toEqual(at(3, 30))
  })

  it('treats a bare month span as vague rather than as a window', () => {
    // "Spring (April-June)" names a season, not a cycle, so the later end would
    // put the estimate two months past a real April deadline.
    expect(parseRecurringDeadline('Spring (April-June) - check official site')).toEqual(at(3, 1))
    expect(parseRecurringDeadline('Fall (Oct-Nov), annual')).toEqual(at(9, 1))
    // And when the span only says when applications open, it names no deadline.
    expect(parseRecurringDeadline('Applications open March-April each year')).toBeNull()
  })

  it('orders competing deadlines by the school year, not the month number', () => {
    // Two category deadlines. December comes first for a student, and showing
    // a College applicant January would mean they had already missed theirs.
    expect(parseRecurringDeadline('December 1 (College); January 15 (Exceptional Athlete)'))
      .toEqual(at(11, 1))
  })

  it('returns null when there is genuinely no fixed date', () => {
    for (const text of [
      'Varies - check official site',
      'Check official site',
      'Rolling',
      'Ongoing',
      null,
      undefined,
      '',
    ]) {
      expect(parseRecurringDeadline(text)).toBeNull()
    }
  })

  it('does not read a month out of a rolling deadline that mentions one', () => {
    expect(parseRecurringDeadline('Rolling (opens Jan 1)')).toBeNull()
  })

  it('returns null when every date named is an opening date', () => {
    expect(parseRecurringDeadline('Applications open August 1')).toBeNull()
  })
})

describe('deriveScholarshipEvents', () => {
  it('uses a real date exactly, without re-basing it into the cycle', () => {
    // A real date owns its year. Re-basing it, the way a recurring deadline is
    // re-based, would move a genuine deadline to the wrong day.
    const [e] = deriveScholarshipEvents([sch({ deadlineDate: '2027-03-15' })], {
      gradeStartIdx: JUNIOR,
      now: NOW,
    })
    expect(e.date).toEqual(new Date(2027, 2, 15))
    expect(e.estimated).toBe(false)
    expect(e.module).toBe('Financial Aid')
  })

  it('places a recurring deadline in the student\'s own cycle and marks it estimated', () => {
    const [senior] = deriveScholarshipEvents([sch({ deadline: 'May 1 (annual)' })], {
      gradeStartIdx: SENIOR,
      now: NOW,
    })
    const [junior] = deriveScholarshipEvents([sch({ deadline: 'May 1 (annual)' })], {
      gradeStartIdx: JUNIOR,
      now: NOW,
    })
    // Spring of the senior year: 2027 for this senior, a year later for a junior.
    expect(senior.date).toEqual(new Date(2027, 4, 1))
    expect(junior.date).toEqual(new Date(2028, 4, 1))
    expect(senior.estimated).toBe(true)
  })

  it('keeps the student-facing wording for an estimated date', () => {
    const [e] = deriveScholarshipEvents([sch({ deadline: 'Late May (annual)' })], {
      gradeStartIdx: SENIOR,
      now: NOW,
    })
    expect(e.dateDisplay).toBe('Late May (annual)')
  })

  it('honours a full date typed into a custom entry', () => {
    const [e] = deriveScholarshipEvents([sch({ deadline: 'Nov 1, 2026' })], {
      gradeStartIdx: SENIOR,
      now: NOW,
    })
    expect(e.date).toEqual(new Date(2026, 10, 1))
    expect(e.estimated).toBe(false)
  })

  it('uses a year the text states instead of re-basing into the cycle', () => {
    // The junior case that was landing a year late: "Mar 2027" is a real
    // stated date, and March 2028 would hide it during the month it is due.
    const [e] = deriveScholarshipEvents([sch({ deadline: 'Mar 2027' })], {
      gradeStartIdx: JUNIOR, now: NOW,
    })
    expect(e.date).toEqual(new Date(2027, 2, 1))
  })

  it('rolls a recurring deadline forward when this cycle has already gone by', () => {
    // NOW is 4 Aug 2026, and this senior's cycle opens that same month, so
    // "August 1 (annual)" would otherwise resolve to three days ago — a
    // deadline the student can no longer act on.
    const [e] = deriveScholarshipEvents([sch({ deadline: 'August 1 (annual)' })], {
      gradeStartIdx: SENIOR, now: NOW,
    })
    expect(e.date.getTime()).toBeGreaterThan(NOW.getTime())
    expect(e.date).toEqual(new Date(2027, 7, 1))
  })

  it('drops a specific deadline that has already passed', () => {
    // Not actionable, and pinning it on the senior path would present it as
    // still upcoming.
    expect(deriveScholarshipEvents([sch({ deadlineDate: '2026-08-01' })], {
      gradeStartIdx: SENIOR, now: NOW,
    })).toEqual([])
  })

  it('skips scholarships with no usable date rather than inventing one', () => {
    expect(deriveScholarshipEvents([sch({ deadline: 'Varies - check official site' })], {
      gradeStartIdx: SENIOR, now: NOW,
    })).toEqual([])
    expect(deriveScholarshipEvents([sch({ deadline: null })], {
      gradeStartIdx: SENIOR, now: NOW,
    })).toEqual([])
  })

  it('drops entries the student has already finished with', () => {
    const done = deriveScholarshipEvents(
      [sch({ status: 'submitted', deadlineDate: '2027-03-15' }), sch({ id: 's2', status: 'awarded', deadlineDate: '2027-03-15' })],
      { gradeStartIdx: SENIOR, now: NOW },
    )
    expect(done).toEqual([])
    const open = deriveScholarshipEvents([sch({ status: 'ready', deadlineDate: '2027-03-15' })], {
      gradeStartIdx: SENIOR, now: NOW,
    })
    expect(open).toHaveLength(1)
  })

  it('never rolls a day past the end of its month', () => {
    // "Feb 30" would silently become March 2 via the Date constructor.
    const [e] = deriveScholarshipEvents([sch({ deadline: 'Feb 30' })], {
      gradeStartIdx: SENIOR, now: NOW,
    })
    expect(e.date.getMonth()).toBe(1)
  })

  it('sorts by date and namespaces ids so they cannot collide with college events', () => {
    const events = deriveScholarshipEvents(
      [sch({ id: 'b', deadlineDate: '2027-05-01' }), sch({ id: 'a', deadlineDate: '2027-01-10' })],
      { gradeStartIdx: SENIOR, now: NOW },
    )
    expect(events.map((e) => e.id)).toEqual(['scholarship-a', 'scholarship-b'])
  })
})

describe('mergeDeadlineEvents', () => {
  it('interleaves college and scholarship deadlines by date', () => {
    const apps = deriveDeadlineEvents([app('harvard', 'RD')], { gradeStartIdx: SENIOR, now: NOW })
    const scholarships = deriveScholarshipEvents([sch({ deadlineDate: '2026-10-01' })], {
      gradeStartIdx: SENIOR, now: NOW,
    })
    const merged = mergeDeadlineEvents(apps, scholarships)
    expect(merged.length).toBe(apps.length + scholarships.length)
    for (let i = 1; i < merged.length; i++) {
      expect(merged[i].date.getTime()).toBeGreaterThanOrEqual(merged[i - 1].date.getTime())
    }
  })
})
