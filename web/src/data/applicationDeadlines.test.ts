import { describe, it, expect, beforeAll } from 'vitest'
import {
  parseCollegeDate,
  deriveDeadlineEvents,
  upcomingEvents,
  nextDueForModule,
} from './applicationDeadlines'
import { __setColleges } from './collegeData'
import { COLLEGE_FIXTURES } from './__fixtures__/collegeFixtures'
import type { ApplicationEntry, AppDeadlineType } from './applicationsChecklist'

beforeAll(() => __setColleges(COLLEGE_FIXTURES))

const app = (collegeId: string, deadlineType: AppDeadlineType): ApplicationEntry => ({
  collegeId,
  category: 'unranked',
  deadlineType,
  status: 'not-started',
})

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
    const events = deriveDeadlineEvents([app('harvard', 'EA')])
    const ea = events.find((e) => e.deadlineType === 'EA')!
    expect(ea.module).toBe('Application Tracking')
    expect(ea.date.getMonth()).toBe(10) // Harvard EA = Nov 1
  })

  it('skips Rolling (no fixed date)', () => {
    const events = deriveDeadlineEvents([app('harvard', 'Rolling')])
    expect(events.some((e) => e.module === 'Application Tracking')).toBe(false)
  })

  it('emits a single earliest FAFSA event across the list', () => {
    const events = deriveDeadlineEvents([app('harvard', 'RD'), app('ucla', 'RD')])
    const fafsa = events.filter((e) => e.module === 'Financial Aid')
    expect(fafsa).toHaveLength(1)
  })

  it('returns events sorted ascending by date', () => {
    const events = deriveDeadlineEvents([app('ucla', 'RD'), app('harvard', 'EA')])
    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].date.getTime()).toBeLessThanOrEqual(events[i].date.getTime())
    }
  })

  it('ignores unknown college ids', () => {
    expect(deriveDeadlineEvents([app('not-a-real-college', 'RD')])).toHaveLength(0)
  })
})

describe('upcomingEvents / nextDueForModule', () => {
  // Computed in beforeAll so the college cache is seeded first.
  let events: ReturnType<typeof deriveDeadlineEvents>
  beforeAll(() => { events = deriveDeadlineEvents([app('harvard', 'EA'), app('ucla', 'RD')]) })

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
