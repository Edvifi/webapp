import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const H = vi.hoisted(() => {
  const rows = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }]
  return { rows, rpc: vi.fn().mockResolvedValue({ data: rows, error: null }) }
})
vi.mock('./supabase', () => ({ supabase: { rpc: H.rpc } }))
const rpc = H.rpc

import { useColleges } from './useColleges'
import type { StudentCollegeProfile } from './collegeMatch'

const profile: StudentCollegeProfile = {
  homeState: 'CA', prefMaxDistance: 'anywhere', prefOwnership: 'either', intendedFields: ['engineering'],
  familyIncomeCents: 6000000, openToTrade: false,
}

describe('useColleges', () => {
  it('loads the ranked pool via the match_colleges RPC', async () => {
    const { result } = renderHook(() => useColleges(true, profile, { lat: 34, lng: -118 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(rpc).toHaveBeenCalledWith('match_colleges', expect.objectContaining({ p: expect.any(Object), p_limit: 300 }))
    // The RPC params encode the student's scoring inputs.
    const sentParams = rpc.mock.calls[0][1].p
    expect(sentParams).toEqual(expect.objectContaining({ home_state: 'CA', intended_fields: ['engineering'], income_bracket: '48k_75k' }))
    expect(result.current.rows).toHaveLength(3)
    expect(result.current.error).toBeNull()
  })
})
