// College Match / Pathway Finder — pure scoring engine.
//
// Two independent signals (see product design):
//   • fitScore  (0–100)  — how well a school matches the student (affordability,
//                          major, outcomes, size, setting, location, ownership)
//   • admission band     — chance of getting in, as a WARM label
//                          (Open / Likely / Target / Reach), never a bare %.
//
// Plus community-college → 4-year transfer pairing and an always-on affordable
// alternative nudge. No I/O here; the data layer passes rows in.
import type { Database } from '../types/database'

export type College = Database['public']['Tables']['colleges']['Row']

export type IncomeBracket = '0_30k' | '30k_48k' | '48k_75k' | '75k_110k' | '110k_plus'
export type AdmissionBand = 'open' | 'likely' | 'target' | 'reach' | 'unknown'
export type PathwayType = '4yr_direct' | 'community_transfer' | 'career_technical'

export interface StudentCollegeProfile {
  /** As answered in the demographic survey: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say'. */
  gender?: string | null
  gpa?: number | null
  satTotal?: number | null // 400–1600
  act?: number | null // 1–36
  /** Scorecard program keys, e.g. ['engineering','computer','business_marketing'] */
  intendedFields?: string[]
  familyIncomeCents?: number | null
  homeState?: string | null // e.g. 'CA'
  prefSize?: 'small' | 'medium' | 'large' | null
  prefSettings?: Array<'city' | 'suburb' | 'town' | 'rural'> | null
  prefOwnership?: 'public' | 'private' | 'either' | null
  prefMaxDistance?: 'in_state' | 'in_region' | 'anywhere' | null
  openToTransfer?: boolean
  openToTrade?: boolean
}

export interface MatchDimensions {
  affordability: number
  major: number
  outcomes: number
  standing: number
  size: number
  setting: number
  location: number
  ownership: number
}

export interface CollegeMatch {
  fitScore: number
  band: AdmissionBand
  /** Estimated admit chance (%), for the on-demand expander. null for open admission. */
  estAdmitPct: number | null
  /**
   * How far the school sits from the student academically, when it's far
   * enough to matter: a reach they're unlikely to get into, or a school well
   * below their level. Feeds the feed order only (see feedRank).
   */
  academicGap: 'long_shot' | 'far_below' | null
  netPriceForYouCents: number | null
  pathway: PathwayType
  reasons: string[]
  dimensions: MatchDimensions
}

export interface ScoredCollege {
  college: College
  match: CollegeMatch
}

export interface TransferPath {
  communityCollege: College
  target: College
  transferRate: number | null
  netPriceForYouCents: number | null
  note: string
}

/* ──────────────────────────── helpers ──────────────────────────── */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const asRecord = (j: unknown): Record<string, number> | null =>
  j && typeof j === 'object' && !Array.isArray(j) ? (j as Record<string, number>) : null

const CENSUS_REGIONS: Record<string, string> = {}
for (const [region, states] of Object.entries({
  Northeast: 'CT ME MA NH RI VT NJ NY PA',
  Midwest: 'IL IN MI OH WI IA KS MN MO NE ND SD',
  South: 'DE FL GA MD NC SC VA DC WV AL KY MS TN AR LA OK TX',
  West: 'AZ CO ID MT NV NM UT WY AK CA HI OR WA',
})) {
  for (const st of states.split(' ')) CENSUS_REGIONS[st] = region
}
export const regionOf = (state: string | null | undefined): string | null =>
  state ? CENSUS_REGIONS[state] ?? 'Territories' : null

/**
 * The regions a student actually searches in.
 *
 * The four Census regions above score a college's distance and are far too
 * coarse to browse by: "West" is Seattle, Phoenix and Honolulu together, and
 * "Northeast" runs from Maine to Pennsylvania. These are the finer splits
 * people mean by "the Northeast" or "the Pacific Northwest" — narrow enough
 * that picking one meaningfully shortens the list.
 *
 * Kept separate rather than replacing the Census map: that one is stored on
 * every college row and feeds the match score, so changing it would silently
 * restate every student's results.
 */
export const SEARCH_REGIONS = [
  'New England', 'Mid-Atlantic', 'Southeast', 'Midwest',
  'South Central', 'Mountain West', 'Pacific',
] as const
export type SearchRegion = (typeof SEARCH_REGIONS)[number]

const SEARCH_REGION_OF: Record<string, SearchRegion> = {}
for (const [region, states] of Object.entries({
  'New England': 'CT ME MA NH RI VT',
  'Mid-Atlantic': 'NJ NY PA DE MD DC',
  Southeast: 'VA WV NC SC GA FL AL MS TN KY',
  Midwest: 'OH IN IL MI WI MN IA MO ND SD NE KS',
  'South Central': 'TX OK AR LA',
  'Mountain West': 'MT ID WY CO UT NV AZ NM',
  Pacific: 'CA OR WA AK HI',
} satisfies Record<SearchRegion, string>)) {
  for (const st of states.split(' ')) SEARCH_REGION_OF[st] = region as SearchRegion
}

/**
 * Schools the ranked feed never volunteers (name search still finds them):
 * territory schools unless the student lives in one; for-profit four-years;
 * four-years graduating under 25% unless graduation plus transfer-out reaches
 * 40% (which keeps feeder branch campuses); the service academies and colleges
 * for deaf students; and single-sex colleges for a student who answered the
 * other gender (anyone else sees both). Trade schools are exempt from the
 * for-profit rule, since most career colleges are for-profit.
 */
