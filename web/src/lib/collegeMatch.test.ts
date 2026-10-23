import { describe, it, expect } from 'vitest'
import {
  incomeBracketFromCents,
  netPriceForYouCents,
  hasIncomeNetPrice,
  admissionBand,
  scoreCollegeForProfile,
  pathwayType,
  isUndergradTarget,
  isCommunityCollege,
  suggestTransferPath,
  pickAffordableAlternatives,
  leftOutOfFeed,
  spreadReaches,
  collegeSimilarity,
  feedRank,
  standingFit,
  isAffordableForYou,
  regionOf,
  searchRegionOf,
  SEARCH_REGIONS,
  formatNetPrice,
  haversineMiles,
  collegeDistanceMi,
  buildStudentProfile,
  DEFAULT_COLLEGE_PREFS,
  INTENDED_FIELD_OPTIONS,
  type College,
  type StudentCollegeProfile,
  type CollegePrefs,
} from './collegeMatch'

/* a College row factory with sane defaults; override per-test */
function mk(over: Partial<College> = {}): College {
  return {
    id: 'id-' + (over.scorecard_id ?? 1),
    scorecard_id: 1,
    name: 'Test University',
    slug: 'test_university',
    institution_type: '4yr',
    city: 'Testville',
    state: 'CA',
    region: 'West',
    ownership: 'public',
    locale: 'city',
    latitude: null,
    longitude: null,
    size: 8000,
    admit_rate: 0.5,
    sat_reading_25: 550,
    sat_reading_75: 650,
    sat_math_25: 560,
    sat_math_75: 660,
    act_25: 24,
    act_75: 30,
    avg_net_price_cents: 1500000,
    net_price_by_income: null,
    cost_of_attendance_cents: 3000000,
    programs: null,
    grad_rate: 0.7,
    transfer_rate: null,
    median_earnings_10yr_cents: 5000000,
    pell_pct: 0.3,
    npc_url: null,
    url: null,
    source: 'scorecard',
    status: 'published',
    last_seen_at: '2026-01-01T00:00:00Z',
    raw: null,
    verified_at: '2026-01-01T00:00:00Z',
    student_body: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    // Curated editorial fields, null unless a test opts in.
    cost_out_of_state_cents: null,
    legacy_slug: null,
    emoji: null,
    early_action: null,
    early_decision: null,
    regular_decision: null,
    fafsa_priority: null,
    css_profile: null,
    aid_notification: null,
    meets_full_need: null,
    no_loan_policy: null,
    curated_at: null,
    aid_guarantee: null, aid_guarantee_detail: null, aid_guarantee_needs_css: null, aid_guarantee_residents: null, aid_guarantee_action: null, aid_guarantee_url: null, aid_guarantee_checked_on: null,
    application_fee_cents: null,
    fee_waiver_policy: null,
    fees_verified_at: null,
    carnegie_basic: null,
    ...over,
  }
}

describe('incomeBracketFromCents', () => {
  it('maps dollars to the right bracket', () => {
    expect(incomeBracketFromCents(20000_00)).toBe('0_30k')
    expect(incomeBracketFromCents(30000_00)).toBe('0_30k')
    expect(incomeBracketFromCents(40000_00)).toBe('30k_48k')
    expect(incomeBracketFromCents(60000_00)).toBe('48k_75k')
    expect(incomeBracketFromCents(100000_00)).toBe('75k_110k')
    expect(incomeBracketFromCents(200000_00)).toBe('110k_plus')
    expect(incomeBracketFromCents(null)).toBeNull()
  })
})

