import { describe, it, expect, vi, beforeEach } from 'vitest'

// jsdom's Storage is not reliably present here, so provide a standards-shaped
// one: clearStoredSession walks it by index, exactly as a browser would.
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size },
})

const H = vi.hoisted(() => ({
  signOut: vi.fn(),
  clearFafsaCaches: vi.fn(),
}))
vi.mock('./supabase', () => ({ supabase: { auth: { signOut: H.signOut } } }))
vi.mock('./fafsaData', () => ({ clearFafsaCaches: H.clearFafsaCaches }))

import { signOut } from './auth'

describe('signOut', () => {
  beforeEach(() => { H.signOut.mockReset(); H.clearFafsaCaches.mockReset(); localStorage.clear() })

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

  it('clears the stored session itself when the server call fails', async () => {
    // supabase-js returns before removing the session, so without this the tab
    // stays signed in behind the login screen and the next person to reload on
    // a shared computer lands in the previous student's account.
    localStorage.setItem('sb-abc123-auth-token', '{"access_token":"live"}')
    localStorage.setItem('unrelated', 'keep me')
    H.signOut.mockResolvedValue({ error: { message: 'Failed to fetch' } })

    const result = await signOut()

    expect(result.clearedLocally).toBe(true)
    expect(localStorage.getItem('sb-abc123-auth-token')).toBeNull()
    expect(localStorage.getItem('unrelated')).toBe('keep me')
  })

  it('leaves storage alone on a clean sign-out', async () => {
    localStorage.setItem('sb-abc123-auth-token', '{"access_token":"live"}')
    H.signOut.mockResolvedValue({ error: null })
    const result = await signOut()
    expect(result.clearedLocally).toBe(false)
    // supabase removed it itself on the success path.
  })
})