const SPECIAL_MISSION = new Set([
  128328, 130624, 197027, 197036, 164155, // Air Force, Coast Guard, Merchant Marine, West Point, Naval
  131450, 382911, // Gallaudet, Southwest College for the Deaf
])
export const leftOutOfFeed = (college: College, homeState: string | null | undefined, gender?: string | null): boolean =>
  SPECIAL_MISSION.has(college.scorecard_id) ||
  (college.single_sex === 'women' && gender === 'Male') ||
  (college.single_sex === 'men' && gender === 'Female') ||
  (regionOf(college.state) === 'Territories' && regionOf(homeState) !== 'Territories') ||
  (college.institution_type === '4yr' && college.ownership === 'private_forprofit') ||
  (college.institution_type === '4yr' && college.grad_rate != null && college.grad_rate < 0.25 &&
    college.grad_rate + (college.transfer_rate ?? 0) < 0.4)

/**
 * At most one reach in each run of four, otherwise in the given order. Fit
 * ignores admission odds, so without this a strong student sees only reaches.
 */
export function spreadReaches<T>(items: T[], isReach: (t: T) => boolean, every = 4): T[] {
  const reaches = items.filter(isReach)
  const rest = items.filter((t) => !isReach(t))
  const rank = new Map(items.map((t, i) => [t, i]))
  const out: T[] = []
  let r = 0
  let o = 0
  while (r < reaches.length || o < rest.length) {
    const reachDue = r < Math.ceil((out.length + 1) / every)
    const reachFirst = o >= rest.length || (reachDue && r < reaches.length && rank.get(reaches[r])! < rank.get(rest[o])!)
    out.push(reachFirst ? reaches[r++] : rest[o++])
  }
  return out
}

/** Null for territories and anything without a state — never guessed at. */
export const searchRegionOf = (state: string | null | undefined): SearchRegion | null =>
  (state && SEARCH_REGION_OF[state]) || null

export function incomeBracketFromCents(cents?: number | null): IncomeBracket | null {
  if (cents == null) return null
  const d = cents / 100
  if (d <= 30000) return '0_30k'
  if (d <= 48000) return '30k_48k'
  if (d <= 75000) return '48k_75k'
  if (d <= 110000) return '75k_110k'
  return '110k_plus'
}

/**
 * Whether the stored net price describes what THIS student would pay.
 *
 * A public school's net price is built on its in-state cost base, so for an
 * out-of-state student it is wrong by the residency gap — Michigan costs
 * $34,654 in state and $69,326 out, and the net price on file is $13,138.
 * Ranking a school as cheap on a price the student cannot be charged is the
 * one error worth being blunt about. See residencyGapCents for what replaces
 * it; with no tuition on file we still report no price.
 *
 * Private schools charge the same either way. An unknown home state cannot
 * rule a price out, so the figure stands.
 */
function netPriceApplies(college: College, profile: StudentCollegeProfile): boolean {
  if (college.ownership !== 'public') return true
  if (!profile.homeState || !college.state) return true
  return college.state === profile.homeState
}

/**
 * What an out-of-state student pays on top of a public school's net price:
 * out-of-state minus in-state tuition, in cents. 0 when residency doesn't
 * apply; null when the tuition isn't on file. Assumes no out-of-state aid.
 */
// ponytail: ignores out-of-state merit aid; some schools (Alabama, Arizona) give a lot of it.
function residencyGapCents(college: College, profile: StudentCollegeProfile): number | null {
  if (netPriceApplies(college, profile)) return 0
  const inState = college.tuition_in_state_cents
  const outState = college.tuition_out_of_state_cents
  return inState != null && outState != null ? Math.max(0, outState - inState) : null
}

const BRACKETS: IncomeBracket[] = ['0_30k', '30k_48k', '48k_75k', '75k_110k', '110k_plus']

/**
 * A bracket's net price, unless it's under 75% of the bracket below: aid can't
 * make a richer family pay much less, so that figure is a small sample and the
 * lower bracket's price stands in (Saint Mary's MN: $6.1k for $110k+, $14.8k
 * for $75-110k).
 */
function bracketNetPrice(byIncome: Record<string, number>, bracket: IncomeBracket): number | null {
  let prev: number | null = null
  for (const b of BRACKETS) {
    const v = byIncome[b]
    const eff: number | null = v == null ? null : prev != null && v < 0.75 * prev ? prev : v
    if (b === bracket) return eff
    if (eff != null) prev = eff
  }
  return null
}

/** Net price for THIS student's income bracket, falling back to the school average. */
export function netPriceForYouCents(college: College, profile: StudentCollegeProfile): number | null {
  const gap = residencyGapCents(college, profile)
  if (gap == null) return null
  const bracket = incomeBracketFromCents(profile.familyIncomeCents)
  const byIncome = asRecord(college.net_price_by_income)
  const own = bracket && byIncome ? bracketNetPrice(byIncome, bracket) : null
  const base = own ?? college.avg_net_price_cents ?? null
  return base == null ? null : base + gap
}

