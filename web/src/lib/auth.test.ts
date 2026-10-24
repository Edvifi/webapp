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
  signInWithIdToken: vi.fn(),
}))
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      signOut: H.signOut,
      getUser: H.getUser,
      signInWithPassword: H.signInWithPassword,
      updateUser: H.updateUser,
      resetPasswordForEmail: H.resetPasswordForEmail,
      signInWithIdToken: H.signInWithIdToken,
    },
  },
}))
vi.mock('./fafsaData', () => ({ clearFafsaCaches: H.clearFafsaCaches }))

import { createHash } from 'node:crypto'
import type { User } from '@supabase/supabase-js'
import {
  signOut,
  changePassword,
  completePasswordReset,
  sendPasswordReset,
  makeGoogleNonce,
  signInWithGoogleIdToken,
  needsPassword,
  friendlyError,
  friendlyGoogleError,
  parseAuthError,
  takeAuthErrorFromUrl,
} from './auth'

describe('signOut', () => {
  beforeEach(() => { H.signOut.mockReset(); H.clearFafsaCaches.mockReset(); localStorage.clear() })

  it('drops the per-user caches', async () => {
    H.signOut.mockResolvedValue({ error: null })
    await signOut()
    expect(H.clearFafsaCaches).toHaveBeenCalledTimes(1)
  })

  it('forgets the page the student was on', async () => {
    window.location.hash = '#/dashboard/financial-aid/deadlines'
    H.signOut.mockResolvedValue({ error: null })
    await signOut()
    expect(window.location.hash).toBe('')
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

describe('Google ID token nonce', () => {
  it('gives Google the SHA-256 hex of the raw nonce Supabase receives', async () => {
    // Supabase hashes the nonce it is given and compares it with the one in
    // the token; handing either side the wrong form rejects every sign-in.
    const { raw, hashed } = await makeGoogleNonce()
    expect(hashed).toBe(createHash('sha256').update(raw).digest('hex'))

    H.signInWithIdToken.mockResolvedValue({ error: null })
    await signInWithGoogleIdToken('id-token', raw)
    expect(H.signInWithIdToken).toHaveBeenCalledWith(expect.objectContaining({ provider: 'google', token: 'id-token', nonce: raw }))
  })
})

describe('invite-only sign-in', () => {
  it('points someone without an invite at the waitlist', () => {
    // GoTrue's own wording for a closed instance. It used to reach the screen
    // raw, which tells a student nothing about what to do next.
    expect(friendlyError('Signups not allowed for this instance')).toMatch(/waitlist/i)
    expect(friendlyError('signup_disabled')).toMatch(/waitlist/i)
  })

  it('still passes an unrecognised error through rather than guessing', () => {
    expect(friendlyError('Some error nobody has mapped')).toBe('Some error nobody has mapped')
  })
})

describe('needsPassword', () => {
  const withMeta = (meta: Record<string, unknown>) => ({ user_metadata: meta }) as unknown as User

  it('is true for an account that was invited and has no password yet', () => {
    expect(needsPassword(withMeta({ needs_password: true }))).toBe(true)
  })

  it('is false once the password is set, and for anyone never invited', () => {
    expect(needsPassword(withMeta({ needs_password: false }))).toBe(false)
    expect(needsPassword(withMeta({}))).toBe(false)
    expect(needsPassword(null)).toBe(false)
    expect(needsPassword(undefined)).toBe(false)
  })

  it('does not accept a merely truthy value', () => {
    // The flag is written by a script. Anything other than the boolean it
    // writes must not put a student in front of a password screen, because
    // this gate outranks every other screen in the app.
    expect(needsPassword(withMeta({ needs_password: 'yes' }))).toBe(false)
    expect(needsPassword(withMeta({ needs_password: 1 }))).toBe(false)
  })
})

describe('auth errors left in the URL', () => {
  it('reads the error wherever the flow put it', () => {
    // PKCE returns it in the query, implicit in the fragment, and which one
    // we get is not ours to choose.
    expect(parseAuthError('?error_code=signup_disabled&error_description=Signups+not+allowed', ''))
      .toBe('Signups not allowed')
    expect(parseAuthError('', '#error=server_error&error_description=Signups%20not%20allowed'))
      .toBe('Signups not allowed')
  })

  it('falls back to the code when there is no description', () => {
    expect(parseAuthError('?error_code=signup_disabled', '')).toBe('signup_disabled')
    expect(parseAuthError('', '#error=server_error')).toBe('server_error')
  })

  it('finds nothing in a clean URL or in one of our own hash routes', () => {
    expect(parseAuthError('', '')).toBeNull()
    expect(parseAuthError('', '#/dashboard/financial-aid/deadlines')).toBeNull()
    expect(parseAuthError('?timing', '')).toBeNull()
  })

  it('takes the error off the URL, so a reload does not show it again', () => {
    window.history.replaceState({}, '', '/?error_code=signup_disabled')
    expect(takeAuthErrorFromUrl()).toBe('signup_disabled')
    expect(window.location.search).toBe('')
    expect(takeAuthErrorFromUrl()).toBeNull()
  })

  it('leaves a clean URL untouched', () => {
    window.history.replaceState({}, '', '/#/dashboard')
    expect(takeAuthErrorFromUrl()).toBeNull()
    expect(window.location.hash).toBe('#/dashboard')
  })
})

describe('completePasswordReset', () => {
  beforeEach(() => { H.updateUser.mockReset() })

  it('clears the invite flag in the same call that sets the password', async () => {
    // Two separate writes could half-fail and leave an invited student on the
    // choose-a-password screen with a password that is already set.
    H.updateUser.mockResolvedValue({ error: null })
    const { error } = await completePasswordReset('a-good-password')
    expect(error).toBeNull()
    expect(H.updateUser).toHaveBeenCalledWith({
      password: 'a-good-password',
      data: { needs_password: false },
    })
  })

  it('reports a refused password instead of moving on', async () => {
    H.updateUser.mockResolvedValue({ error: { message: 'Password is too weak' } })
    const { error } = await completePasswordReset('short')
    expect(error).toBe('Password is too weak')
  })
})

describe('friendlyGoogleError', () => {
  it('reads a bare server error on the Google grant as the invite wall', () => {
    // GoTrue does refuse the account when signups are off, but the id_token
    // grant reports that refusal as "Internal Server Error" rather than the
    // signups-disabled message the redirect flow gives (supabase/auth#1677).
    // That is the live path in production, so unmapped it reads as a crash.
    expect(friendlyGoogleError('Internal Server Error')).toMatch(/invite-only/i)
    expect(friendlyGoogleError('server_error')).toMatch(/invite-only/i)
  })

  it('leaves every other Google failure to the shared mapping', () => {
    // Relabelling these would turn a real outage into an invite problem.
    expect(friendlyGoogleError('Invalid login credentials')).toBe('Incorrect email or password.')
    expect(friendlyGoogleError('Nothing has mapped this')).toBe('Nothing has mapped this')
  })
})