describe('netPriceForYouCents', () => {
  it('uses the student income bracket when available', () => {
    const c = mk({ net_price_by_income: { '0_30k': 800000, '110k_plus': 2500000 }, avg_net_price_cents: 1500000 })
    expect(netPriceForYouCents(c, { familyIncomeCents: 20000_00 })).toBe(800000)
    expect(netPriceForYouCents(c, { familyIncomeCents: 200000_00 })).toBe(2500000)
  })
  it('falls back to the school average when bracket missing', () => {
    const c = mk({ net_price_by_income: { '0_30k': 800000 }, avg_net_price_cents: 1500000 })
    expect(netPriceForYouCents(c, { familyIncomeCents: 200000_00 })).toBe(1500000)
    expect(netPriceForYouCents(c, {})).toBe(1500000)
  })

  // A public school's stored net price is its in-state figure. Reporting it to
  // an out-of-state student understates the cost by the residency gap, and
  // ranks the school as cheap on a price they cannot be charged.
  it('reports no price for a public school outside the student home state', () => {
    const umich = mk({ ownership: 'public', state: 'MI', avg_net_price_cents: 1313800 })
    expect(netPriceForYouCents(umich, { homeState: 'CA' })).toBeNull()
    expect(hasIncomeNetPrice(umich, { homeState: 'CA', familyIncomeCents: 20000_00 })).toBe(false)
    expect(netPriceForYouCents(umich, { homeState: 'MI' })).toBe(1313800)
  })

  it('keeps the price for a private school, and when the home state is unknown', () => {
    const priv = mk({ ownership: 'private_nonprofit', state: 'MA', avg_net_price_cents: 1906600 })
    expect(netPriceForYouCents(priv, { homeState: 'CA' })).toBe(1906600)
    // No home state on file cannot rule a price out, so the figure stands.
    expect(netPriceForYouCents(mk({ ownership: 'public', state: 'MI' }), {})).toBe(1500000)
  })
})

describe('outcomes scoring', () => {
  // The bug this exists to prevent: a school reporting a 100% graduation rate
  // and nothing else scored a perfect 1.000 because the average ran over only
  // the fields present, which put a 118-student seminary on the second card of
  // the feed, above Princeton. Reporting less must never score higher.
  it('does not let partial data outscore complete data', () => {
    const partial = mk({ grad_rate: 1, median_earnings_10yr_cents: null })
    const complete = mk({ grad_rate: 0.95, median_earnings_10yr_cents: 12900000 })
    const o = (c: College) => scoreCollegeForProfile(c, {}).dimensions.outcomes
    expect(o(partial)).toBeLessThan(o(complete))
    expect(o(partial)).toBeLessThan(1)
  })

  it('still treats a school with no outcome data at all as neutral', () => {
    const none = mk({ grad_rate: null, median_earnings_10yr_cents: null })
    expect(scoreCollegeForProfile(none, {}).dimensions.outcomes).toBe(0.5)
  })
})

describe('admissionBand', () => {
  it('null admit_rate is "open" for 2yr/trade but "unknown" for a 4-year (no false guarantee)', () => {
    expect(admissionBand(mk({ admit_rate: null, institution_type: '2yr' }), {}).band).toBe('open')
    expect(admissionBand(mk({ admit_rate: null, institution_type: 'trade' }), {}).band).toBe('open')
    expect(admissionBand(mk({ admit_rate: null, institution_type: '4yr' }), {}).band).toBe('unknown')
    expect(admissionBand(mk({ admit_rate: null, institution_type: '4yr' }), {}).estAdmitPct).toBeNull()
  })
  it('strong student at a moderately selective school → likely/target, not reach', () => {
    const c = mk({ admit_rate: 0.6 })
    const strong: StudentCollegeProfile = { satTotal: 1400, gpa: 3.9 }
    expect(['likely', 'target']).toContain(admissionBand(c, strong).band)
  })
  it('weak student at a highly selective school → reach', () => {
    const c = mk({ admit_rate: 0.05, sat_reading_25: 720, sat_reading_75: 780, sat_math_25: 730, sat_math_75: 790 })
    const weak: StudentCollegeProfile = { satTotal: 1100, gpa: 3.0 }
    expect(admissionBand(c, weak).band).toBe('reach')
  })
  // Default school: 50% admitted, SAT middle 50% is 1110-1310.
  it('a student inside the middle 50% is a target, not a reach', () => {
    expect(admissionBand(mk({ admit_rate: 0.55 }), { satTotal: 1120 }).band).toBe('target')
  })
  it('below the 25th percentile is a reach unless the school takes most applicants', () => {
    expect(admissionBand(mk(), { satTotal: 1050 }).band).toBe('reach')
    expect(admissionBand(mk({ admit_rate: 0.8 }), { satTotal: 1050 }).band).toBe('target')
  })
  it('above the 75th percentile at a school taking 40%+ is likely', () => {
    expect(admissionBand(mk(), { satTotal: 1350 }).band).toBe('likely')
    expect(admissionBand(mk({ admit_rate: 0.3 }), { satTotal: 1350 }).band).toBe('target')
  })
  it('places a GPA-only student in the school\'s score range, not just its admit rate', () => {
    const ohioState = mk({ admit_rate: 0.61, sat_reading_25: 650, sat_math_25: 660, sat_reading_75: 730, sat_math_75: 750 })
    const regional = mk({ admit_rate: 0.44, sat_reading_25: 450, sat_math_25: 440, sat_reading_75: 550, sat_math_75: 540 })
    expect(admissionBand(ohioState, { gpa: 2.6 }).band).toBe('reach')
    expect(admissionBand(regional, { gpa: 2.8 }).band).toBe('target')
  })
  it('under 15% admitted is a reach even with top scores', () => {
    expect(admissionBand(mk({ admit_rate: 0.12 }), { satTotal: 1600 }).band).toBe('reach')
  })
  it('above-median scores raise the estimated chance', () => {
    const c = mk({ admit_rate: 0.4 })
    const above = admissionBand(c, { satTotal: 1500 }).estAdmitPct!
    const below = admissionBand(c, { satTotal: 1000 }).estAdmitPct!
    expect(above).toBeGreaterThan(below)
  })
})