/**
 * The most a year can cost and still count as "affordable" for this student.
 *
 * A flat $15k line meant the same thing to a family on $25k and one on $150k,
 * which made the Affordable filter wrong for both. The cap rises with the
 * income bracket; with no income on file it stays at the old $15k.
 */
const AFFORDABLE_CAP_CENTS: Record<IncomeBracket, number> = {
  '0_30k': 750_000,
  '30k_48k': 1_000_000,
  '48k_75k': 1_500_000,
  '75k_110k': 2_000_000,
  '110k_plus': 2_500_000,
}
const affordableCapCents = (profile: StudentCollegeProfile): number => {
  const bracket = incomeBracketFromCents(profile.familyIncomeCents)
  return bracket ? AFFORDABLE_CAP_CENTS[bracket] : 1_500_000
}
export function isAffordableForYou(netCents: number | null, profile: StudentCollegeProfile): boolean {
  return netCents != null && netCents <= affordableCapCents(profile)
}

/** True when the net price for this student comes from their income bracket, not the school average. */
export function hasIncomeNetPrice(college: College, profile: StudentCollegeProfile): boolean {
  if (residencyGapCents(college, profile) == null) return false
  const bracket = incomeBracketFromCents(profile.familyIncomeCents)
  const byIncome = asRecord(college.net_price_by_income)
  return !!(bracket && byIncome && byIncome[bracket] != null)
}

export function sizeBucket(size: number | null): 'small' | 'medium' | 'large' | null {
  if (size == null) return null
  if (size < 3000) return 'small'
  if (size <= 12000) return 'medium'
  return 'large'
}

/** A "community college" for our purposes is a PUBLIC 2-year — the transfer/affordable
 *  path. For-profit and nonprofit "2yr" schools are career colleges, grouped with trade. */
export const isCommunityCollege = (c: College): boolean =>
  c.institution_type === '2yr' && c.ownership === 'public'

export function pathwayType(college: College): PathwayType {
  if (isCommunityCollege(college)) return 'community_transfer'
  if (college.institution_type === '2yr' || college.institution_type === 'trade') return 'career_technical'
  return '4yr_direct'
}

/** Only 4yr / 2yr / trade schools are undergrad-seeker targets (excludes grad-only, etc.). */
export const isUndergradTarget = (college: College): boolean =>
  college.institution_type === '4yr' || college.institution_type === '2yr' || college.institution_type === 'trade'

/**
 * Stable per-college key for saved list entries + "already added" checks.
 * Uses `scorecard_id` (immutable across re-ingests) rather than `slug`, which is
 * derived from name+state and can shift on a future ingest.
 */
export const collegeAppId = (c: Pick<College, 'scorecard_id'>): string => `sc-${c.scorecard_id}`

/* ─────────────────────────── admission band ─────────────────────────── */

/**
 * Where the student's SAT (or ACT) sits in a school's middle 50%, in
 * half-widths: -1 is the 25th percentile, +1 the 75th. Null without scores.
 * With `gpaFallback`, a student with no scores is placed by a rough SAT
 * equivalent of their GPA (3.0 ≈ 1100, 4.0 ≈ 1400).
 */
// ponytail: linear GPA→SAT guess; a real concordance or the school's own GPA data if we ever ingest it.
function testPosition(college: College, profile: StudentCollegeProfile, gpaFallback = false): number | null {
  const satMid25 =
    college.sat_reading_25 != null && college.sat_math_25 != null ? college.sat_reading_25 + college.sat_math_25 : null
  const satMid75 =
    college.sat_reading_75 != null && college.sat_math_75 != null ? college.sat_reading_75 + college.sat_math_75 : null
  if (profile.satTotal != null && satMid25 != null && satMid75 != null && satMid75 > satMid25) {
    const mid = (satMid25 + satMid75) / 2
    const half = (satMid75 - satMid25) / 2
    return (profile.satTotal - mid) / half
  }
  if (profile.act != null && college.act_25 != null && college.act_75 != null && college.act_75 > college.act_25) {
    const mid = (college.act_25 + college.act_75) / 2
    const half = (college.act_75 - college.act_25) / 2
    return (profile.act - mid) / half
  }
  const noScores = profile.satTotal == null && profile.act == null
  // Only below a 3.7: the stand-in tops out at 1400, so it would place every
  // strong GPA under a selective school's range.
  if (gpaFallback && noScores && profile.gpa != null && profile.gpa < 3.7 && satMid25 != null && satMid75 != null && satMid75 > satMid25) {
    const satLike = 800 + (clamp(profile.gpa, 2, 4) - 2) * 300
    return (satLike - (satMid25 + satMid75) / 2) / ((satMid75 - satMid25) / 2)
  }
  return null
}

/** Student's academic standing vs a school's admitted class: -1 (well below) … +1 (well above), or null. */
function academicPosition(college: College, profile: StudentCollegeProfile): number | null {
  const z = testPosition(college, profile, true)
  if (z != null) return clamp(z, -1.5, 1.5) / 1.5
  if (profile.gpa != null && college.admit_rate != null) {
    const strength = clamp((profile.gpa - 2.5) / (4.0 - 2.5), 0, 1) // 2.5→0, 4.0→1
    const selectivity = 1 - college.admit_rate
    return clamp(strength - selectivity, -1, 1)
  }
  return null
}

