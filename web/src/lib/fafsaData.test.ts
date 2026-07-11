import { describe, it, expect } from 'vitest'
import {
  formatAmount,
  demographicTagsForProfile,
  US_STATES,
  scoreScholarshipForProfile,
  parseDeadlineDaysFromNow,
  parseIncomeToRange,
  parseGpa,
  type Scholarship,
} from './fafsaData'

/* ─────────────  formatAmount  ───────────── */

describe('formatAmount', () => {
  it('returns the note when note is provided (ignoring cents)', () => {
    expect(formatAmount(500_00, 'Full tuition')).toBe('Full tuition')
  })

  it('returns the note even when cents is null', () => {
    expect(formatAmount(null, 'Up to full cost')).toBe('Up to full cost')
  })

  it('returns "Varies" when both cents and note are null', () => {
    expect(formatAmount(null, null)).toBe('Varies')
  })

  it('formats small amounts (under $1,000) as whole dollars', () => {
    expect(formatAmount(50_00, null)).toBe('$50')
    expect(formatAmount(99_900, null)).toBe('$999')
  })

  it('formats zero cents as $0', () => {
    expect(formatAmount(0, null)).toBe('$0')
  })

  it('formats exact thousands with no decimal (e.g. $5K)', () => {
    expect(formatAmount(5_000_00, null)).toBe('$5K')
    expect(formatAmount(10_000_00, null)).toBe('$10K')
  })

  it('formats non-round thousands with one decimal (e.g. $2.5K)', () => {
    expect(formatAmount(2_500_00, null)).toBe('$2.5K')
    expect(formatAmount(15_750_00, null)).toBe('$15.8K')
  })

  it('formats exactly $1,000 as $1K', () => {
    expect(formatAmount(100_000, null)).toBe('$1K')
  })

  it('prefers note over a valid cents value', () => {
    expect(formatAmount(100_000, 'Varies by state')).toBe('Varies by state')
  })
})

/* ─────────────  demographicTagsForProfile  ───────────── */

describe('demographicTagsForProfile', () => {
  it('returns empty array for empty input', () => {
    expect(demographicTagsForProfile({})).toEqual([])
  })

  it('returns empty array when all fields are null', () => {
    expect(
      demographicTagsForProfile({
        hispanic: null,
        native_american: null,
        race: null,
        income_level: null,
        parent_education: null,
        parent_immigrants: null,
      }),
    ).toEqual([])
  })

  it('includes "hispanic" and "latino" when hispanic is "yes"', () => {
    const tags = demographicTagsForProfile({ hispanic: 'yes' })
    expect(tags).toContain('hispanic')
    expect(tags).toContain('latino')
  })

  it('does not include hispanic tags when hispanic is "no"', () => {
    const tags = demographicTagsForProfile({ hispanic: 'no' })
    expect(tags).not.toContain('hispanic')
    expect(tags).not.toContain('latino')
  })

  it('includes "native_american" when native_american is "yes"', () => {
    const tags = demographicTagsForProfile({ native_american: 'yes' })
    expect(tags).toContain('native_american')
  })

  it('includes "black" when race contains "black"', () => {
    const tags = demographicTagsForProfile({ race: 'Black or African American' })
    expect(tags).toContain('black')
  })

  it('includes "black" when race contains "african" (case-insensitive)', () => {
    const tags = demographicTagsForProfile({ race: 'African American' })
    expect(tags).toContain('black')
  })

  it('includes "asian_pacific_islander" when race contains "asian"', () => {
    const tags = demographicTagsForProfile({ race: 'Asian' })
    expect(tags).toContain('asian_pacific_islander')
  })

  it('includes "asian_pacific_islander" when race contains "pacific"', () => {
    const tags = demographicTagsForProfile({ race: 'Native Hawaiian or Pacific Islander' })
    expect(tags).toContain('asian_pacific_islander')
  })

  it('includes low-income tags when income_level starts with "<"', () => {
    const tags = demographicTagsForProfile({ income_level: '< $30,000' })
    expect(tags).toContain('low_income')
    expect(tags).toContain('pell_eligible')
    expect(tags).toContain('financial_need')
  })

  it('includes low-income tags when income_level starts with "under"', () => {
    const tags = demographicTagsForProfile({ income_level: 'Under $40,000' })
    expect(tags).toContain('low_income')
    expect(tags).toContain('pell_eligible')
    expect(tags).toContain('financial_need')
  })

  it('includes low-income tags when income_level starts with "less"', () => {
    const tags = demographicTagsForProfile({ income_level: 'Less than $25,000' })
    expect(tags).toContain('low_income')
    expect(tags).toContain('pell_eligible')
    expect(tags).toContain('financial_need')
  })

  it('does not include low-income tags for higher income levels', () => {
    const tags = demographicTagsForProfile({ income_level: '$60,000 - $80,000' })
    expect(tags).not.toContain('low_income')
    expect(tags).not.toContain('pell_eligible')
  })

  it('includes "first_gen" and "financial_need" when parent_education matches "no high school"', () => {
    const tags = demographicTagsForProfile({ parent_education: 'no high school diploma' })
    expect(tags).toContain('first_gen')
    expect(tags).toContain('financial_need')
  })

  it('includes "first_gen" when parent_education is "none"', () => {
    const tags = demographicTagsForProfile({ parent_education: 'None' })
    expect(tags).toContain('first_gen')
  })

  it('includes "first_gen" when parent_education is "grade school"', () => {
    const tags = demographicTagsForProfile({ parent_education: 'Grade school only' })
    expect(tags).toContain('first_gen')
  })

  it('does not include "first_gen" for college-educated parents', () => {
    const tags = demographicTagsForProfile({ parent_education: "Bachelor's degree" })
    expect(tags).not.toContain('first_gen')
  })

  it('includes "immigrant" when parent_immigrants is "yes"', () => {
    const tags = demographicTagsForProfile({ parent_immigrants: 'yes' })
    expect(tags).toContain('immigrant')
  })

  it('does not include "immigrant" when parent_immigrants is "no"', () => {
    const tags = demographicTagsForProfile({ parent_immigrants: 'no' })
    expect(tags).not.toContain('immigrant')
  })

  it('combines multiple demographic tags correctly', () => {
    const tags = demographicTagsForProfile({
      hispanic: 'yes',
      native_american: 'yes',
      race: 'Black',
      income_level: '< $30,000',
      parent_education: 'no high school diploma',
      parent_immigrants: 'yes',
    })
    expect(tags).toContain('hispanic')
    expect(tags).toContain('latino')
    expect(tags).toContain('native_american')
    expect(tags).toContain('black')
    expect(tags).toContain('low_income')
    expect(tags).toContain('pell_eligible')
    expect(tags).toContain('first_gen')
    expect(tags).toContain('immigrant')
    // financial_need should appear (possibly twice from income + education), at least once
    expect(tags).toContain('financial_need')
  })
})