describe('scoreCollegeForProfile', () => {
  it('produces a fit score in [0,100]', () => {
    const m = scoreCollegeForProfile(mk(), {})
    expect(m.fitScore).toBeGreaterThanOrEqual(0)
    expect(m.fitScore).toBeLessThanOrEqual(100)
  })
  it('an affordable school outscores an expensive one, all else equal', () => {
    const cheap = mk({ avg_net_price_cents: 500000 })
    const pricey = mk({ avg_net_price_cents: 4000000 })
    expect(scoreCollegeForProfile(cheap, {}).fitScore).toBeGreaterThan(scoreCollegeForProfile(pricey, {}).fitScore)
  })
  it('rewards a school that offers the intended major', () => {
    const withMajor = mk({ programs: { engineering: 0.2 } })
    const withoutMajor = mk({ programs: { history: 0.2 } })
    const p: StudentCollegeProfile = { intendedFields: ['engineering'] }
    expect(scoreCollegeForProfile(withMajor, p).fitScore).toBeGreaterThan(scoreCollegeForProfile(withoutMajor, p).fitScore)
  })
  it('surfaces affordability and open-admission reasons', () => {
    const c = mk({ admit_rate: null, institution_type: '2yr', avg_net_price_cents: 300000, transfer_rate: 0.3 })
    const m = scoreCollegeForProfile(c, { familyIncomeCents: 20000_00 })
    expect(m.reasons.join(' ')).toMatch(/Affordable for you/)
    expect(m.reasons.join(' ')).toMatch(/Open admission/)
    expect(m.pathway).toBe('community_transfer')
  })
})

describe('pathwayType & isUndergradTarget', () => {
  it('only PUBLIC 2yr are community colleges; for-profit "2yr" fall under trade/career', () => {
    expect(pathwayType(mk({ institution_type: '4yr' }))).toBe('4yr_direct')
    expect(pathwayType(mk({ institution_type: '2yr', ownership: 'public' }))).toBe('community_transfer')
    expect(pathwayType(mk({ institution_type: '2yr', ownership: 'private_forprofit' }))).toBe('career_technical')
    expect(pathwayType(mk({ institution_type: 'trade' }))).toBe('career_technical')
    expect(isCommunityCollege(mk({ institution_type: '2yr', ownership: 'public' }))).toBe(true)
    expect(isCommunityCollege(mk({ institution_type: '2yr', ownership: 'private_forprofit' }))).toBe(false)
  })
  it('excludes grad-only / other from undergrad targets', () => {
    expect(isUndergradTarget(mk({ institution_type: '4yr' }))).toBe(true)
    expect(isUndergradTarget(mk({ institution_type: 'grad' }))).toBe(false)
    expect(isUndergradTarget(mk({ institution_type: 'other' }))).toBe(false)
  })
})

