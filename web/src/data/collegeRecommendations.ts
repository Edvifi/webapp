/**
 * collegeRecommendations — suggests colleges to add to the user's list, ranked
 * primarily by *financial fit* for their household income band, then by how well
 * each rounds out the reach/match/safety spread of their current list.
 *
 * The net-cost figures are rough heuristics for a prototype, NOT financial
 * advice — they exist to order recommendations by affordability, and every card
 * links out to the school's official Net Price Calculator for the real number.
 */

import { getAllColleges, getCollegeById, type CollegeInfo } from './collegeData'
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

/** School ownership, collapsed to the two buckets the filter UI exposes. */
export type SchoolType = 'Public' | 'Private'
export function schoolTypeOf(college: CollegeInfo): SchoolType {
  return (college.type || '').toLowerCase().includes('public') ? 'Public' : 'Private'
}

/**
 * Optional narrowing applied to the candidate pool *before* band allocation, so
 * the reach/match/safety balancing and financial ranking still hold within the
 * filtered set. Empty arrays / false mean "no constraint".
 */
export interface RecommendationFilters {
  bands?: Selectivity[]
  types?: SchoolType[]
  states?: string[]
  meetsFullNeed?: boolean
}

function passesFilters(college: CollegeInfo, f: RecommendationFilters | undefined): boolean {
  if (!f) return true
  if (f.bands && f.bands.length && !f.bands.includes(selectivityOf(college))) return false
  if (f.types && f.types.length && !f.types.includes(schoolTypeOf(college))) return false
  if (f.states && f.states.length && !f.states.includes(college.state)) return false
  if (f.meetsFullNeed && !college.meetsFullNeed) return false
  return true
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

const DISPLAY_ORDER: Selectivity[] = ['reach', 'match', 'safety']
/** A well-rounded list, per the College List tab's own guidance (2-3 / 4-6 / 2-3). */
const IDEAL_SPREAD: Record<Selectivity, number> = { reach: 3, match: 5, safety: 3 }

/** Financial-fit score + human reasons for a single candidate college. */
function scoreCandidate(
  college: CollegeInfo,
  familyIncomeDollars: number | null,
  spread: Record<Selectivity, number>,
  listSize: number,
): CollegeRecommendation {
  const selectivity = selectivityOf(college)
  const net = estimateNetCost(college, familyIncomeDollars)
  const affordable = isAffordable(net, familyIncomeDollars)
  const reasons: string[] = []

  let score: number
  if (net != null) {
    score = Math.max(0, 100 - net / 800) // $0 → 100, $80k → 0
    reasons.push(`Est. ~$${Math.round(net / 1000)}k/yr for your income band`)
  } else {
    score = college.meetsFullNeed ? 60 : 30
  }
  if (college.meetsFullNeed) {
    score += 15
    reasons.push('Meets 100% of demonstrated need')
  }
  if (college.noLoanPolicy) {
    score += 10
    reasons.push('No loans in aid packages')
  }
  if (listSize > 0 && spread[selectivity] === 0) {
    reasons.push(`Rounds out your list — no ${selectivity} schools yet`)
  }

  return { college, selectivity, estimatedNetCost: net, affordable, reasons, score }
}

/**
 * Decide how many recommendations to pull from each band. Weighted by the gap
 * between the ideal spread and the current list, so a reach-heavy list gets
 * mostly matches/safeties. Round-robin with diminishing priority keeps the
 * allocation proportional while guaranteeing representation.
 */
function allocateSlots(
  spread: Record<Selectivity, number>,
  avail: Record<Selectivity, number>,
  limit: number,
): Record<Selectivity, number> {
  const need: Record<Selectivity, number> = {
    reach: Math.max(0, IDEAL_SPREAD.reach - spread.reach),
    match: Math.max(0, IDEAL_SPREAD.match - spread.match),
    safety: Math.max(0, IDEAL_SPREAD.safety - spread.safety),
  }
  // Already balanced (or a full list) → still show a bit of everything.
  const weights = need.reach + need.match + need.safety === 0 ? { reach: 1, match: 1, safety: 1 } : need

  const slots: Record<Selectivity, number> = { reach: 0, match: 0, safety: 0 }
  let remaining = Math.min(limit, avail.reach + avail.match + avail.safety)
  while (remaining > 0) {
    let best: Selectivity | null = null
    let bestPriority = -Infinity
    for (const b of DISPLAY_ORDER) {
      if (slots[b] >= avail[b] || weights[b] === 0) continue
      const priority = weights[b] / (slots[b] + 1) // diminishing returns per pick
      if (priority > bestPriority) { bestPriority = priority; best = b }
    }
    // No weighted band left with capacity → spill into any band that still has room.
    if (best === null) best = DISPLAY_ORDER.find((b) => slots[b] < avail[b]) ?? null
    if (best === null) break
    slots[best]++
    remaining--
  }
  return slots
}

/**
 * Recommend colleges the user hasn't added yet. Guarantees a reach/match/safety
 * spread (weighted toward the gaps in the current list), and ranks *within* each
 * band by financial fit. Returns up to `limit`, ordered reach → match → safety.
 */
export function recommendColleges(
  apps: ApplicationEntry[],
  familyIncomeDollars: number | null,
  limit = 8,
  dismissed: string[] = [],
  filters?: RecommendationFilters,
): CollegeRecommendation[] {
  const existing = new Set([...apps.map((a) => a.collegeId), ...dismissed])

  const spread: Record<Selectivity, number> = { reach: 0, match: 0, safety: 0 }
  for (const a of apps) {
    const c = getCollegeById(a.collegeId)
    if (c) spread[selectivityOf(c)]++
  }

  // Score every candidate and bucket by band (each band sorted by financial fit).
  const byBand: Record<Selectivity, CollegeRecommendation[]> = { reach: [], match: [], safety: [] }
  for (const college of getAllColleges()) {
    if (existing.has(college.id)) continue
    if (!passesFilters(college, filters)) continue
    const rec = scoreCandidate(college, familyIncomeDollars, spread, apps.length)
    byBand[rec.selectivity].push(rec)
  }
  for (const b of DISPLAY_ORDER) byBand[b].sort((x, y) => y.score - x.score)

  const avail = { reach: byBand.reach.length, match: byBand.match.length, safety: byBand.safety.length }
  const slots = allocateSlots(spread, avail, limit)

  // Take each band's quota, then spill any leftover capacity to the best remaining.
  const chosen: CollegeRecommendation[] = []
  for (const b of DISPLAY_ORDER) chosen.push(...byBand[b].slice(0, slots[b]))
  if (chosen.length < limit) {
    const chosenIds = new Set(chosen.map((r) => r.college.id))
    const rest = DISPLAY_ORDER.flatMap((b) => byBand[b].slice(slots[b]))
      .filter((r) => !chosenIds.has(r.college.id))
      .sort((x, y) => y.score - x.score)
    chosen.push(...rest.slice(0, limit - chosen.length))
  }

  // Display order: reach → match → safety, best financial fit first within each.
  return chosen.sort(
    (x, y) => DISPLAY_ORDER.indexOf(x.selectivity) - DISPLAY_ORDER.indexOf(y.selectivity) || y.score - x.score,
  )
}