export function admissionBand(
  college: College,
  profile: StudentCollegeProfile,
): { band: AdmissionBand; estAdmitPct: number | null } {
  if (college.admit_rate == null) {
    // Genuinely open-enrollment (2yr / trade) vs. a 4-year that simply didn't report data.
    const openEnrollment = college.institution_type === '2yr' || college.institution_type === 'trade'
    return { band: openEnrollment ? 'open' : 'unknown', estAdmitPct: null }
  }
  const z = testPosition(college, profile, true)
  const pos = academicPosition(college, profile)
  // The GPA-vs-admit-rate guess (no range to place the student in) is coarse,
  // so it sways the estimate harder.
  const sway = z != null ? 0.8 : 1.5
  let chance = college.admit_rate
  if (pos != null) chance = clamp(college.admit_rate * (1 + pos * sway), 0.01, 0.98)
  return { band: bandFor(college.admit_rate, z, chance), estAdmitPct: Math.round(chance * 100) }
}

/**
 * The counselor's rule:
 *   - Under 15% admitted: a reach for everyone, whatever the scores.
 *   - Below the 25th percentile: a reach, unless the school takes most applicants.
 *   - Above the 75th at a school taking 40%+, or in range at one taking 70%+: likely.
 *   - Otherwise: target.
 * Without test scores the GPA-based estimate decides, as before.
 */
function bandFor(admitRate: number, z: number | null, chance: number): AdmissionBand {
  if (admitRate < 0.15) return 'reach'
  if (z == null) return chance >= 0.55 ? 'likely' : chance >= 0.25 ? 'target' : 'reach'
  if (z < -1) return admitRate >= 0.7 ? 'target' : 'reach'
  if ((z >= 1 && admitRate >= 0.4) || admitRate >= 0.7) return 'likely'
  return 'target'
}

/**
 * Long shot: a reach where the student is below the school's 25th percentile,
 * or, where scores can't be compared, the estimate is under 10% (unless the
 * student scores 1500+ SAT / 34+ ACT). Far below: real scores more than half a
 * range above the school's 75th percentile, or a 1400+ / 31+ student at a
 * school that reports no scores and admits 60%+ or reports no admissions.
 */
function academicGap(
  college: College,
  profile: StudentCollegeProfile,
  band: AdmissionBand,
  estAdmitPct: number | null,
): CollegeMatch['academicGap'] {
  const z = testPosition(college, profile, true)
  const scoresZ = testPosition(college, profile)
  // A 1500+ / 34+ scorer, or a 3.7+ GPA with no scores yet, can't be ruled out
  // by an estimate alone.
  const inAnyRange = (profile.satTotal ?? 0) >= 1500 || (profile.act ?? 0) >= 34 ||
    (profile.satTotal == null && profile.act == null && (profile.gpa ?? 0) >= 3.7)
  if (band === 'reach' && (z != null ? z < -1 : !inAnyRange && estAdmitPct != null && estAdmitPct < 10)) return 'long_shot'
  const topScorer = (profile.satTotal ?? 0) >= 1400 || (profile.act ?? 0) >= 31
  if (scoresZ != null ? scoresZ > 1.5 : topScorer && (college.admit_rate == null || college.admit_rate >= 0.6)) return 'far_below'
  return null
}

export const BAND_META: Record<AdmissionBand, { label: string; tone: 'positive' | 'neutral' | 'aspirational'; blurb: string }> = {
  open: { label: 'Open admission', tone: 'positive', blurb: 'Admits all eligible applicants — you can enroll.' },
  likely: { label: 'Likely', tone: 'positive', blurb: 'Your profile is strong for this school.' },
  target: { label: 'Target', tone: 'neutral', blurb: 'A solid match for your profile — worth applying.' },
  reach: { label: 'Reach', tone: 'aspirational', blurb: 'A stretch worth taking — aim high.' },
  unknown: { label: 'Admission varies', tone: 'neutral', blurb: 'This school hasn’t reported admissions data — check its site for requirements.' },
}

/* ─────────────────────────── fit dimensions ─────────────────────────── */

/**
 * Price against what this family can carry (the Affordable caps by income):
 * full credit up to a third of the cap, none past 7/3 of it. With no income
 * on file that's $5k → $35k.
 */
function affordabilityFit(netCents: number | null, profile: StudentCollegeProfile): number {
  if (netCents == null) return 0.5
  const cap = affordableCapCents(profile)
  return clamp(1 - (netCents - cap / 3) / (2 * cap), 0, 1)
}

function majorFit(college: College, profile: StudentCollegeProfile): number {
  const fields = profile.intendedFields ?? []
  if (fields.length === 0) return 0.7 // no stated major → don't penalize
  const progs = asRecord(college.programs)
  if (!progs) return 0.4
  const best = Math.max(0, ...fields.map((f) => progs[f] ?? 0))
  if (best === 0) return 0.15 // school doesn't meaningfully offer the intended field
  return clamp(0.5 + best * 3.5, 0.5, 1) // share 0.02 → ~0.57, 0.15+ → 1
}