describe('suggestTransferPath', () => {
  it('pairs an in-state, high-transfer community college with the target', () => {
    const target = mk({ scorecard_id: 100, name: 'Dream U', admit_rate: 0.08, institution_type: '4yr' })
    const ccs: College[] = [
      mk({ scorecard_id: 2, name: 'Far CC', institution_type: '2yr', state: 'NY', transfer_rate: 0.4, avg_net_price_cents: 200000 }),
      mk({ scorecard_id: 3, name: 'Local CC', institution_type: '2yr', state: 'CA', transfer_rate: 0.35, avg_net_price_cents: 250000 }),
      mk({ scorecard_id: 4, name: 'Local Pricey CC', institution_type: '2yr', state: 'CA', transfer_rate: 0.1, avg_net_price_cents: 900000 }),
    ]
    const path = suggestTransferPath(target, ccs, { homeState: 'CA' })
    expect(path).not.toBeNull()
    expect(path!.communityCollege.name).toBe('Local CC')
    expect(path!.target.name).toBe('Dream U')
    expect(path!.note).toMatch(/transfer to Dream U/)
  })
  it('returns null when there are no community colleges', () => {
    expect(suggestTransferPath(mk(), [mk({ institution_type: '4yr' })], {})).toBeNull()
  })
})

describe('profile-fit ranking', () => {
  it('scores only what the student told us, so unset preferences don\'t flatten fit', () => {
    // Cheap, well-regarded, strong outcomes, no preferences set: nothing should hold it at "Good".
    const c = mk({ avg_net_price_cents: 400_000, grad_rate: 0.95, median_earnings_10yr_cents: 8_000_000,
      carnegie_basic: 15, admit_rate: 0.1, sat_reading_25: 700, sat_math_25: 720, sat_reading_75: 770, sat_math_75: 800 })
    expect(scoreCollegeForProfile(c, {}).fitScore).toBeGreaterThanOrEqual(95)
    // A stated preference still counts: the wrong size lowers fit.
    expect(scoreCollegeForProfile(mk({ ...c, size: 30000 }), { prefSize: 'small' }).fitScore)
      .toBeLessThan(scoreCollegeForProfile(c, {}).fitScore)
  })
  it('an out-of-state public scores as expensive, not average', () => {
    const oos = scoreCollegeForProfile(mk({ state: 'MI' }), { homeState: 'CA' }).dimensions.affordability
    expect(oos).toBeLessThan(0.5)
  })
  it('scores the major against its national norm', () => {
    const p: StudentCollegeProfile = { intendedFields: ['business_marketing'] }
    const bizCs: StudentCollegeProfile = { intendedFields: ['computer'] }
    // 20% business is ordinary; 12% CS stands out.
    expect(scoreCollegeForProfile(mk({ programs: { computer: 0.12 } }), bizCs).dimensions.major)
      .toBeGreaterThan(scoreCollegeForProfile(mk({ programs: { business_marketing: 0.2 } }), p).dimensions.major)
  })
  it('keeps territory schools out of a mainland student\'s feed', () => {
    expect(leftOutOfFeed(mk({ state: 'PR' }), 'CA')).toBe(true)
    expect(leftOutOfFeed(mk({ state: 'PR' }), 'PR')).toBe(false)
    expect(leftOutOfFeed(mk({ state: 'CA' }), 'CA')).toBe(false)
  })
  it('keeps the service academies out', () => {
    expect(leftOutOfFeed(mk({ scorecard_id: 197027 }), 'NY')).toBe(true) // Merchant Marine
  })
  it('keeps for-profit four-years out, but not for-profit trade schools', () => {
    expect(leftOutOfFeed(mk({ ownership: 'private_forprofit' }), 'CA')).toBe(true)
    expect(leftOutOfFeed(mk({ ownership: 'private_forprofit', institution_type: 'trade' }), 'CA')).toBe(false)
  })
  it('leaves out four-years that rarely graduate students, but not feeder campuses', () => {
    expect(leftOutOfFeed(mk({ grad_rate: 0.12, transfer_rate: 0 }), 'CA')).toBe(true)
    expect(leftOutOfFeed(mk({ grad_rate: 0.17, transfer_rate: 0.45 }), 'CA')).toBe(false)
    expect(leftOutOfFeed(mk({ grad_rate: null }), 'CA')).toBe(false)
  })
  it('spreads reaches to at most one in each four, keeping order otherwise', () => {
    const order = ['R1', 'R2', 'R3', 'a', 'b', 'c', 'd', 'e', 'f', 'R4']
    expect(spreadReaches(order, (x) => x.startsWith('R')))
      .toEqual(['R1', 'a', 'b', 'c', 'R2', 'd', 'e', 'f', 'R3', 'R4'])
    expect(spreadReaches(['a', 'R1', 'b'], (x) => x.startsWith('R'))).toEqual(['a', 'R1', 'b'])
  })
})

