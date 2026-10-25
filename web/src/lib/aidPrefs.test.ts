import { describe, it, expect } from 'vitest'
import { fitsAidPrefs, interestTags, DEFAULT_AID_PREFS } from './aidPrefs'

const award = (over: Partial<Parameters<typeof fitsAidPrefs>[0]> = {}) => ({
  demographic_tags: ['merit'], application_requirements: ['Transcript'], award_amount_cents: 500_000, award_amount_note: null, ...over,
})

describe('fitsAidPrefs', () => {
  it('shows everything on the defaults', () => {
    expect(fitsAidPrefs(award({ demographic_tags: ['regional'], application_requirements: ['Essay'] }), DEFAULT_AID_PREFS)).toBe(true)
  })

  it('narrows by type, amount, essays and region', () => {
    expect(fitsAidPrefs(award(), { ...DEFAULT_AID_PREFS, types: ['Need'] })).toBe(false)
    expect(fitsAidPrefs(award({ demographic_tags: ['financial_need'] }), { ...DEFAULT_AID_PREFS, types: ['Need'] })).toBe(true)
    expect(fitsAidPrefs(award(), { ...DEFAULT_AID_PREFS, minAward: 10000 })).toBe(false)
    expect(fitsAidPrefs(award({ application_requirements: ['Personal statement'] }), { ...DEFAULT_AID_PREFS, essays: false })).toBe(false)
    expect(fitsAidPrefs(award({ demographic_tags: ['merit', 'regional'] }), { ...DEFAULT_AID_PREFS, regional: false })).toBe(false)
  })
})

it('interestTags', () => {
  expect(interestTags({ ...DEFAULT_AID_PREFS, interests: ['arts', 'service'] })).toEqual(['arts', 'service'])
})