/** Carnegie basic classification (2021) → standing, 0–1. Unlisted codes say nothing. */
const CARNEGIE_STANDING: Record<number, number> = {
  15: 1, // doctoral, very high research (R1)
  16: 0.8, // doctoral, high research (R2)
  21: 0.8, // baccalaureate, arts & sciences focus (liberal arts colleges)
  17: 0.55, // doctoral/professional
  28: 0.5, // special focus: engineering & technology
  30: 0.5, // special focus: arts, music & design
  18: 0.45, // master's, larger programs
  19: 0.4, // master's, medium
  20: 0.35, // master's, small
  22: 0.3, // baccalaureate, diverse fields
  26: 0.3, // special focus: other health professions
  29: 0.3, // special focus: business
  32: 0.3, // special focus: other
  23: 0.2, // baccalaureate/associate's
  24: 0.2, // special focus: faith-related
}

/**
 * A school's academic standing, 0–1: our stand-in for a published ranking
 * (US News and the like are licensed). The mean of what's known of its
 * Carnegie class, selectivity and typical SAT/ACT; 0.5 with nothing known.
 */
// ponytail: proxy for reputation, no peer surveys or spending data; add Wikipedia pageviews as a tie-breaker if lists still feel unfamiliar.
export function standingFit(college: College): number {
  const parts: number[] = []
  const carnegie = college.carnegie_basic != null ? CARNEGIE_STANDING[college.carnegie_basic] : undefined
  if (carnegie != null) parts.push(carnegie)
  if (college.admit_rate != null) parts.push(clamp((0.9 - college.admit_rate) / 0.8, 0, 1)) // 90%+ → 0, 10% → 1
  const satMid =
    college.sat_reading_25 != null && college.sat_math_25 != null && college.sat_reading_75 != null && college.sat_math_75 != null
      ? (college.sat_reading_25 + college.sat_math_25 + college.sat_reading_75 + college.sat_math_75) / 2
      : null
  const actMid = college.act_25 != null && college.act_75 != null ? (college.act_25 + college.act_75) / 2 : null
  if (satMid != null) parts.push(clamp((satMid - 1000) / 500, 0, 1)) // 1000 → 0, 1500 → 1
  else if (actMid != null) parts.push(clamp((actMid - 20) / 13, 0, 1)) // 20 → 0, 33 → 1
  return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0.5
}

/**
 * A missing figure is unknown, not excellent.
 *
 * Averaging only the parts that exist rewarded schools for reporting less:
 * a 118-student seminary with a 100% graduation rate and no earnings data
 * scored a flat 1.000 on this dimension — above Princeton's 0.988 — which is
 * how it reached the second card in the feed. An absent part now takes the
 * same neutral prior a school with no outcome data at all already got, so
 * partial data can no longer beat complete data.
 */
function outcomesFit(college: College): number {
  const grad = college.grad_rate != null ? clamp(college.grad_rate, 0, 1) : 0.5
  const earn =
    college.median_earnings_10yr_cents != null
      ? clamp((college.median_earnings_10yr_cents / 100 - 25000) / (75000 - 25000), 0, 1)
      : 0.5
  return (grad + earn) / 2
}

function sizeFit(college: College, profile: StudentCollegeProfile): number {
  if (!profile.prefSize) return 0.6
  const b = sizeBucket(college.size)
  if (b == null) return 0.5
  if (b === profile.prefSize) return 1
  const adjacent =
    (b === 'small' && profile.prefSize === 'medium') ||
    (b === 'medium' && (profile.prefSize === 'small' || profile.prefSize === 'large')) ||
    (b === 'large' && profile.prefSize === 'medium')
  return adjacent ? 0.6 : 0.3
}

function settingFit(college: College, profile: StudentCollegeProfile): number {
  if (!profile.prefSettings || profile.prefSettings.length === 0) return 0.6
  if (!college.locale) return 0.5
  return profile.prefSettings.includes(college.locale as 'city' | 'suburb' | 'town' | 'rural') ? 1 : 0.4
}

function locationFit(college: College, profile: StudentCollegeProfile, origin: GeoPoint | null): number {
  if (!profile.prefMaxDistance || profile.prefMaxDistance === 'anywhere') return 0.6 // no location preference
  // Distance-based when we know where the student is and the school has coordinates.
  const dist = collegeDistanceMi(college, origin)
  if (dist != null) {
    const maxMi = profile.prefMaxDistance === 'in_state' ? 250 : 600 // in_region
    return clamp(1 - (dist - 30) / (maxMi - 30), 0.2, 1) // full credit ≤30 mi, fading out by maxMi
  }
  // Fallback: state / region.
  if (!profile.homeState || !college.state) return 0.5
  const sameState = college.state === profile.homeState
  if (profile.prefMaxDistance === 'in_state') return sameState ? 1 : 0.15
  const sameRegion = college.region != null && regionOf(profile.homeState) === college.region
  return sameState ? 1 : sameRegion ? 0.8 : 0.3
}

function ownershipFit(college: College, profile: StudentCollegeProfile): number {
  if (!profile.prefOwnership || profile.prefOwnership === 'either') return 0.6
  if (!college.ownership) return 0.5
  const isPublic = college.ownership === 'public'
  return (profile.prefOwnership === 'public') === isPublic ? 1 : 0.35
}

/**
 * Mirrored in match_colleges' pre-rank (latest migration) — change both. Size,
 * setting, location and ownership count only when the student set them.
 */
const WEIGHTS: Record<keyof MatchDimensions, number> = {
  affordability: 0.22,
  major: 0.16,
  outcomes: 0.2,
  standing: 0.18,
  size: 0.15,
  setting: 0.15,
  location: 0.1,
  ownership: 0.05,
}