describe('net price by income', () => {
  it('refuses a bracket price far below the bracket under it', () => {
    const c = mk({ net_price_by_income: { '75k_110k': 1_477_100, '110k_plus': 613_500 } })
    expect(netPriceForYouCents(c, { familyIncomeCents: 130_000_00 })).toBe(1_477_100)
  })
  it('lets a small dip through', () => {
    const c = mk({ net_price_by_income: { '30k_48k': 1_165_700, '48k_75k': 1_002_300 } })
    expect(netPriceForYouCents(c, { familyIncomeCents: 60_000_00 })).toBe(1_002_300)
  })
})

describe('price against family income', () => {
  it('scores the same price as kinder to a richer family', () => {
    const c = mk({ net_price_by_income: { '30k_48k': 2_000_000, '110k_plus': 2_000_000 } })
    expect(scoreCollegeForProfile(c, { familyIncomeCents: 180_000_00 }).dimensions.affordability)
      .toBeGreaterThan(scoreCollegeForProfile(c, { familyIncomeCents: 40_000_00 }).dimensions.affordability)
  })
  it('keeps the old $5k-$35k line with no income on file', () => {
    expect(scoreCollegeForProfile(mk({ avg_net_price_cents: 500_000 }), {}).dimensions.affordability).toBe(1)
    expect(scoreCollegeForProfile(mk({ avg_net_price_cents: 3_500_000 }), {}).dimensions.affordability).toBe(0)
  })
})

describe('standingFit', () => {
  it('ranks an R1 or a selective liberal arts college above an open-access college', () => {
    const r1 = mk({ carnegie_basic: 15, admit_rate: 0.2, sat_reading_25: 680, sat_math_25: 690, sat_reading_75: 760, sat_math_75: 790 })
    const lac = mk({ carnegie_basic: 21, admit_rate: 0.25 })
    const open = mk({ carnegie_basic: 22, admit_rate: 0.95, sat_reading_25: 430, sat_math_25: 420, sat_reading_75: 540, sat_math_75: 530 })
    expect(standingFit(r1)).toBeGreaterThan(0.85)
    expect(standingFit(lac)).toBeGreaterThan(standingFit(open))
    expect(standingFit(open)).toBeLessThan(0.2)
  })
  it('is neutral with nothing known, and works without a Carnegie code', () => {
    expect(standingFit(mk({ admit_rate: null, sat_reading_25: null, sat_math_25: null, sat_reading_75: null, sat_math_75: null, act_25: null, act_75: null }))).toBe(0.5)
    expect(standingFit(mk({ carnegie_basic: null, admit_rate: 0.1 }))).toBeGreaterThan(standingFit(mk({ carnegie_basic: null, admit_rate: 0.8 })))
  })
  it('caps a school without the student\'s major at a fair fit, however well-known', () => {
    const famous = mk({ carnegie_basic: 15, admit_rate: 0.05, grad_rate: 0.95, avg_net_price_cents: 300_000, programs: { engineering: 0.4 } })
    expect(scoreCollegeForProfile(famous, { intendedFields: ['psychology'] }).fitScore).toBeLessThanOrEqual(60)
    expect(scoreCollegeForProfile(famous, { intendedFields: ['engineering'] }).fitScore).toBeGreaterThan(80)
  })
})

