import { describe, it, expect } from 'vitest'
import {
  recommendColleges,
  estimateNetCost,
  selectivityOf,
} from './collegeRecommendations'
import { getCollegeById } from './collegeData'
import type { ApplicationEntry } from './applicationsChecklist'

const app = (collegeId: string): ApplicationEntry => ({
  collegeId,
  category: 'unranked',
  deadlineType: 'RD',
  status: 'not-started',
})

describe('selectivityOf', () => {
  it('bands by acceptance rate', () => {
    const harvard = getCollegeById('harvard')!
    expect(selectivityOf(harvard)).toBe('reach') // ~4-5% accept
  })
})

describe('estimateNetCost', () => {
  it('returns null when income is unknown', () => {
    const c = getCollegeById('ucla')!
    expect(estimateNetCost(c, null)).toBeNull()
  })

  it('a meets-full-need school costs a low-income family far less than sticker', () => {
    const c = getCollegeById('harvard')! // meetsFullNeed
    const net = estimateNetCost(c, 25000)! // below the $30k EFC floor
    expect(net).toBe(0)
    expect(net).toBeLessThan(c.costOfAttendance)
  })

  it('net rises with income', () => {
    const c = getCollegeById('harvard')!
    expect(estimateNetCost(c, 150000)!).toBeGreaterThan(estimateNetCost(c, 50000)!)
  })
})

describe('recommendColleges', () => {
  it('never recommends a college already on the list', () => {
    const apps = [app('ucla'), app('harvard')]
    const recs = recommendColleges(apps, 50000, 8)
    const ids = recs.map((r) => r.college.id)
    expect(ids).not.toContain('ucla')
    expect(ids).not.toContain('harvard')
  })

  it('respects the limit', () => {
    expect(recommendColleges([], 50000, 5)).toHaveLength(5)
  })

  it('returns a balanced spread — not all reaches — for an empty list', () => {
    const recs = recommendColleges([], null, 8)
    const bands = new Set(recs.map((r) => r.selectivity))
    // The original bug: an empty list surfaced only reaches. Now every band shows.
    expect(bands.has('match')).toBe(true)
    expect(bands.has('safety')).toBe(true)
    expect(recs.filter((r) => r.selectivity === 'reach').length).toBeLessThan(recs.length)
  })

  it('orders results reach → match → safety', () => {
    const recs = recommendColleges([], 40000, 8)
    const order = ['reach', 'match', 'safety']
    const idxs = recs.map((r) => order.indexOf(r.selectivity))
    for (let i = 1; i < idxs.length; i++) {
      expect(idxs[i]).toBeGreaterThanOrEqual(idxs[i - 1])
    }
  })

  it('ranks within a band by financial fit (cheaper first for this family)', () => {
    const recs = recommendColleges([], 20000, 12)
    for (const band of ['reach', 'match', 'safety'] as const) {
      const inBand = recs.filter((r) => r.selectivity === band)
      for (let i = 1; i < inBand.length; i++) {
        expect(inBand[i - 1].score).toBeGreaterThanOrEqual(inBand[i].score)
      }
    }
  })

  it('surfaces matches AND safeties for a reach-heavy list, flagged as gap-fillers', () => {
    const reachHeavy = [app('harvard'), app('yale'), app('princeton')]
    const recs = recommendColleges(reachHeavy, 40000, 8)
    const bands = new Set(recs.map((r) => r.selectivity))
    expect(bands.has('match')).toBe(true)
    expect(bands.has('safety')).toBe(true)
    const rounding = recs.filter((r) => r.reasons.some((x) => x.includes('Rounds out your list')))
    expect(rounding.every((r) => r.selectivity !== 'reach')).toBe(true)
  })
})