/* ─────────────────────────── reasons ─────────────────────────── */

const FIELD_LABELS: Record<string, string> = {
  computer: 'computer science',
  business_marketing: 'business',
  engineering: 'engineering',
  engineering_technology: 'engineering technology',
  health: 'health sciences',
  biological: 'biology',
  psychology: 'psychology',
  visual_performing: 'visual & performing arts',
  social_science: 'social sciences',
  education: 'education',
  communication: 'communications',
  mathematics: 'mathematics',
  physical_science: 'physical sciences',
  security_law_enforcement: 'criminal justice',
  agriculture: 'agriculture',
  parks_recreation_fitness: 'kinesiology & recreation',
}
const fieldLabel = (f: string) => FIELD_LABELS[f] ?? f.replace(/_/g, ' ')

/**
 * Each field's share of all US bachelor's degrees (NCES Digest, 2021-22, rounded).
 *
 * "Strong X program" used to fire at a 3% share, which is below the national
 * norm for most fields: UM-Flint (5% CS) and College of the Ozarks (4% CS)
 * both got "Strong computer science". A program now has to be at least 1.5x
 * the national share to earn the chip, so it means the school leans into it.
 */
// ponytail: degree share is a proxy for program strength, not a quality measure; swap in a real program signal if we get one.
const NATIONAL_FIELD_SHARE: Record<string, number> = {
  business_marketing: 0.19, health: 0.13, social_science: 0.07, psychology: 0.065,
  biological: 0.065, engineering: 0.065, computer: 0.055, visual_performing: 0.045,
  communication: 0.045, education: 0.045, parks_recreation_fitness: 0.03,
  security_law_enforcement: 0.025, agriculture: 0.02, english: 0.017,
  mathematics: 0.015, physical_science: 0.015, engineering_technology: 0.01,
}
// A field missing from the table gets the 3% floor, never a stricter bar.
const strongProgramShare = (f: string) => Math.max(0.03, 1.5 * (NATIONAL_FIELD_SHARE[f] ?? 0))

export function collegeMatchReasons(
  college: College,
  profile: StudentCollegeProfile,
  dims: MatchDimensions,
  netCents: number | null,
  band: AdmissionBand,
): string[] {
  const reasons: string[] = []

  if (netCents != null && netCents <= 0) {
    reasons.push('Free for you after aid — full need met')
  } else if (netCents != null && netCents / 100 <= 20000) {
    reasons.push(`Affordable for you — about $${Math.round(netCents / 100).toLocaleString()}/yr after aid`)
  }

  const fields = profile.intendedFields ?? []
  const progs = asRecord(college.programs)
  if (fields.length && progs) {
    // Ranked against each field's own bar, so a big field can't hide a standout small one.
    const bestField = fields
      .map((f) => ({ f, lead: (progs[f] ?? 0) / strongProgramShare(f) }))
      .sort((a, b) => b.lead - a.lead)[0]
    if (bestField && bestField.lead >= 1) reasons.push(`Strong ${fieldLabel(bestField.f)} program`)
  }

  if (band === 'open') reasons.push('Open admission — a guaranteed seat')

  if (college.institution_type === '2yr' && college.transfer_rate != null && college.transfer_rate >= 0.2) {
    reasons.push(`${Math.round(college.transfer_rate * 100)}% of students transfer on to a 4-year`)
  }

  if (college.grad_rate != null && college.grad_rate >= 0.75) {
    reasons.push(`High graduation rate (${Math.round(college.grad_rate * 100)}%)`)
  } else if (college.median_earnings_10yr_cents != null && college.median_earnings_10yr_cents / 100 >= 55000) {
    reasons.push(`Grads earn ~$${Math.round(college.median_earnings_10yr_cents / 100 / 1000)}k, 10 yrs out`)
  }

  // Setting (city, suburb, town, rural) still counts toward fit but isn't
  // shown as a reason: the chip read as a bare "city" or "suburb" tag.
  if (dims.size === 1 && profile.prefSize) reasons.push(`Matches your ${profile.prefSize}-campus preference`)

  if (dims.location === 1 && college.state) reasons.push(`Close to home (${college.state})`)

  return reasons.slice(0, 4)
}

/* ─────────────────────────── main entry ─────────────────────────── */

