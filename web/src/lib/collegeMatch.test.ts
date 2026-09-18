import { describe, it, expect } from 'vitest'
import {
  incomeBracketFromCents,
  netPriceForYouCents,
  admissionBand,
  scoreCollegeForProfile,
  pathwayType,
  isUndergradTarget,
  isCommunityCollege,
  suggestTransferPath,
  pickAffordableAlternatives,
  regionOf,
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