/* ─────────────  US_STATES  ───────────── */

describe('US_STATES', () => {
  it('has 51 entries (50 states + DC)', () => {
    expect(US_STATES).toHaveLength(51)
  })

  it('every code is exactly 2 uppercase characters', () => {
    for (const state of US_STATES) {
      expect(state.code).toMatch(/^[A-Z]{2}$/)
    }
  })

  it('has no duplicate codes', () => {
    const codes = US_STATES.map((s) => s.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('has no duplicate names', () => {
    const names = US_STATES.map((s) => s.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('includes DC (District of Columbia)', () => {
    const dc = US_STATES.find((s) => s.code === 'DC')
    expect(dc).toBeDefined()
    expect(dc!.name).toBe('District of Columbia')
  })

  it('every entry has a non-empty name', () => {
    for (const state of US_STATES) {
      expect(state.name.length).toBeGreaterThan(0)
    }
  })

  it('is sorted alphabetically by name', () => {
    const names = US_STATES.map((s) => s.name)
    const sorted = [...names].sort((a, b) => a.localeCompare(b))
    expect(names).toEqual(sorted)
  })
})

/* ─────────────  parseDeadlineDaysFromNow  ───────────── */

describe('parseDeadlineDaysFromNow', () => {
  const now = new Date('2026-04-12T00:00:00')

  it('returns null for null/undefined input', () => {
    expect(parseDeadlineDaysFromNow(null, now)).toBeNull()
    expect(parseDeadlineDaysFromNow(undefined, now)).toBeNull()
  })

  it('returns null for "Rolling", "Varies", "TBD"', () => {
    expect(parseDeadlineDaysFromNow('Rolling', now)).toBeNull()
    expect(parseDeadlineDaysFromNow('Varies', now)).toBeNull()
    expect(parseDeadlineDaysFromNow('TBD', now)).toBeNull()
  })

  it('computes days for a future date', () => {
    expect(parseDeadlineDaysFromNow('May 1, 2026', now)).toBe(19)
  })

  it('returns negative for past dates', () => {
    const days = parseDeadlineDaysFromNow('Mar 1, 2026', now)!
    expect(days).toBeLessThan(0)
    expect(days).toBeGreaterThan(-45)
  })

  it('returns 0 for same day', () => {
    expect(parseDeadlineDaysFromNow('Apr 12, 2026', now)).toBe(0)
  })
})

/* ─────────────  parseIncomeToRange  ───────────── */

describe('parseIncomeToRange', () => {
  it('returns null for null/undefined', () => {
    expect(parseIncomeToRange(null)).toBeNull()
    expect(parseIncomeToRange(undefined)).toBeNull()
  })

  it('parses "Under $30,000" to the sub-band midpoint (~$15k)', () => {
    expect(parseIncomeToRange('Under $30,000')).toBe(1_500_000)
  })

  it('parses "< $30,000" to the sub-band midpoint (~$15k)', () => {
    expect(parseIncomeToRange('< $30,000')).toBe(1_500_000)
  })

  it('parses a "$60,000 - $80,000" band to its midpoint ($70k)', () => {
    expect(parseIncomeToRange('$60,000 - $80,000')).toBe(7_000_000)
  })

  it('parses an open-topped "$150,000+" band to the threshold', () => {
    expect(parseIncomeToRange('$150,000+')).toBe(15_000_000)
  })

  it('returns null when there is no number ("Prefer not to say")', () => {
    expect(parseIncomeToRange('Prefer not to say')).toBeNull()
  })
})

describe('parseGpa', () => {
  it('returns null for empty/invalid', () => {
    expect(parseGpa(null)).toBeNull()
    expect(parseGpa('')).toBeNull()
    expect(parseGpa('N/A')).toBeNull()
  })
  it('parses a plain GPA', () => {
    expect(parseGpa('3.7')).toBe(3.7)
  })
  it('parses a GPA out of a scale ("3.7/4.0")', () => {
    expect(parseGpa('3.7/4.0')).toBe(3.7)
  })
  it('rejects nonsense values', () => {
    expect(parseGpa('99')).toBeNull()
  })
})

/* ��────────────  scoreScholarshipForProfile  ───────────── */

function makeScholarship(overrides: Partial<Scholarship> = {}): Scholarship {
  return {
    id: 'test-id',
    name: 'Test Scholarship',
    slug: 'test-scholarship',
    description: 'A test scholarship',
    url: 'https://example.com',
    demographic_tags: [],
    application_requirements: [],
    selection_criteria: [],
    award_amount_cents: null,
    award_amount_note: null,
    deadline_display: null,
    eligibility_summary: null,
    max_family_income_cents: null,
    min_gpa: null,
    num_awards_per_year: null,
    provider: null,
    renewable_years: null,
    requires_css_profile: false,
    requires_fafsa: false,
    sort_order: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    verified_at: null,
    ...overrides,
  }
}

describe('scoreScholarshipForProfile', () => {
  const now = new Date('2026-04-12T00:00:00')

  it('gives open scholarships (no tags) a neutral demographic score of 20', () => {
    const s = makeScholarship()
    const score = scoreScholarshipForProfile(s, ['hispanic', 'low_income'], undefined, now)
    expect(score.demographicMatch).toBe(20)
    expect(score.matchedTags).toEqual([])
  })

  it('scores full demographic match at 40', () => {
    const s = makeScholarship({ demographic_tags: ['hispanic', 'low_income'] })
    const score = scoreScholarshipForProfile(s, ['hispanic', 'low_income'], undefined, now)
    expect(score.demographicMatch).toBe(40)
    expect(score.matchedTags).toEqual(['hispanic', 'low_income'])
  })

  it('scores partial demographic match proportionally', () => {
    const s = makeScholarship({ demographic_tags: ['hispanic', 'low_income', 'black', 'first_gen'] })
    const score = scoreScholarshipForProfile(s, ['hispanic'], undefined, now)
    expect(score.demographicMatch).toBe(10)
    expect(score.matchedTags).toEqual(['hispanic'])
  })

  it('gives 0 demographic score when no tags match', () => {
    const s = makeScholarship({ demographic_tags: ['hispanic', 'latino'] })
    const score = scoreScholarshipForProfile(s, ['black'], undefined, now)
    expect(score.demographicMatch).toBe(0)
    expect(score.matchedTags).toEqual([])
  })

  it('gives full eligibility when no income cap and no GPA', () => {
    const s = makeScholarship()
    const score = scoreScholarshipForProfile(s, [], undefined, now)
    expect(score.eligibilityFit).toBe(25)
  })

  it('gives full income points when user income is under cap', () => {
    const s = makeScholarship({ max_family_income_cents: 5_000_000 })
    const score = scoreScholarshipForProfile(s, [], { familyIncomeCents: 3_000_000 }, now)
    expect(score.eligibilityFit).toBe(25)
  })

  it('gives 0 income points when user income exceeds cap', () => {
    const s = makeScholarship({ max_family_income_cents: 5_000_000 })
    const score = scoreScholarshipForProfile(s, [], { familyIncomeCents: 8_000_000 }, now)
    expect(score.eligibilityFit).toBe(10)
  })

  it('gives optimistic income points when user income is unknown', () => {
    const s = makeScholarship({ max_family_income_cents: 5_000_000 })
    const score = scoreScholarshipForProfile(s, [], { familyIncomeCents: null }, now)
    expect(score.eligibilityFit).toBe(18)
  })

  it('gives full GPA points when user GPA meets minimum', () => {
    const s = makeScholarship({ min_gpa: 3.0 })
    const score = scoreScholarshipForProfile(s, [], { gpa: 3.5 }, now)
    expect(score.eligibilityFit).toBe(25)
  })

  it('gives 0 GPA points when user GPA is below minimum', () => {
    const s = makeScholarship({ min_gpa: 3.5 })
    const score = scoreScholarshipForProfile(s, [], { gpa: 3.0 }, now)
    expect(score.eligibilityFit).toBe(15)
  })

  it('scores high award value for $10K+', () => {
    const s = makeScholarship({ award_amount_cents: 2_500_000 })
    const score = scoreScholarshipForProfile(s, [], undefined, now)
    expect(score.awardValue).toBe(15)
  })

  it('scores mid award value for $5K-$10K', () => {
    const s = makeScholarship({ award_amount_cents: 500_000 })
    const score = scoreScholarshipForProfile(s, [], undefined, now)
    expect(score.awardValue).toBe(12)
  })

  it('scores low award value for null amount', () => {
    const s = makeScholarship({ award_amount_cents: null })
    const score = scoreScholarshipForProfile(s, [], undefined, now)
    expect(score.awardValue).toBe(4)
  })

  it('scores deadline urgency high for < 30 days', () => {
    const s = makeScholarship({ deadline_display: 'May 1, 2026' })
    const score = scoreScholarshipForProfile(s, [], undefined, now)
    expect(score.deadlineUrgency).toBe(10)
  })

  it('scores deadline urgency 0 for past deadlines', () => {
    const s = makeScholarship({ deadline_display: 'Mar 1, 2026' })
    const score = scoreScholarshipForProfile(s, [], undefined, now)
    expect(score.deadlineUrgency).toBe(0)
  })

  it('scores deadline urgency neutral for unparseable dates', () => {
    const s = makeScholarship({ deadline_display: 'Rolling' })
    const score = scoreScholarshipForProfile(s, [], undefined, now)
    expect(score.deadlineUrgency).toBe(3)
  })

  it('gives requirement fit bonus for FAFSA + need tags', () => {
    const s = makeScholarship({ requires_fafsa: true, application_requirements: ['Essay'] })
    const score = scoreScholarshipForProfile(s, ['low_income'], undefined, now)
    expect(score.requirementFit).toBe(10)
  })

  it('gives low-barrier bonus for few requirements', () => {
    const s = makeScholarship({ application_requirements: ['Transcript'] })
    const score = scoreScholarshipForProfile(s, [], undefined, now)
    expect(score.requirementFit).toBe(5)
  })

  it('total is sum of all sub-scores clamped to 100', () => {
    const s = makeScholarship({
      demographic_tags: ['hispanic', 'low_income'],
      award_amount_cents: 2_500_000,
      deadline_display: 'May 1, 2026',
      requires_fafsa: true,
      application_requirements: ['Essay'],
    })
    const score = scoreScholarshipForProfile(s, ['hispanic', 'low_income'], undefined, now)
    const sum = score.demographicMatch + score.eligibilityFit + score.awardValue + score.deadlineUrgency + score.requirementFit
    expect(score.total).toBe(Math.min(100, sum))
    expect(score.total).toBeLessThanOrEqual(100)
  })

  it('empty user tags against targeted scholarship gives 0 demographic', () => {
    const s = makeScholarship({ demographic_tags: ['hispanic', 'black'] })
    const score = scoreScholarshipForProfile(s, [], undefined, now)
    expect(score.demographicMatch).toBe(0)
  })
})