describe('academicGap', () => {
  // Default school: SAT middle 50% is 1110-1310.
  it('calls a reach a long shot only when the student is below its range', () => {
    expect(scoreCollegeForProfile(mk({ admit_rate: 0.1 }), { satTotal: 1050 }).academicGap).toBe('long_shot')
    expect(scoreCollegeForProfile(mk({ admit_rate: 0.1 }), { satTotal: 1250 }).academicGap).toBeNull()
  })
  it('judges a no-score student by the estimate, but assumes nothing for a test-blind school', () => {
    expect(scoreCollegeForProfile(mk({ admit_rate: 0.08 }), { gpa: 2.8 }).academicGap).toBe('long_shot')
    const testBlind = mk({ admit_rate: 0.03, sat_reading_25: null, sat_math_25: null, sat_reading_75: null, sat_math_75: null, act_25: null, act_75: null })
    expect(scoreCollegeForProfile(testBlind, { satTotal: 1540 }).academicGap).toBeNull()
    expect(scoreCollegeForProfile(testBlind, { satTotal: 1450, gpa: 3.9 }).academicGap).toBe('long_shot')
  })
  it('flags a school far below a strong student', () => {
    expect(scoreCollegeForProfile(mk(), { satTotal: 1500 }).academicGap).toBe('far_below')
    const noScores = mk({ admit_rate: 0.75, sat_reading_25: null, sat_math_25: null, sat_reading_75: null, sat_math_75: null, act_25: null, act_75: null })
    expect(scoreCollegeForProfile(noScores, { satTotal: 1540 }).academicGap).toBe('far_below')
  })
  it('ranks a long shot and a far-below school under their fit', () => {
    const m = scoreCollegeForProfile(mk({ admit_rate: 0.1 }), { satTotal: 1050 })
    expect(feedRank(mk({ admit_rate: 0.1 }), m, [])).toBe(m.fitScore - 35)
  })
})

describe('feedRank', () => {
  const carleton = mk({ id: 'c', admit_rate: 0.23, size: 2000, grad_rate: 0.9, ownership: 'private_nonprofit', locale: 'town', programs: { social_science: 0.2, biological: 0.12, computer: 0.1 } })
  const grinnell = mk({ id: 'g', admit_rate: 0.11, size: 1700, grad_rate: 0.87, ownership: 'private_nonprofit', locale: 'town', programs: { social_science: 0.22, biological: 0.1, computer: 0.12 } })
  const bigState = mk({ id: 's', admit_rate: 0.85, size: 30000, grad_rate: 0.6, ownership: 'public', locale: 'city', programs: { business_marketing: 0.3, health: 0.15 } })
  it('rates a school like the saved one as similar, and an unlike one as not', () => {
    expect(collegeSimilarity(grinnell, carleton)).toBeGreaterThan(0.8)
    expect(collegeSimilarity(bigState, carleton)).toBeLessThan(0.5)
  })
  it('lifts schools like the saved list and sinks four-years with no admissions data', () => {
    const m = scoreCollegeForProfile(grinnell, {})
    expect(feedRank(grinnell, m, [carleton])).toBeGreaterThan(feedRank(grinnell, m, []))
    const online = mk({ admit_rate: null })
    expect(feedRank(online, scoreCollegeForProfile(online, {}), [])).toBeLessThan(scoreCollegeForProfile(online, {}).fitScore)
  })
})

describe('strong program reason', () => {
  const strong = (programs: Record<string, number>, fields: string[]) =>
    scoreCollegeForProfile(mk({ programs }), { intendedFields: fields }).reasons.some((r) => r.startsWith('Strong'))
  it('needs a share well above the national norm, not just 3%', () => {
    expect(strong({ computer: 0.05 }, ['computer'])).toBe(false) // UM-Flint
    expect(strong({ computer: 0.16 }, ['computer'])).toBe(true) // UMich
  })
  it('gives a field missing from the national table the 3% floor', () => {
    expect(strong({ architecture: 0.035 }, ['architecture'])).toBe(true)
  })
  it('judges each field against its own bar', () => {
    // 20% business is ordinary; 12% CS stands out.
    expect(scoreCollegeForProfile(mk({ programs: { business_marketing: 0.2, computer: 0.12 } }), { intendedFields: ['business_marketing', 'computer'] })
      .reasons).toContain('Strong computer science program')
  })
})

