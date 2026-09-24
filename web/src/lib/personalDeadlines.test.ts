import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DeadlineEvent } from '../data/applicationDeadlines'

const H = vi.hoisted(() => ({ getModuleData: vi.fn(), setModuleData: vi.fn() }))
vi.mock('./moduleProgress', () => ({
  getModuleData: H.getModuleData, setModuleData: H.setModuleData,
}))

import {
  getPersonalDeadlines,
  getDoneIds,
  deriveOwnEvents,
  makePersonalDeadline,
  toIsoDay,
  getDeadlineOverrides,
  applyOverrides,
  type PersonalDeadline,
} from './personalDeadlines'

const row = (over: Partial<PersonalDeadline> = {}): PersonalDeadline => ({
  id: 'own-1', title: 'Ask Ms. Reyes for a reference',
  date: '2026-11-01', module: 'Application Tracking', ...over,
})

describe('personalDeadlines', () => {
  beforeEach(() => {
    H.setModuleData.mockResolvedValue(undefined)
  })

  it('reads back what was stored', async () => {
    H.getModuleData.mockResolvedValue([row()])
    expect(await getPersonalDeadlines()).toEqual([row()])
  })

  it.each([
    ['not an array', { nope: true }],
    ['a null row', [null]],
    ['a row with no title', [{ id: 'a', title: '   ', date: '2026-11-01' }]],
    ['a row with a bad date', [{ id: 'a', title: 'x', date: 'next Tuesday' }]],
    ['a row with no id', [{ title: 'x', date: '2026-11-01' }]],
  ])('drops %s rather than rendering it', async (_label, stored) => {
    // Settings are user-writable JSON, so anything can come back.
    H.getModuleData.mockResolvedValue(stored)
    expect(await getPersonalDeadlines()).toEqual([])
  })

  it('falls back to Application Tracking for an unknown module', async () => {
    // Falls back rather than dropping: the row is the student's own work, and
    // a module name we no longer recognise is no reason to lose it.
    H.getModuleData.mockResolvedValue([{ ...row(), module: 'Astrology' }])
    expect((await getPersonalDeadlines())[0].module).toBe('Application Tracking')
  })

  it.each(['Application Tracking', 'Financial Aid', 'Custom'])(
    'round-trips a date filed under %s', async (module) => {
      H.getModuleData.mockResolvedValue([{ ...row(), module }])
      expect((await getPersonalDeadlines())[0].module).toBe(module)
    },
  )

  it('carries Custom through to the derived event', () => {
    const [e] = deriveOwnEvents([row({ module: 'Custom' })])
    expect(e.module).toBe('Custom')
    // Still the student's own date, whichever bucket they filed it in.
    expect(e.source).toBe('self')
    expect(e.category).toBe('own')
  })

  it('keeps only strings in the done set', async () => {
    H.getModuleData.mockResolvedValue(['own-1', 42, null, 'app-harvard-EA'])
    expect(await getDoneIds()).toEqual(['own-1', 'app-harvard-EA'])
  })

  it('dates a self-set event on the day the student typed', () => {
    // Not `new Date('2026-11-01')` — that is UTC midnight, which is 31 October
    // everywhere west of Greenwich.
    const [e] = deriveOwnEvents([row()])
    expect(e.date.getFullYear()).toBe(2026)
    expect(e.date.getMonth()).toBe(10)
    expect(e.date.getDate()).toBe(1)
  })

  it('marks self-set events as such, and never as estimated', () => {
    const [e] = deriveOwnEvents([row()])
    expect(e.source).toBe('self')
    expect(e.category).toBe('own')
    expect(e.estimated).toBe(false)
  })

  it('gives each new date its own id', () => {
    const a = makePersonalDeadline('a', '2026-11-01', 'Financial Aid')
    const b = makePersonalDeadline('b', '2026-11-01', 'Financial Aid')
    expect(a.id).not.toBe(b.id)
    // `own-` keeps these from ever colliding with a derived event's id, which
    // would let one tick mark both done.
    expect(a.id.startsWith('own-')).toBe(true)
  })

  it('round-trips a Date through the stored ISO day', () => {
    const d = new Date(2026, 10, 1)
    expect(toIsoDay(d)).toBe('2026-11-01')
    expect(deriveOwnEvents([row({ date: toIsoDay(d) })])[0].date.getTime()).toBe(d.getTime())
  })
})

describe('deadline corrections', () => {
  const ev = (over: Partial<DeadlineEvent> & { id: string }): DeadlineEvent => ({
    collegeId: null, collegeName: null, typeLabel: '', title: over.id, shortTitle: over.id,
    emoji: '', module: 'Application Tracking', category: 'application', source: 'derived',
    date: new Date(2026, 10, 1), dateDisplay: 'Nov 1, 2026', color: '', estimated: true,
    estimateReason: 'no-source', ...over,
  })

  it('beats the derived date, and clears the estimate with it', () => {
    // The student read this off the school's own page; we guessed.
    const [e] = applyOverrides([ev({ id: 'osu' })], { osu: '2026-11-15' })
    expect(e.date.getDate()).toBe(15)
    expect(e.dateDisplay).toBe('Nov 15, 2026')
    expect(e.estimated).toBe(false)
    expect(e.estimateReason).toBeUndefined()
    expect(e.corrected).toBe(true)
  })

  it('re-sorts once a date moves', () => {
    const events = [ev({ id: 'a', date: new Date(2026, 10, 1) }), ev({ id: 'b', date: new Date(2026, 10, 5) })]
    expect(applyOverrides(events, { a: '2026-12-01' }).map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('leaves events with no correction exactly as they were', () => {
    const events = [ev({ id: 'a' })]
    expect(applyOverrides(events, {})).toBe(events)
    expect(applyOverrides(events, { other: '2026-12-01' })[0]).toBe(events[0])
  })

  it('ignores a stored value that is not a date', async () => {
    // Settings are user-writable JSON; a bad row must not date an event to NaN.
    H.getModuleData.mockResolvedValue({ good: '2026-11-15', bad: 'next Tuesday', worse: 42 })
    expect(await getDeadlineOverrides()).toEqual({ good: '2026-11-15' })
  })

  it('reads a non-object store as no corrections', async () => {
    H.getModuleData.mockResolvedValue(['2026-11-15'])
    expect(await getDeadlineOverrides()).toEqual({})
  })
})
