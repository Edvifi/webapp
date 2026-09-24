import { describe, it, expect, vi, beforeEach } from 'vitest'

const H = vi.hoisted(() => ({ or: vi.fn() }))
vi.mock('./supabase', () => ({
  supabase: { from: () => ({ select: () => ({ or: H.or }) }) },
}))

import { clearSavedCollegesCache, fetchSavedColleges } from './collegeSearch'

const UCSC = { scorecard_id: 110714, legacy_slug: 'uc-santa-cruz', latitude: 37, longitude: -122.06, city: 'Santa Cruz', state: 'CA' }
const MIT = { scorecard_id: 166683, legacy_slug: null, latitude: 42.36, longitude: -71.09, city: 'Cambridge', state: 'MA' }

describe('fetchSavedColleges', () => {
  beforeEach(() => { H.or.mockReset(); clearSavedCollegesCache() })

  it('resolves both scorecard ids and legacy slugs in one query', async () => {
    H.or.mockResolvedValue({ data: [UCSC, MIT], error: null })
    const locs = await fetchSavedColleges(['uc-santa-cruz', 'sc-166683', 'nowhere'])
    expect(H.or).toHaveBeenCalledWith('scorecard_id.in.(166683),legacy_slug.in.(uc-santa-cruz,nowhere)')
    expect(locs.get('uc-santa-cruz')).toMatchObject({ city: 'Santa Cruz', state: 'CA' })
    expect(locs.get('sc-166683')).toMatchObject({ city: 'Cambridge' })
    expect(locs.has('nowhere')).toBe(false)
  })

  it('skips the query when there is nothing to look up', async () => {
    expect((await fetchSavedColleges([])).size).toBe(0)
    expect(H.or).not.toHaveBeenCalled()
  })

  it('rejects on a query error rather than returning nothing', async () => {
    H.or.mockResolvedValue({ data: null, error: { message: 'down' } })
    await expect(fetchSavedColleges(['sc-1'])).rejects.toThrow('down')
  })

  it('serves repeat lookups from the cache, including misses', async () => {
    H.or.mockResolvedValue({ data: [UCSC], error: null })
    await fetchSavedColleges(['uc-santa-cruz', 'nowhere'])
    const again = await fetchSavedColleges(['uc-santa-cruz', 'nowhere'])
    expect(H.or).toHaveBeenCalledTimes(1)
    expect(again.has('uc-santa-cruz')).toBe(true)
    expect(again.has('nowhere')).toBe(false)
  })
})
