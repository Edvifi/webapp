import { describe, it, expect } from 'vitest'
import { formatAmount, demographicTagsForProfile, US_STATES } from './fafsaData'

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
