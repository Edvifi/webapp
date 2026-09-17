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
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}))
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      signOut: H.signOut,
      getUser: H.getUser,
      signInWithPassword: H.signInWithPassword,
      updateUser: H.updateUser,
      resetPasswordForEmail: H.resetPasswordForEmail,
    },
  },
}))
vi.mock('./fafsaData', () => ({ clearFafsaCaches: H.clearFafsaCaches }))

import { signOut, changePassword, sendPasswordReset } from './auth'

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


describe('changePassword', () => {
  beforeEach(() => {
    H.getUser.mockResolvedValue({ data: { user: { email: 'student@example.com' } }, error: null })
    H.signInWithPassword.mockReset()
    H.updateUser.mockReset()
  })

  it('sends the current password to the server, so the check is not just ours', async () => {
    // A client-side check is bypassed by anyone with a console. Passing
    // current_password is what makes this a control rather than a courtesy.
    H.updateUser.mockResolvedValue({ error: null })

    const { error } = await changePassword('the-real-one', 'a-new-password')

    expect(error).toBeNull()
    expect(H.updateUser).toHaveBeenCalledWith({
      current_password: 'the-real-one',
      password: 'a-new-password',
    })
    // And never by minting a fresh session mid-change.
    expect(H.signInWithPassword).not.toHaveBeenCalled()
  })

  it('reports a rejected current password plainly', async () => {
    H.updateUser.mockResolvedValue({ error: { message: 'Invalid current password' } })
    const { error } = await changePassword('wrong-guess', 'a-new-password')
    expect(error).toMatch(/current password is not right/i)
  })

  it('does not call a network blip a sign-out', async () => {
    // Saying "you need to be signed in" would send a student hunting for a
    // problem that is not theirs.
    H.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Failed to fetch' } })
    const { error } = await changePassword('x', 'y')
    expect(error).toMatch(/connection/i)
    expect(H.updateUser).not.toHaveBeenCalled()
  })

  it('refuses when there is no signed-in email to re-check against', async () => {
    H.getUser.mockResolvedValue({ data: { user: null } })
    const { error } = await changePassword('x', 'y')
    expect(error).toMatch(/signed in/i)
    expect(H.signInWithPassword).not.toHaveBeenCalled()
  })
})

describe('sendPasswordReset', () => {
  beforeEach(() => H.resetPasswordForEmail.mockReset())

  it('reports success for an unknown address too', async () => {
    // Distinguishing the two would let anyone check which students have an
    // account here.
    H.resetPasswordForEmail.mockResolvedValue({ error: { message: 'User not found', status: 400 } })
    await expect(sendPasswordReset('stranger@example.com')).resolves.toEqual({ error: null })
  })

  it('stays silent about rate limiting too, because only a real account can be throttled', async () => {
    // Surfacing a 429 would answer the exact question the silence exists to
    // avoid: an unknown address cannot be rate limited, so "too many attempts"
    // confirms the account is real.
    H.resetPasswordForEmail.mockResolvedValue({ error: { message: 'rate limit', status: 429 } })
    await expect(sendPasswordReset('student@example.com')).resolves.toEqual({ error: null })
  })

  it('sends the bare origin, which is what the allow-list matches', async () => {
    // The first version pointed at a fragment nothing read, which risked
    // failing the redirect allow-list match outright.
    H.resetPasswordForEmail.mockResolvedValue({ error: null })
    await sendPasswordReset('student@example.com')
    expect(H.resetPasswordForEmail).toHaveBeenCalledWith(
      'student@example.com',
      { redirectTo: window.location.origin },
    )
  })

  it('trims the address before sending', async () => {
    H.resetPasswordForEmail.mockResolvedValue({ error: null })
    await sendPasswordReset('  student@example.com  ')
    expect(H.resetPasswordForEmail).toHaveBeenCalledWith('student@example.com', expect.any(Object))
  })
})
