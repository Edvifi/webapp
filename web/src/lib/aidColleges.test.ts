import { describe, it, expect, vi, beforeEach } from 'vitest'

const H = vi.hoisted(() => {
  const or = vi.fn()
  const select = vi.fn(() => ({ or }))
  const from = vi.fn(() => ({ select }))
  return { from, select, or }
})
vi.mock('./supabase', () => ({ supabase: { from: H.from } }))

import { aidCollegeFromRow, fetchAidColleges } from './aidColleges'
import type { College } from './collegeMatch'

/** Minimal row: every curated field null, which is the case for 6,227 of 6,273. */
function row(over: Partial<College> = {}): College {
  return {
    id: 'u', scorecard_id: 1, name: 'Test University', slug: 'test', institution_type: '4yr',
    city: 'Testville', state: 'CA', url: 'https://www.test.edu/', npc_url: null,
    cost_of_attendance_cents: null, cost_out_of_state_cents: null,
    legacy_slug: null, emoji: null, early_action: null, early_decision: null, regular_decision: null,
    fafsa_priority: null, css_profile: null, aid_notification: null,
    meets_full_need: null, no_loan_policy: null, curated_at: null,
    ...over,
  } as unknown as College
}

describe('aidCollegeFromRow', () => {
  it('uses the shared sc- identity so a school means the same thing in both modules', () => {
    expect(aidCollegeFromRow(row({ scorecard_id: 186131 })).id).toBe('sc-186131')
  })

  it('falls back to the institution-type glyph when no curated emoji exists', () => {
    expect(aidCollegeFromRow(row({ emoji: '🟥' })).emoji).toBe('🟥')
    expect(aidCollegeFromRow(row({ institution_type: '2yr' })).emoji).toBe('🏫')
    expect(aidCollegeFromRow(row({ institution_type: 'trade' })).emoji).toBe('🔧')
  })

  it('treats an unchecked aid policy as "no badge", never as a negative claim', () => {
    // A null flag means nobody has verified this school, not that it fails to
    // meet need. Both must render the same: no badge, no assertion either way.
    const unchecked = aidCollegeFromRow(row({ meets_full_need: null, no_loan_policy: null }))
    expect(unchecked.meetsFullNeed).toBe(false)
    expect(unchecked.noLoanPolicy).toBe(false)
    expect(unchecked.curated).toBe(false)
    const checked = aidCollegeFromRow(row({ meets_full_need: true, curated_at: '2026-09-17T00:00:00Z' }))
    expect(checked.meetsFullNeed).toBe(true)
    expect(checked.curated).toBe(true)
  })

  it('converts stored cents to whole dollars, and keeps absent costs absent', () => {
    const c = aidCollegeFromRow(row({ cost_of_attendance_cents: 4561900, cost_out_of_state_cents: 6806600 }))
    expect(c.costOfAttendance).toBe(45619)
    expect(c.costOutOfState).toBe(68066)
    // Null must not become 0 — a school rendered as free is worse than one
    // rendered as unknown.
    expect(aidCollegeFromRow(row()).costOfAttendance).toBeNull()
  })

  it('reduces the website to a bare domain for the logo', () => {
    expect(aidCollegeFromRow(row({ url: 'https://www.harvard.edu/' })).domain).toBe('harvard.edu')
    expect(aidCollegeFromRow(row({ url: null })).domain).toBeNull()
  })
})

