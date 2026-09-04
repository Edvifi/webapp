import { describe, it, expect, vi, beforeEach } from 'vitest'

const H = vi.hoisted(() => ({
  signOut: vi.fn(),
  clearFafsaCaches: vi.fn(),
}))
vi.mock('./supabase', () => ({ supabase: { auth: { signOut: H.signOut } } }))
vi.mock('./fafsaData', () => ({ clearFafsaCaches: H.clearFafsaCaches }))

import { signOut } from './auth'

describe('signOut', () => {
  beforeEach(() => { H.signOut.mockReset(); H.clearFafsaCaches.mockReset() })

  it('drops the per-user caches', async () => {
    H.signOut.mockResolvedValue({ error: null })
    await signOut()
    expect(H.clearFafsaCaches).toHaveBeenCalledTimes(1)
  })

  it('drops them even when sign-out fails', async () => {
    // The UI returns to the login screen either way, so leaving the previous
    // student's scholarships cached would show them to whoever signs in next
    // on this tab.
    H.signOut.mockRejectedValue(new Error('offline'))
    await expect(signOut()).rejects.toThrow('offline')
    expect(H.clearFafsaCaches).toHaveBeenCalledTimes(1)
  })
})
