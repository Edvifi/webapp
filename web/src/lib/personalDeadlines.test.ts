import { describe, it, expect, vi, beforeEach } from 'vitest'

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
    H.getModuleData.mockResolvedValue([{ ...row(), module: 'Astrology' }])
    expect((await getPersonalDeadlines())[0].module).toBe('Application Tracking')
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