export function scoreCollegeForProfile(college: College, profile: StudentCollegeProfile, origin: GeoPoint | null = null): CollegeMatch {
  const netPrice = netPriceForYouCents(college, profile)
  const dimensions: MatchDimensions = {
    // An out-of-state public with no tuition on file is expensive, not average.
    affordability: netPrice == null && !netPriceApplies(college, profile) ? 0.15 : affordabilityFit(netPrice, profile),
    major: majorFit(college, profile),
    outcomes: outcomesFit(college),
    standing: standingFit(college),
    size: sizeFit(college, profile),
    setting: settingFit(college, profile),
    location: locationFit(college, profile, origin),
    ownership: ownershipFit(college, profile),
  }
  // Only what the student told us counts; unset preferences would add the same
  // neutral score to every school and flatten fit.
  const said: Record<keyof MatchDimensions, boolean> = {
    affordability: true,
    major: (profile.intendedFields ?? []).length > 0,
    outcomes: true,
    standing: true,
    size: !!profile.prefSize,
    setting: !!profile.prefSettings?.length,
    location: !!profile.prefMaxDistance && profile.prefMaxDistance !== 'anywhere',
    ownership: !!profile.prefOwnership && profile.prefOwnership !== 'either',
  }
  const active = (Object.keys(WEIGHTS) as Array<keyof MatchDimensions>).filter((k) => said[k])
  const fitScore = Math.round(
    (100 * active.reduce((sum, k) => sum + WEIGHTS[k] * dimensions[k], 0)) /
      active.reduce((sum, k) => sum + WEIGHTS[k], 0),
  )
  const { band, estAdmitPct } = admissionBand(college, profile)
  return {
    fitScore,
    band,
    estAdmitPct,
    academicGap: academicGap(college, profile, band, estAdmitPct),
    netPriceForYouCents: netPrice,
    pathway: pathwayType(college),
    reasons: collegeMatchReasons(college, profile, dimensions, netPrice, band),
    dimensions,
  }
}

/* ─────────────────────────── geo / proximity ─────────────────────────── */

export interface GeoPoint { lat: number; lng: number }

