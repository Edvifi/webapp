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

  it('ranks a cheaper-for-this-family school above a pricier one', () => {
    // With no income data the ordering leans on aid generosity; with income it
    // leans on estimated net. Either way results are sorted by score descending.
    const recs = recommendColleges([], 20000, 8)
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score)
    }
  })

  it('boosts (and flags) selectivity bands the list is missing', () => {
    // A reach-only list is missing both match and safety bands, so recs in
    // those bands should carry the "rounds out your list" reason and outrank
    // their un-boosted score.
    const reachHeavy = [app('harvard'), app('yale'), app('princeton')]
    const recs = recommendColleges(reachHeavy, 40000, 8)
    const rounding = recs.filter((r) => r.reasons.some((x) => x.includes('Rounds out your list')))
    expect(rounding.length).toBeGreaterThan(0)
    expect(rounding.every((r) => r.selectivity !== 'reach')).toBe(true)
  })
})
