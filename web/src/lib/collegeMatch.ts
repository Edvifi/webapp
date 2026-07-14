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
export type AdmissionBand = 'open' | 'likely' | 'target' | 'reach'
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

export function incomeBracketFromCents(cents?: number | null): IncomeBracket | null {
  if (cents == null) return null
  const d = cents / 100
  if (d <= 30000) return '0_30k'
  if (d <= 48000) return '30k_48k'
  if (d <= 75000) return '48k_75k'
  if (d <= 110000) return '75k_110k'
  return '110k_plus'
}

/** Net price for THIS student's income bracket, falling back to the school average. */
export function netPriceForYouCents(college: College, profile: StudentCollegeProfile): number | null {
  const bracket = incomeBracketFromCents(profile.familyIncomeCents)
  const byIncome = asRecord(college.net_price_by_income)
  if (bracket && byIncome && byIncome[bracket] != null) return byIncome[bracket]
  return college.avg_net_price_cents ?? null
}

export function sizeBucket(size: number | null): 'small' | 'medium' | 'large' | null {
  if (size == null) return null
  if (size < 3000) return 'small'
  if (size <= 12000) return 'medium'
  return 'large'
}

export function pathwayType(college: College): PathwayType {
  if (college.institution_type === '2yr') return 'community_transfer'
  if (college.institution_type === 'trade') return 'career_technical'
  return '4yr_direct'
}

/** Only 4yr / 2yr / trade schools are undergrad-seeker targets (excludes grad-only, etc.). */
export const isUndergradTarget = (college: College): boolean =>
  college.institution_type === '4yr' || college.institution_type === '2yr' || college.institution_type === 'trade'

/* ─────────────────────────── admission band ─────────────────────────── */

/** Student's academic standing vs a school's admitted class: -1 (well below) … +1 (well above), or null. */
function academicPosition(college: College, profile: StudentCollegeProfile): number | null {
  const satMid25 =
    college.sat_reading_25 != null && college.sat_math_25 != null ? college.sat_reading_25 + college.sat_math_25 : null
  const satMid75 =
    college.sat_reading_75 != null && college.sat_math_75 != null ? college.sat_reading_75 + college.sat_math_75 : null
  if (profile.satTotal != null && satMid25 != null && satMid75 != null && satMid75 > satMid25) {
    const mid = (satMid25 + satMid75) / 2
    const half = (satMid75 - satMid25) / 2
    return clamp((profile.satTotal - mid) / half, -1.5, 1.5) / 1.5
  }
  if (profile.act != null && college.act_25 != null && college.act_75 != null && college.act_75 > college.act_25) {
    const mid = (college.act_25 + college.act_75) / 2
    const half = (college.act_75 - college.act_25) / 2
    return clamp((profile.act - mid) / half, -1.5, 1.5) / 1.5
  }
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
  if (college.admit_rate == null) return { band: 'open', estAdmitPct: null } // open admission
  const pos = academicPosition(college, profile)
  let chance = college.admit_rate
  if (pos != null) chance = clamp(college.admit_rate * (1 + pos * 0.8), 0.01, 0.98)
  const band: AdmissionBand = chance >= 0.55 ? 'likely' : chance >= 0.25 ? 'target' : 'reach'
  return { band, estAdmitPct: Math.round(chance * 100) }
}

export const BAND_META: Record<AdmissionBand, { label: string; tone: 'positive' | 'neutral' | 'aspirational'; blurb: string }> = {
  open: { label: 'Open admission', tone: 'positive', blurb: 'Admits all eligible applicants — you can enroll.' },
  likely: { label: 'Likely', tone: 'positive', blurb: 'Your profile is strong for this school.' },
  target: { label: 'Target', tone: 'neutral', blurb: 'A solid match for your profile — worth applying.' },
  reach: { label: 'Reach', tone: 'aspirational', blurb: 'A stretch worth taking — aim high.' },
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
  return clamp(0.5 + best * 3.5, 0.5, 1) // share 0.02 → ~0.57, 0.15+ → 1
}

function outcomesFit(college: College): number {
  const parts: number[] = []
  if (college.grad_rate != null) parts.push(clamp(college.grad_rate, 0, 1))
  if (college.median_earnings_10yr_cents != null)
    parts.push(clamp((college.median_earnings_10yr_cents / 100 - 25000) / (75000 - 25000), 0, 1))
  if (parts.length === 0) return 0.5
  return parts.reduce((a, b) => a + b, 0) / parts.length
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

function locationFit(college: College, profile: StudentCollegeProfile): number {
  if (!profile.homeState || !profile.prefMaxDistance || profile.prefMaxDistance === 'anywhere') return 0.6
  if (!college.state) return 0.5
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

const WEIGHTS: Record<keyof MatchDimensions, number> = {
  affordability: 0.28,
  major: 0.22,
  outcomes: 0.15,
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
    const bestField = fields
      .map((f) => ({ f, share: progs[f] ?? 0 }))
      .sort((a, b) => b.share - a.share)[0]
    if (bestField && bestField.share >= 0.03) reasons.push(`Strong ${fieldLabel(bestField.f)} program`)
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

export function scoreCollegeForProfile(college: College, profile: StudentCollegeProfile): CollegeMatch {
  const netPrice = netPriceForYouCents(college, profile)
  const dimensions: MatchDimensions = {
    affordability: affordabilityFit(netPrice),
    major: majorFit(college, profile),
    outcomes: outcomesFit(college),
    size: sizeFit(college, profile),
    setting: settingFit(college, profile),
    location: locationFit(college, profile),
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

/* ─────────────────────── transfer pairing + nudge ─────────────────────── */

/** Given a 4-year target, pick the best community college in the student's state to start at. */
export function suggestTransferPath(
  target: College,
  communityColleges: College[],
  profile: StudentCollegeProfile,
): TransferPath | null {
  const twoYr = communityColleges.filter((c) => c.institution_type === '2yr')
  const inState = profile.homeState ? twoYr.filter((c) => c.state === profile.homeState) : twoYr
  const pool = inState.length ? inState : twoYr
  if (!pool.length) return null
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

/** Always-on nudge: cheapest, strongest-transfer community colleges near the student. */
export function pickAffordableAlternatives(
  colleges: College[],
  profile: StudentCollegeProfile,
  n = 1,
): College[] {
  const twoYr = colleges.filter((c) => c.institution_type === '2yr')
  const inState = profile.homeState ? twoYr.filter((c) => c.state === profile.homeState) : twoYr
  const pool = inState.length ? inState : twoYr
  return pool
    .map((c) => ({ c, net: netPriceForYouCents(c, profile) ?? Infinity, tr: c.transfer_rate ?? 0 }))
    .sort((a, b) => a.net - b.net || b.tr - a.tr)
    .slice(0, n)
    .map((x) => x.c)
}

/* ─────────────────────────── formatting ─────────────────────────── */

export function formatNetPrice(cents: number | null): string {
  if (cents == null) return 'Net price varies — run the calculator'
  if (cents <= 0) return 'Free for you after aid'
  return `~$${Math.round(cents / 100).toLocaleString()}/yr after aid`
}
