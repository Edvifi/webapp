import { describe, it, expect } from 'vitest'
import {
  feeWaiverEligibility,
  shouldShowFeeWaiverNotice,
  FEE_WAIVER_NOTICE_KEY,
} from './feeWaivers'

/**
 * The exact option strings from demographicQuestions.ts. If that list is
 * re-cut, these break — which is the point: the threshold is a judgment call
 * tied to those specific brackets.
 */
const SURVEY_OPTIONS = {
  under30: 'Under $30,000',
  b30to60: '$30,000 – $60,000',
  b60to100: '$60,000 – $100,000',
  b100to150: '$100,000 – $150,000',
  over150: '$150,000+',
  declined: 'Prefer not to say',
} as const

describe('feeWaiverEligibility', () => {
  it('qualifies brackets that sit entirely at or below the $60k line', () => {
    expect(feeWaiverEligibility(SURVEY_OPTIONS.under30)).toBe('likely')
    expect(feeWaiverEligibility(SURVEY_OPTIONS.b30to60)).toBe('likely')
  })

  it('does not qualify brackets that extend above the line', () => {
    // Straddles the line -- the top of the bracket is what decides.
    expect(feeWaiverEligibility(SURVEY_OPTIONS.b60to100)).toBe('unlikely')
    expect(feeWaiverEligibility(SURVEY_OPTIONS.b100to150)).toBe('unlikely')
    expect(feeWaiverEligibility(SURVEY_OPTIONS.over150)).toBe('unlikely')
  })

  it('treats a declined or missing answer as unknown, not as ineligible', () => {
    expect(feeWaiverEligibility(SURVEY_OPTIONS.declined)).toBe('unknown')
    expect(feeWaiverEligibility(null)).toBe('unknown')
    expect(feeWaiverEligibility(undefined)).toBe('unknown')
    expect(feeWaiverEligibility('')).toBe('unknown')
  })

  it('never qualifies an open-ended bracket, even one starting below the line', () => {
    // A hypothetical re-cut like "$50,000+" includes incomes above the line,
    // so its floor being under $60k must not qualify it.
    expect(feeWaiverEligibility('$50,000+')).toBe('unlikely')
    expect(feeWaiverEligibility('$30,000+')).toBe('unlikely')
  })

  it('reads the bracket edge, not a midpoint', () => {
    // parseIncomeToRange would call this $45k and qualify it either way; the
    // distinction bites at the boundary bracket below.
    expect(feeWaiverEligibility('$30,000 – $60,000')).toBe('likely')
    // Midpoint of 60-100k is $80k and its floor is $60k -- both could be argued;
    // the ceiling rule is what makes this unambiguous.
    expect(feeWaiverEligibility('$60,000 – $100,000')).toBe('unlikely')
  })

  it('accepts the exact boundary as qualifying', () => {
    expect(feeWaiverEligibility('$60,000')).toBe('likely')
    expect(feeWaiverEligibility('$60,001')).toBe('unlikely')
  })

  it('tolerates separator and spacing variations', () => {
    // En dash, hyphen, and "to" all appear in real-world bracket labels.
    expect(feeWaiverEligibility('$30,000-$60,000')).toBe('likely')
    expect(feeWaiverEligibility('$30,000 to $60,000')).toBe('likely')
    expect(feeWaiverEligibility('30000 - 60000')).toBe('likely')
  })
})

describe('shouldShowFeeWaiverNotice', () => {
  it('shows for qualifying students', () => {
    expect(shouldShowFeeWaiverNotice(SURVEY_OPTIONS.under30, [])).toBe(true)
  })

  it('shows for students with no income on file, so they can fill it in', () => {
    expect(shouldShowFeeWaiverNotice(SURVEY_OPTIONS.declined, [])).toBe(true)
    expect(shouldShowFeeWaiverNotice(null, [])).toBe(true)
  })

  it('stays hidden for students above the line', () => {
    expect(shouldShowFeeWaiverNotice(SURVEY_OPTIONS.over150, [])).toBe(false)
  })

  it('stays hidden once dismissed, on either surface', () => {
    expect(shouldShowFeeWaiverNotice(SURVEY_OPTIONS.under30, [FEE_WAIVER_NOTICE_KEY])).toBe(false)
    expect(shouldShowFeeWaiverNotice(null, [FEE_WAIVER_NOTICE_KEY])).toBe(false)
  })

  it('handles a profile with no intros_seen array yet', () => {
    expect(shouldShowFeeWaiverNotice(SURVEY_OPTIONS.under30, null)).toBe(true)
    expect(shouldShowFeeWaiverNotice(SURVEY_OPTIONS.under30, undefined)).toBe(true)
  })

  it('ignores unrelated dismissals', () => {
    expect(shouldShowFeeWaiverNotice(SURVEY_OPTIONS.under30, ['fafsa', 'journey'])).toBe(true)
  })
})