describe('isAffordableForYou', () => {
  it('scales the cap with family income', () => {
    expect(isAffordableForYou(1_200_000, { familyIncomeCents: 25_000_00 })).toBe(false)
    expect(isAffordableForYou(1_200_000, { familyIncomeCents: 150_000_00 })).toBe(true)
    expect(isAffordableForYou(1_500_000, {})).toBe(true) // no income on file: $15k
    expect(isAffordableForYou(null, {})).toBe(false)
  })
})

describe('pickAffordableAlternatives', () => {
  it('returns the cheapest in-state community college first (no origin)', () => {
    const colleges: College[] = [
      mk({ scorecard_id: 5, name: 'Cheap CC', institution_type: '2yr', state: 'CA', avg_net_price_cents: 150000 }),
      mk({ scorecard_id: 6, name: 'Mid CC', institution_type: '2yr', state: 'CA', avg_net_price_cents: 600000 }),
      mk({ scorecard_id: 7, name: 'A 4yr', institution_type: '4yr', state: 'CA', avg_net_price_cents: 100000 }),
    ]
    const picks = pickAffordableAlternatives(colleges, { homeState: 'CA' }, 1)
    expect(picks).toHaveLength(1)
    expect(picks[0].name).toBe('Cheap CC')
  })
  it('excludes for-profit "2yr" career schools (only real public community colleges)', () => {
    const colleges: College[] = [
      mk({ scorecard_id: 20, name: 'For-profit Career CC', institution_type: '2yr', ownership: 'private_forprofit', state: 'CA', avg_net_price_cents: 50000 }),
      mk({ scorecard_id: 21, name: 'Public CC', institution_type: '2yr', ownership: 'public', state: 'CA', avg_net_price_cents: 300000 }),
    ]
    const picks = pickAffordableAlternatives(colleges, { homeState: 'CA' }, 3)
    expect(picks.map((c) => c.name)).toEqual(['Public CC']) // for-profit excluded despite being cheaper
  })
  it('prefers the NEAREST community college when an origin is given, even if pricier', () => {
    const origin = { lat: 34.05, lng: -118.24 } // downtown LA
    const colleges: College[] = [
      mk({ scorecard_id: 8, name: 'Far Cheap CC', institution_type: '2yr', state: 'CA', avg_net_price_cents: 100000, latitude: 38.58, longitude: -121.49 }), // Sacramento, ~370 mi
      mk({ scorecard_id: 9, name: 'Near Pricey CC', institution_type: '2yr', state: 'CA', avg_net_price_cents: 500000, latitude: 34.02, longitude: -118.29 }), // ~4 mi
    ]
    const picks = pickAffordableAlternatives(colleges, { homeState: 'CA' }, 1, origin)
    expect(picks[0].name).toBe('Near Pricey CC')
  })
})

describe('haversineMiles & collegeDistanceMi', () => {
  it('computes real-world distance', () => {
    // Santa Monica College → 90210 (Beverly Hills) ≈ 6 mi
    const d = haversineMiles({ lat: 34.017, lng: -118.47 }, { lat: 34.09, lng: -118.407 })
    expect(d).toBeGreaterThan(4)
    expect(d).toBeLessThan(9)
    // NYC → LA ≈ 2450 mi
    const cross = haversineMiles({ lat: 40.71, lng: -74.0 }, { lat: 34.05, lng: -118.24 })
    expect(cross).toBeGreaterThan(2300)
    expect(cross).toBeLessThan(2550)
  })
  it('collegeDistanceMi returns null without origin or coordinates', () => {
    const withCoords = mk({ latitude: 34.02, longitude: -118.29 })
    expect(collegeDistanceMi(withCoords, null)).toBeNull()
    expect(collegeDistanceMi(mk({ latitude: null }), { lat: 34, lng: -118 })).toBeNull()
    expect(collegeDistanceMi(withCoords, { lat: 34.05, lng: -118.24 })).toBeGreaterThan(0)
  })
})

