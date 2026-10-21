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
 * Schools the ranked feed never volunteers. Name search still finds them.
 *   - Territory schools (mostly Puerto Rico, often Spanish-language), unless
 *     the student lives in a territory.
 *   - For-profit four-years. They report outcomes but no admissions, and a
 *     cheap online program kept outranking real options for students who never
 *     asked for one (Strayer, American Public University).
 *   - Four-years graduating under 25% of students, unless graduation plus
 *     transfer-out reaches 40%. Completion predicts a student's own odds of
 *     finishing better than price does, and cheap low-completion schools
 *     were outranking everything (Wilberforce, 12%). The transfer allowance
 *     keeps branch campuses whose students move on to the main campus
 *     (Penn State Altoona: 17% graduate, 45% transfer).
 * Trade schools are left alone: most career colleges are for-profit.
 */
export const leftOutOfFeed = (college: College, homeState: string | null | undefined): boolean =>
  (regionOf(college.state) === 'Territories' && regionOf(homeState) !== 'Territories') ||
  (college.institution_type === '4yr' && college.ownership === 'private_forprofit') ||
  (college.institution_type === '4yr' && college.grad_rate != null && college.grad_rate < 0.25 &&
    college.grad_rate + (college.transfer_rate ?? 0) < 0.4)

/**
 * Fit order with reaches spread out: at most one reach in each run of four.
 * Fit ignores admission odds on purpose, so a strong student's fit order is
 * wall-to-wall Ivies. Reaches keep their order and fill in as the list runs
 * out of anything else.
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
 * one error worth being blunt about, and there is nothing better to put in
 * its place: 21 of 595 public four-years have an out-of-state cost on file.
 * So we report no price, which the UI already has an honest state for.
 *
 * Private schools charge the same either way. An unknown home state cannot
 * rule a price out, so the figure stands.
 */
function netPriceApplies(college: College, profile: StudentCollegeProfile): boolean {
  if (college.ownership !== 'public') return true
  if (!profile.homeState || !college.state) return true
  return college.state === profile.homeState
}

