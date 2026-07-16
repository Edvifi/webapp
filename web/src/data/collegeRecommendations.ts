/**
 * collegeRecommendations — suggests colleges to add to the user's list, ranked
 * primarily by *financial fit* for their household income band, then by how well
 * each rounds out the reach/match/safety spread of their current list.
 *
 * The net-cost figures are rough heuristics for a prototype, NOT financial
 * advice — they exist to order recommendations by affordability, and every card
 * links out to the school's official Net Price Calculator for the real number.
 */

import { COLLEGES, getCollegeById, type CollegeInfo } from './collegeData'
import type { ApplicationEntry } from './applicationsChecklist'

/** Selectivity band derived from acceptance rate — a proxy for reach/match/safety. */
export type Selectivity = 'reach' | 'match' | 'safety'

export const SELECTIVITY_META: Record<Selectivity, { label: string; color: string }> = {
  reach: { label: 'Reach', color: '#B93A3A' },
  match: { label: 'Match', color: '#1D7FC4' },
  safety: { label: 'Safety', color: '#2D9E72' },
}

export function selectivityOf(college: CollegeInfo): Selectivity {
  const r = college.acceptanceRate
  if (r == null) return 'match'
  if (r < 0.15) return 'reach'
  if (r < 0.4) return 'match'
  return 'safety'
}

export interface CollegeRecommendation {
  college: CollegeInfo
  selectivity: Selectivity
  /** Rough per-year net cost for the given income band, or null when income is unknown. */
  estimatedNetCost: number | null
  affordable: boolean
  reasons: string[]
  score: number
}

/**
 * Rough per-year net-cost estimate for a family income (in dollars).
 * Model: an SAI/EFC proxy (nothing under $30k, ~22% of income above it) sets the
 * expected contribution; schools that meet full need cover ~100% of remaining
 * need, others ~65%. Returns null when income is unknown.
 */
export function estimateNetCost(college: CollegeInfo, familyIncomeDollars: number | null): number | null {
  if (familyIncomeDollars == null) return null
  const coa = college.costOfAttendance
  const efc = Math.max(0, (familyIncomeDollars - 30000) * 0.22)
  const need = Math.max(0, coa - efc)
  const needMetFraction = college.meetsFullNeed ? 1 : 0.65
  const net = coa - need * needMetFraction
  return Math.round(Math.min(coa, Math.max(0, net)))
}

/** Affordable if estimated net is within a reasonable slice of income (min $15k floor). */
function isAffordable(net: number | null, familyIncomeDollars: number | null): boolean {
  if (net == null || familyIncomeDollars == null) return false
  return net <= Math.max(15000, familyIncomeDollars * 0.25)
}

/**
 * Rank colleges the user hasn't added yet, financial-fit first, then list-balance.
 * @param apps                  the user's current college list
 * @param familyIncomeDollars   household income in dollars (null when unknown)
 * @param limit                 max recommendations to return
 */
export function recommendColleges(
  apps: ApplicationEntry[],
  familyIncomeDollars: number | null,
  limit = 8,
): CollegeRecommendation[] {
  const existing = new Set(apps.map((a) => a.collegeId))

  // Current spread by selectivity, so we can boost schools that fill a gap.
  const spread: Record<Selectivity, number> = { reach: 0, match: 0, safety: 0 }
  for (const a of apps) {
    const c = getCollegeById(a.collegeId)
    if (c) spread[selectivityOf(c)]++
  }

  const recs = COLLEGES.filter((c) => !existing.has(c.id)).map((c): CollegeRecommendation => {
    const selectivity = selectivityOf(c)
    const net = estimateNetCost(c, familyIncomeDollars)
    const affordable = isAffordable(net, familyIncomeDollars)
    const reasons: string[] = []

    // ── Financial-fit score (primary) ──
    let score: number
    if (net != null) {
      // Lower net → higher score. $0 → 100, $80k → 0.
      score = Math.max(0, 100 - net / 800)
      reasons.push(
        `Est. ~$${Math.round(net / 1000)}k/yr for your income band`,
      )
    } else {
      // No income data: lean on affordability signals only.
      score = c.meetsFullNeed ? 60 : 30
    }
    if (c.meetsFullNeed) {
      score += 15
      reasons.push('Meets 100% of demonstrated need')
    }
    if (c.noLoanPolicy) {
      score += 10
      reasons.push('No loans in aid packages')
    }

    // ── List-balance boost (secondary) — reward filling an empty/thin band ──
    const bandCount = spread[selectivity]
    if (bandCount === 0 && apps.length > 0) {
      score += 25
      reasons.push(`Rounds out your list — no ${selectivity} schools yet`)
    } else if (bandCount === 1) {
      score += 10
    }

    return { college: c, selectivity, estimatedNetCost: net, affordable, reasons, score }
  })

  return recs.sort((a, b) => b.score - a.score).slice(0, limit)
}
