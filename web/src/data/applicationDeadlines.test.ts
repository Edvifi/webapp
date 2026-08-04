import { describe, it, expect, beforeAll } from 'vitest'
import {
  parseCollegeDate,
  deriveDeadlineEvents,
  upcomingEvents,
  nextDueForModule,
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