/** Net price for THIS student's income bracket, falling back to the school average. */
export function netPriceForYouCents(college: College, profile: StudentCollegeProfile): number | null {
  if (!netPriceApplies(college, profile)) return null
  const bracket = incomeBracketFromCents(profile.familyIncomeCents)
  const byIncome = asRecord(college.net_price_by_income)
  if (bracket && byIncome && byIncome[bracket] != null) return byIncome[bracket]
  return college.avg_net_price_cents ?? null
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
export function isAffordableForYou(netCents: number | null, profile: StudentCollegeProfile): boolean {
  if (netCents == null) return false
  const bracket = incomeBracketFromCents(profile.familyIncomeCents)
  return netCents <= (bracket ? AFFORDABLE_CAP_CENTS[bracket] : 1_500_000)
}

/** True when the net price for this student comes from their income bracket, not the school average. */
export function hasIncomeNetPrice(college: College, profile: StudentCollegeProfile): boolean {
  if (!netPriceApplies(college, profile)) return false
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
 * Where the student's SAT (or ACT) sits in a school's middle 50%, in half-widths:
 * -1 is the 25th percentile, 0 the midpoint, +1 the 75th. Null without scores.
 */
function testPosition(college: College, profile: StudentCollegeProfile): number | null {
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
  return null
}

/** Student's academic standing vs a school's admitted class: -1 (well below) … +1 (well above), or null. */
function academicPosition(college: College, profile: StudentCollegeProfile): number | null {
  const z = testPosition(college, profile)
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
  const pos = academicPosition(college, profile)
  let chance = college.admit_rate
  if (pos != null) chance = clamp(college.admit_rate * (1 + pos * 0.8), 0.01, 0.98)
  return { band: bandFor(college.admit_rate, testPosition(college, profile), chance), estAdmitPct: Math.round(chance * 100) }
}

/**
 * The counselor's rule rather than a made-up probability. The old estimate
 * roughly halved the admit rate for a student at the 25th percentile, so a
 * student squarely inside a 55%-admit school's range read as a reach.
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

export const BAND_META: Record<AdmissionBand, { label: string; tone: 'positive' | 'neutral' | 'aspirational'; blurb: string }> = {
  open: { label: 'Open admission', tone: 'positive', blurb: 'Admits all eligible applicants — you can enroll.' },
  likely: { label: 'Likely', tone: 'positive', blurb: 'Your profile is strong for this school.' },
  target: { label: 'Target', tone: 'neutral', blurb: 'A solid match for your profile — worth applying.' },
  reach: { label: 'Reach', tone: 'aspirational', blurb: 'A stretch worth taking — aim high.' },
  unknown: { label: 'Admission varies', tone: 'neutral', blurb: 'This school hasn’t reported admissions data — check its site for requirements.' },
}

/* ─────────────────────────── fit dimensions ─────────────────────────── */

function affordabilityFit(netCents: number | null): number {
  if (netCents == null) return 0.5
  const dollars = netCents / 100
  return clamp(1 - (dollars - 5000) / (35000 - 5000), 0, 1) // ≤$5k → 1, ≥$35k → 0
}

function majorFit(college: College, profile: StudentCollegeProfile): number {
  const fields = profile.intendedFields ?? []
  if (fields.length === 0) return 0.7 // no stated major → don't penalize
  const progs = asRecord(college.programs)
  if (!progs) return 0.4
  const best = Math.max(0, ...fields.map((f) => progs[f] ?? 0))
  if (best === 0) return 0.15 // school doesn't meaningfully offer the intended field
  // Against each field's national norm, so 20% business (ordinary) no longer
  // outscores 12% CS (a standout). Full credit where the "Strong" chip shows.
  const lead = Math.max(...fields.map((f) => (progs[f] ?? 0) / strongProgramShare(f)))
  return clamp(0.5 + 0.5 * lead, 0.5, 1)
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
 * Mirrored in the match_colleges RPC's pre-rank (latest supabase migration) --
 * change both. Outcomes carry more than they used to: at 15% a cheap school
 * where most students take your major outranked everything, whatever its
 * graduation rate, which filled a business student's feed with 20%-completion
 * schools.
 */
const WEIGHTS: Record<keyof MatchDimensions, number> = {
  affordability: 0.25,
  major: 0.18,
  outcomes: 0.22,
  size: 0.1,
  setting: 0.1,
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
const strongProgramShare = (f: string) => Math.max(0.03, 1.5 * (NATIONAL_FIELD_SHARE[f] ?? 0.03))

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

  if (dims.size === 1 && profile.prefSize) reasons.push(`Matches your ${profile.prefSize}-campus preference`)
  else if (dims.setting === 1 && college.locale) reasons.push(`In your preferred ${college.locale} setting`)

  if (dims.location === 1 && college.state) reasons.push(`Close to home (${college.state})`)

  return reasons.slice(0, 4)
}

/* ─────────────────────────── main entry ─────────────────────────── */

export function scoreCollegeForProfile(college: College, profile: StudentCollegeProfile, origin: GeoPoint | null = null): CollegeMatch {
  const netPrice = netPriceForYouCents(college, profile)
  const dimensions: MatchDimensions = {
    // No price for an out-of-state public means it's priced at out-of-state
    // tuition, the dearest option a student has -- not an average one.
    affordability: netPrice == null && !netPriceApplies(college, profile) ? 0.15 : affordabilityFit(netPrice),
    major: majorFit(college, profile),
    outcomes: outcomesFit(college),
    size: sizeFit(college, profile),
    setting: settingFit(college, profile),
    location: locationFit(college, profile, origin),
    ownership: ownershipFit(college, profile),
  }
  const fitScore = Math.round(
    100 *
      (Object.keys(WEIGHTS) as Array<keyof MatchDimensions>).reduce(
        (sum, k) => sum + WEIGHTS[k] * dimensions[k],
        0,
      ),
  )
  const { band, estAdmitPct } = admissionBand(college, profile)
  return {
    fitScore,
    band,
    estAdmitPct,
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
    .map((c) => ({ c, score: (c.transfer_rate ?? 0) * 2 + affordabilityFit(netPriceForYouCents(c, profile)) }))
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

/** Intended-field options offered in onboarding (Scorecard program key → friendly label). */
export const INTENDED_FIELD_OPTIONS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'engineering', label: 'Engineering' },
  { key: 'computer', label: 'Computer Science' },
  { key: 'business_marketing', label: 'Business' },
  { key: 'health', label: 'Health & Nursing' },
  { key: 'biological', label: 'Biology' },
  { key: 'psychology', label: 'Psychology' },
  { key: 'social_science', label: 'Social Sciences' },
  { key: 'visual_performing', label: 'Arts & Performance' },
  { key: 'education', label: 'Education' },
  { key: 'communication', label: 'Communications' },
  { key: 'engineering_technology', label: 'Engineering Tech' },
  { key: 'mathematics', label: 'Math & Statistics' },
  { key: 'physical_science', label: 'Physical Sciences' },
  { key: 'security_law_enforcement', label: 'Criminal Justice' },
  { key: 'english', label: 'English & Writing' },
  { key: 'agriculture', label: 'Agriculture' },
  { key: 'architecture', label: 'Architecture' },
  { key: 'parks_recreation_fitness', label: 'Kinesiology & Sports' },
  { key: 'personal_culinary', label: 'Culinary & Personal Services' },
  { key: 'legal', label: 'Legal & Paralegal' },
]

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
  demographics: { gpa?: string | null; income_level?: string | null } | null | undefined,
  prefs: CollegePrefs,
): StudentCollegeProfile {
  return {
    gpa: parseGpaStr(demographics?.gpa),
    satTotal: prefs.satTotal,
    act: prefs.act,
    intendedFields: prefs.intendedFields,
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