/** Great-circle distance in miles. */
export function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const R = 3958.8
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Miles from an origin (e.g. the student's ZIP centroid) to a college, or null if unknown. */
export function collegeDistanceMi(college: College, origin: GeoPoint | null): number | null {
  if (!origin || college.latitude == null || college.longitude == null) return null
  return haversineMiles(origin, { lat: college.latitude, lng: college.longitude })
}

/* ─────────────────────── similarity to the saved list ─────────────────────── */

const cosine = (a: Record<string, number>, b: Record<string, number>): number => {
  let dot = 0, na = 0, nb = 0
  for (const k in a) { na += a[k] ** 2; if (b[k] != null) dot += a[k] * b[k] }
  for (const k in b) nb += b[k] ** 2
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

/**
 * How alike two schools are, 0–1: selectivity and major mix (counted double),
 * size, graduation rate, public/private, setting and region. A trait either
 * school lacks is skipped.
 */
export function collegeSimilarity(a: College, b: College): number {
  let sum = 0
  let weight = 0
  const add = (w: number, v: number | null) => { if (v != null) { sum += w * v; weight += w } }
  add(2, a.admit_rate != null && b.admit_rate != null ? 1 - Math.abs(a.admit_rate - b.admit_rate) * 2 : null)
  const pa = asRecord(a.programs), pb = asRecord(b.programs)
  add(2, pa && pb ? cosine(pa, pb) : null)
  add(1, a.size && b.size ? 1 - Math.abs(Math.log10(a.size) - Math.log10(b.size)) : null) // 10x apart → 0
  add(1, a.grad_rate != null && b.grad_rate != null ? 1 - Math.abs(a.grad_rate - b.grad_rate) * 2 : null)
  add(1, a.ownership && b.ownership ? Number((a.ownership === 'public') === (b.ownership === 'public')) : null)
  add(0.5, a.locale && b.locale ? Number(a.locale === b.locale) : null)
  add(0.5, a.region && b.region ? Number(a.region === b.region) : null)
  return weight ? clamp(sum / weight, 0, 1) : 0
}

/**
 * The feed's order, on top of the fit shown on the card:
 *   +8 at most for a school like one the student saved;
 *   +5 for a home-state school when no distance was chosen;
 *   −8 for a school far below the student (strong students do better among peers);
 *   −10 for a four-year reporting no admissions (online and adult programs);
 *   −20 for a single-program school (⅔+ of degrees in one field) when no major is known;
 *   −100 for a long shot, so it sits below every realistic school.
 */
// ponytail: max over saved schools, no graph walk; personalized PageRank over a co-save graph once there are enough students.
export function feedRank(
  college: College,
  match: CollegeMatch,
  saved: College[],
  profile: Pick<StudentCollegeProfile, 'homeState' | 'prefMaxDistance' | 'intendedFields'> = {},
): number {
  const like = saved.reduce((m, s) => (s.id === college.id ? m : Math.max(m, collegeSimilarity(college, s))), 0)
  const boost = 8 * clamp((like - 0.7) / 0.25, 0, 1) // nothing under 0.7, full at 0.95
  const quiet = college.institution_type === '4yr' && college.admit_rate == null ? 10 : 0
  const gap = match.academicGap === 'long_shot' ? 100 : match.academicGap === 'far_below' ? 8 : 0
  const progs = asRecord(college.programs)
  const singleProgram = !profile.intendedFields?.length && !!progs && Math.max(0, ...Object.values(progs)) >= 2 / 3 ? 20 : 0
  const anywhere = !profile.prefMaxDistance || profile.prefMaxDistance === 'anywhere'
  const home = anywhere && !!profile.homeState && college.state === profile.homeState ? 5 : 0
  return match.fitScore + boost - quiet - gap - singleProgram + home
}

/* ─────────────────────── transfer pairing + nudge ─────────────────────── */

/** Given a 4-year target, pick the best community college near the student to start at. */
export function suggestTransferPath(
  target: College,
  communityColleges: College[],
  profile: StudentCollegeProfile,
  origin: GeoPoint | null = null,
): TransferPath | null {
  const twoYr = communityColleges.filter(isCommunityCollege)
  const inState = profile.homeState ? twoYr.filter((c) => c.state === profile.homeState) : twoYr
  let pool = inState.length ? inState : twoYr
  if (!pool.length) return null
  // If we know where the student is, prefer schools within ~60 miles (fall back to all).
  if (origin) {
    const near = pool.filter((c) => (collegeDistanceMi(c, origin) ?? Infinity) <= 60)
    if (near.length) pool = near
  }
  const best = pool
    .map((c) => ({ c, score: (c.transfer_rate ?? 0) * 2 + affordabilityFit(netPriceForYouCents(c, profile), profile) }))
    .sort((a, b) => b.score - a.score)[0].c
  return {
    communityCollege: best,
    target,
    transferRate: best.transfer_rate,
    netPriceForYouCents: netPriceForYouCents(best, profile),
    note: `Start at ${best.name}, then transfer to ${target.name} — a lower-cost, lower-risk route to the same degree. Verify the transfer agreement before you enroll.`,
  }
}

/** Always-on nudge: the nearest affordable, strong-transfer community colleges. */
export function pickAffordableAlternatives(
  colleges: College[],
  profile: StudentCollegeProfile,
  n = 1,
  origin: GeoPoint | null = null,
): College[] {
  const twoYr = colleges.filter(isCommunityCollege)
  const inState = profile.homeState ? twoYr.filter((c) => c.state === profile.homeState) : twoYr
  const pool = inState.length ? inState : twoYr
  return pool
    .map((c) => ({ c, dist: collegeDistanceMi(c, origin) ?? Infinity, net: netPriceForYouCents(c, profile) ?? Infinity, tr: c.transfer_rate ?? 0 }))
    // When we know the student's location, nearest first; otherwise cheapest / best-transfer.
    .sort((a, b) => (origin ? a.dist - b.dist : 0) || a.net - b.net || b.tr - a.tr)
    .slice(0, n)
    .map((x) => x.c)
}

/* ─────────────────────────── formatting ─────────────────────────── */

export function formatNetPrice(cents: number | null): string {
  if (cents == null) return 'Net price varies — run the calculator'
  if (cents <= 0) return 'Free for you after aid'
  return `~$${Math.round(cents / 100).toLocaleString()}/yr after aid`
}

/* ─────────────────────── onboarding prefs → profile ─────────────────────── */

/** The onboarding answers, persisted to settings.module_data['Application Tracking'].collegePrefs. */
export interface CollegePrefs {
  homeState: string | null
  intendedFields: string[]
  satTotal: number | null
  act: number | null
  prefSize: 'small' | 'medium' | 'large' | null
  prefSettings: Array<'city' | 'suburb' | 'town' | 'rural'>
  prefOwnership: 'public' | 'private' | 'either'
  prefMaxDistance: 'in_state' | 'in_region' | 'anywhere'
  openToTransfer: boolean
  openToTrade: boolean
  completed: boolean
}

export const DEFAULT_COLLEGE_PREFS: CollegePrefs = {
  homeState: null,
  intendedFields: [],
  satTotal: null,
  act: null,
  prefSize: null,
  prefSettings: [],
  prefOwnership: 'either',
  prefMaxDistance: 'anywhere',
  openToTransfer: true, // default nudge: always consider an affordable transfer path
  openToTrade: false,
  completed: false,
}

// Local, dependency-free parsers (mirror fafsaData's, kept here so the engine stays pure).
function parseGpaStr(gpa: string | null | undefined): number | null {
  if (!gpa) return null
  const m = gpa.match(/\d+(\.\d+)?/)
  if (!m) return null
  const v = parseFloat(m[0])
  return isNaN(v) || v < 0 || v > 6 ? null : v
}
function parseIncomeCents(level: string | null | undefined): number | null {
  if (!level) return null
  const nums = (level.match(/[\d,]+/g) ?? []).map((n) => parseInt(n.replace(/,/g, ''), 10)).filter((n) => !isNaN(n))
  if (nums.length === 0) return null
  let dollars: number
  if (nums.length >= 2) dollars = (nums[0] + nums[1]) / 2
  else if (/^\s*(under|less|below|<)/i.test(level)) dollars = nums[0] / 2
  else dollars = nums[0]
  return Math.round(dollars * 100)
}

/** Merge the student's existing profile (GPA, income) with onboarding prefs into the engine input. */
export function buildStudentProfile(
  demographics: { gpa?: string | null; income_level?: string | null; gender?: string | null } | null | undefined,
  prefs: CollegePrefs,
): StudentCollegeProfile {
  return {
    gender: demographics?.gender || null,
    gpa: parseGpaStr(demographics?.gpa),
    satTotal: prefs.satTotal,
    act: prefs.act,
    // Major is no longer asked. Ignore one saved before the question was
    // removed, or it would shape matches with no way to change it.
    intendedFields: [],
    familyIncomeCents: parseIncomeCents(demographics?.income_level),
    homeState: prefs.homeState,
    prefSize: prefs.prefSize,
    prefSettings: prefs.prefSettings.length ? prefs.prefSettings : null,
    prefOwnership: prefs.prefOwnership,
    prefMaxDistance: prefs.prefMaxDistance,
    openToTransfer: prefs.openToTransfer,
    openToTrade: prefs.openToTrade,
  }
}