describe('fetchAidColleges', () => {
  beforeEach(() => { H.from.mockClear(); H.select.mockClear(); H.or.mockClear() })

  it('resolves legacy slugs and sc- ids together in one query', async () => {
    H.or.mockResolvedValue({
      data: [row({ scorecard_id: 166027, name: 'Harvard University', legacy_slug: 'harvard' }),
             row({ scorecard_id: 186131, name: 'Princeton University' })],
      error: null,
    })
    const { colleges, unresolved } = await fetchAidColleges(['harvard', 'sc-186131'])
    expect(H.or).toHaveBeenCalledTimes(1)
    expect(H.or.mock.calls[0][0]).toContain('scorecard_id.in.(186131)')
    expect(H.or.mock.calls[0][0]).toContain('legacy_slug.in.(harvard)')
    // Order follows the saved list, not whatever order the rows came back in.
    expect(colleges.map((c) => c.name)).toEqual(['Harvard University', 'Princeton University'])
    expect(unresolved).toEqual([])
  })

  it('reports ids it could not resolve instead of dropping them', async () => {
    // The bug this replaces: `ids.map(getCollegeById).filter(Boolean)` made an
    // unknown id vanish, so a student's school disappeared from their own list
    // with nothing said.
    H.or.mockResolvedValue({ data: [row({ scorecard_id: 166027, legacy_slug: 'harvard' })], error: null })
    const { colleges, unresolved } = await fetchAidColleges(['harvard', 'school-that-went-away'])
    expect(colleges).toHaveLength(1)
    expect(unresolved).toEqual(['school-that-went-away'])
  })

  it('rejects on a query error rather than reporting an empty list', async () => {
    H.or.mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(fetchAidColleges(['harvard'])).rejects.toThrow(/Failed to load your colleges/)
  })

  it('does not query at all for an empty list', async () => {
    expect(await fetchAidColleges([])).toEqual({ colleges: [], unresolved: [] })
    expect(H.from).not.toHaveBeenCalled()
  })
})

describe('saved-id round tripping', () => {
  beforeEach(() => { H.from.mockClear(); H.select.mockClear(); H.or.mockClear() })

  it('keeps the id the student has saved, so remove and NPC runs still match', async () => {
    // Regression: the UI used to get the canonical `sc-` id back, while the
    // saved list still held 'ucla'. `collegeIds.filter(x => x !== 'sc-110662')`
    // removed nothing, so the school could not be removed at all.
    H.or.mockResolvedValue({ data: [row({ scorecard_id: 110662, name: 'UCLA', legacy_slug: 'ucla' })], error: null })
    const { colleges } = await fetchAidColleges(['ucla'])
    expect(colleges[0].id).toBe('ucla')
    expect(colleges[0].canonicalId).toBe('sc-110662')
    expect(['ucla'].filter((x) => x !== colleges[0].id)).toEqual([])
  })

  it('exposes a canonical id so one school cannot be added twice', async () => {
    // Regression: searching UCLA returned 'sc-110662', which is not in
    // ['ucla'], so the dropdown offered "+ Add" for a school already on the
    // list — putting it there twice.
    H.or.mockResolvedValue({ data: [row({ scorecard_id: 110662, legacy_slug: 'ucla' })], error: null })
    const { colleges } = await fetchAidColleges(['ucla'])
    const searchResultId = aidCollegeFromRow(row({ scorecard_id: 110662 })).canonicalId
    expect(colleges.map((c) => c.canonicalId)).toContain(searchResultId)
  })

  it('uses the canonical id for a search result, which has no saved id yet', () => {
    const c = aidCollegeFromRow(row({ scorecard_id: 186131 }))
    expect(c.id).toBe('sc-186131')
    expect(c.id).toBe(c.canonicalId)
  })
})

describe('public vs private', () => {
  it('derives control from ownership, not programme length', () => {
    // Regression: the out-of-state toggle tested `type === 'Public'`, but `type`
    // became "4-year" / "Community college" when this moved to the database, so
    // the toggle silently stopped rendering for every school — including the 25
    // whose out-of-state cost had just been backfilled.
    expect(aidCollegeFromRow(row({ ownership: 'public' })).isPublic).toBe(true)
    expect(aidCollegeFromRow(row({ ownership: 'public' })).control).toBe('Public')
    expect(aidCollegeFromRow(row({ ownership: 'private_nonprofit' })).isPublic).toBe(false)
    expect(aidCollegeFromRow(row({ ownership: 'private_nonprofit' })).control).toBe('Private')
    expect(aidCollegeFromRow(row({ ownership: 'private_forprofit' })).control).toBe('For-profit')
    // type stays the programme length, which is a different question
    expect(aidCollegeFromRow(row({ ownership: 'public', institution_type: '2yr' })).type).toBe('Community college')
  })
})