describe('distance-aware location scoring', () => {
  it('a nearer school scores higher on location when the student set a distance limit + has coords', () => {
    const origin = { lat: 34.05, lng: -118.24 }
    const near = mk({ state: 'CA', latitude: 34.02, longitude: -118.29 }) // ~4 mi
    const far = mk({ state: 'CA', latitude: 41.88, longitude: -87.63 }) // Chicago, far
    const profile: StudentCollegeProfile = { homeState: 'CA', prefMaxDistance: 'in_state' }
    expect(scoreCollegeForProfile(near, profile, origin).dimensions.location)
      .toBeGreaterThan(scoreCollegeForProfile(far, profile, origin).dimensions.location)
  })
  it('applies no location preference when the student is open to anywhere', () => {
    const far = mk({ state: 'CA', latitude: 41.88, longitude: -87.63 })
    const fit = scoreCollegeForProfile(far, { homeState: 'CA', prefMaxDistance: 'anywhere' }, { lat: 34.05, lng: -118.24 }).dimensions.location
    expect(fit).toBeCloseTo(0.6)
  })
})

describe('regionOf & formatNetPrice', () => {
  it('maps states to census regions', () => {
    expect(regionOf('CA')).toBe('West')
    expect(regionOf('NY')).toBe('Northeast')
    expect(regionOf('TX')).toBe('South')
    expect(regionOf('IL')).toBe('Midwest')
    expect(regionOf(null)).toBeNull()
  })
  it('puts every state and DC in exactly one search region', () => {
    // A state missing from the map would silently vanish from the Discover
    // list the moment anyone picked a region.
    const STATES = ('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO '
      + 'MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY').split(' ')
    expect(STATES).toHaveLength(51)
    for (const st of STATES) expect(SEARCH_REGIONS).toContain(searchRegionOf(st))
  })
  it('gives territories and unknowns no search region rather than guessing', () => {
    expect(searchRegionOf('PR')).toBeNull()
    expect(searchRegionOf(null)).toBeNull()
  })
  it('splits the regions finer than the census ones', () => {
    // The whole point: these two share a census region and not a search one.
    expect(regionOf('WA')).toBe(regionOf('AZ'))
    expect(searchRegionOf('WA')).toBe('Pacific')
    expect(searchRegionOf('AZ')).toBe('Mountain West')
  })
  it('formats net price', () => {
    expect(formatNetPrice(842300)).toBe('~$8,423/yr after aid')
    expect(formatNetPrice(null)).toMatch(/varies/)
  })

  it('buildStudentProfile merges existing demographics with onboarding prefs', () => {
    const prefs: CollegePrefs = {
      ...DEFAULT_COLLEGE_PREFS,
      homeState: 'CA',
      intendedFields: ['engineering'],
      satTotal: 1350,
      prefSize: 'large',
      prefSettings: ['city', 'suburb'],
      prefOwnership: 'public',
      prefMaxDistance: 'in_state',
      completed: true,
    }
    const p = buildStudentProfile({ gpa: '3.7/4.0', income_level: '$30,000–$60,000' }, prefs)
    expect(p.gpa).toBe(3.7)
    expect(p.familyIncomeCents).toBe(4500000) // midpoint of 30k–60k, in cents
    expect(p.homeState).toBe('CA')
    expect(p.intendedFields).toEqual(['engineering'])
    expect(p.satTotal).toBe(1350)
    expect(p.prefSettings).toEqual(['city', 'suburb'])
    expect(p.prefMaxDistance).toBe('in_state')
  })

  it('buildStudentProfile normalizes empty settings to null and handles missing demographics', () => {
    const p = buildStudentProfile(null, DEFAULT_COLLEGE_PREFS)
    expect(p.gpa).toBeNull()
    expect(p.familyIncomeCents).toBeNull()
    expect(p.prefSettings).toBeNull()
    expect(p.openToTransfer).toBe(true) // default nudge
  })

  it('intended-field options are non-empty and unique', () => {
    const keys = INTENDED_FIELD_OPTIONS.map((o) => o.key)
    expect(keys.length).toBeGreaterThan(10)
    expect(new Set(keys).size).toBe(keys.length)
  })
  it('treats zero/negative net price as free after aid', () => {
    expect(formatNetPrice(0)).toBe('Free for you after aid')
    expect(formatNetPrice(-253300)).toBe('Free for you after aid') // e.g. MIT for a $0–30k family
    const c = mk({ net_price_by_income: { '0_30k': -253300 }, admit_rate: 0.05 })
    const reasons = scoreCollegeForProfile(c, { familyIncomeCents: 20000_00 }).reasons.join(' ')
    expect(reasons).toMatch(/Free for you after aid/)
  })
})
