import type { AuthError, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * Minimum password length. Must match `password_min_length` in Supabase Auth:
 * a client that allows shorter lets a student type something the server will
 * reject, and they see a raw API error instead of the rule.
 */
export const MIN_PASSWORD_LENGTH = 8
import { clearFafsaCaches } from './fafsaData'
import { clearRoute } from './hashRoute'

/**
 * Edvifi is invite-only while access goes out in waves.
 *
 * The lock itself is not in this file and cannot be: it is "Allow new users to
 * sign up", off, in Supabase Auth. A check here would be one anyone can step
 * over with a console open, and it would not cover Google at all, since that
 * account is created by Supabase before our code sees it. All this constant
 * does is stop the app offering a door the server will refuse to open.
 *
 * Flip it to false when signups open, and turn the Supabase setting back on in
 * the same change. One without the other is either a dead Create-account tab
 * or a front door nobody meant to leave open.
 */
export const INVITE_ONLY = true

/** Where someone without an invite is sent. The waitlist form lives here. */
export const WAITLIST_URL = 'https://edvifi.ai'

/**
 * True when this account was invited and has not chosen a password yet.
 *
 * Set by scripts/invite/invite.mjs as the invite goes out, cleared by
 * completePasswordReset below. It is needed because an invite link signs the
 * student straight in — auth-js emits SIGNED_IN for `type=invite`, only
 * `type=recovery` raises PASSWORD_RECOVERY — so without it they would land in
 * onboarding with no password set on the account at all, and find out on their
 * next device, where the only way in is "Forgot password" for a password they
 * never had.
 *
 * Read from the session rather than from the URL on purpose. auth-js consumes
 * the fragment before our code runs, and a query parameter would only survive
 * if the redirect allow-list happened to admit it; this flag is in every
 * session the account has until it is cleared.
 */
export function needsPassword(user: User | null | undefined): boolean {
  return user?.user_metadata?.needs_password === true
}

/**
 * Turn a raw Supabase auth error into something a student can act on.
 *
 * Anything unrecognised is passed through rather than swallowed: a wrong guess
 * at what went wrong is worse than the server's own words.
 */
export function friendlyError(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('invalid login credentials')) return 'Incorrect email or password.'
  if (lower.includes('email not confirmed')) return 'Please check your email to confirm your account.'
  if (lower.includes('user already registered')) return 'An account with this email already exists.'
  if (lower.includes('email rate limit')) return 'Too many attempts. Please try again later.'
  if (lower.includes('password should be')) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  if (lower.includes('invalid email') || lower.includes('unable to validate')) return 'Please enter a valid email address.'
  // Signups are closed, so this is somebody without an invite. Say what the
  // situation is and where to go, not "not allowed for this instance".
  if (lower.includes('signups not allowed') || lower.includes('signup_disabled') || lower.includes('signup is disabled')) {
    return 'Edvifi is invite-only right now. Join the waitlist at edvifi.ai and we’ll email you when it’s your turn.'
  }
  return msg
}

/**
 * friendlyError, for a Google sign-in.
 *
 * With signups off, GoTrue does refuse to create the account — the lock holds
 * — but the id_token grant reports that refusal as a bare "Internal Server
 * Error" rather than the signups-disabled message the redirect flow gives
 * (supabase/auth#1677, open since July 2024). That is the live path in
 * production, because VITE_GOOGLE_CLIENT_ID is set and the GIS button uses
 * this grant.
 *
 * Mapping that text inside friendlyError would relabel every genuine outage
 * in the app as an invite problem, so it is mapped only here, only while
 * access is invite-only — and worded so it is still true if the server really
 * did just fail.
 */
export function friendlyGoogleError(msg: string): string {
  if (INVITE_ONLY && /internal server error|server_error/i.test(msg)) {
    return 'We couldn’t sign you in with Google. Edvifi is invite-only right now — if you haven’t been invited yet, join the waitlist at edvifi.ai.'
  }
  return friendlyError(msg)
}

/**
 * The auth error Supabase left in the URL, if there is one.
 *
 * A stranger who presses "Continue with Google" while signups are closed is
 * redirected back here with the reason in the URL, not in the return value of
 * signInWithGoogle — so without reading it they land on the sign-in screen
 * with no explanation, which is the likeliest way this whole lock gets
 * experienced. auth-js throws on a URL error *before* it strips the
 * parameters (GoTrueClient `_getSessionFromURL` returns early on
 * `error_description`), so they are still there to read.
 *
 * Both halves of the URL are checked because which one carries the error
 * depends on the flow: PKCE puts it in the query, implicit in the fragment.
 *
 * Split from the window for the test.
 */
export function parseAuthError(search: string, hash: string): string | null {
  for (const raw of [search, hash]) {
    const params = new URLSearchParams(raw.replace(/^[?#]/, ''))
    const description = params.get('error_description')
    const code = params.get('error_code') ?? params.get('error')
    if (description) return description
    if (code) return code
  }
  return null
}

/**
 * Read the auth error out of the URL and take it off, so a reload does not
 * show it again. Only rewrites the URL when there was an error, in which case
 * what it drops is an OAuth callback with nothing in it worth keeping.
 */
export function takeAuthErrorFromUrl(): string | null {
  const found = parseAuthError(window.location.search, window.location.hash)
  if (found) window.history.replaceState(window.history.state, '', window.location.pathname)
  return found
}

/**
 * Captcha tokens are threaded through every public auth call so that enabling
 * CAPTCHA in Supabase is a config change rather than an outage. Until a site
 * key is configured the token is undefined and every call behaves exactly as
 * before; once it is, these are the calls the server expects it on.
 */
export function signUpWithEmail(email: string, password: string, captchaToken?: string) {
  return supabase.auth.signUp({ email, password, options: { captchaToken } })
}

export function signInWithEmail(email: string, password: string, captchaToken?: string) {
  return supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
}

export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
}

/**
 * Client ID for Google's own sign-in button. With it, Google's consent screen
 * names our domain instead of the Supabase project's; without it, the button
 * falls back to the redirect flow above.
 */
export const GOOGLE_CLIENT_ID: string | undefined = googleClientId(import.meta.env.VITE_GOOGLE_CLIENT_ID)

/**
 * A client id only counts if it is shaped like one.
 *
 * Production once held `http://<id>.apps.googleusercontent.com` — the id with a
 * scheme pasted onto the front. Any non-empty string was enough to switch the
 * GIS button on, so students got Google's "Error 401: invalid_client" page and
 * no way to sign in, where an absent value would have fallen back to the
 * redirect flow and worked. A wrong value should fail the same way a missing
 * one does.
 *
 * The check is deliberately loose: it rejects what is obviously not an id
 * rather than trying to match Google's format exactly. Pinning the exact
 * shape would reject the older `<number>.apps.googleusercontent.com` form, and
 * an id refused for being unfamiliar fails silently — the button simply is not
 * there — which is harder to trace than the error page this exists to prevent.
 *
 * Exported for the test; use GOOGLE_CLIENT_ID.
 */
export function googleClientId(raw: string | undefined): string | undefined {
  const v = raw?.trim()
  if (!v || !v.endsWith('.apps.googleusercontent.com')) return undefined
  // A scheme, a slash or any whitespace means something was pasted around it.
  return /[\s/]|:\/\// .test(v) ? undefined : v
}

/**
 * Google puts the nonce it is given into the ID token verbatim, and Supabase
 * hashes the one it is given before comparing. So Google gets the SHA-256 hex
 * and Supabase the raw value; swap them and every sign-in is rejected.
 */
export async function makeGoogleNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = crypto.randomUUID()
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hashed = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return { raw, hashed }
}

export function signInWithGoogleIdToken(token: string, nonce: string, captchaToken?: string) {
  return supabase.auth.signInWithIdToken({ provider: 'google', token, nonce, options: { captchaToken } })
}

/**
 * Change the password, proving the person at the keyboard knows the old one.
 *
 * `updateUser` alone needs only a live session, so on a shared school computer
 * anyone reaching a walked-away tab could set a new password and take the
 * account permanently.
 *
 * `current_password` sends the check to the SERVER, which is what makes it a
 * control rather than a courtesy: a client-side check is bypassed by anyone
 * with a console. It needs "Require current password when changing password"
 * enabled in Supabase Auth to be enforced — until then the call still succeeds,
 * so this also verifies the password itself before sending, and the belt and
 * braces are deliberate.
 *
 * Verifying locally uses getUser rather than a second sign-in: signing in again
 * would mint a whole new session mid-change, which is a real side effect for a
 * student halfway through something.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ error: string | null }> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) {
    // A network blip is not the same as being signed out, and saying so would
    // send a student off hunting for a problem that is not theirs.
    return { error: "Couldn't reach the server — check your connection and try again." }
  }
  const email = userData.user?.email
  if (!email) return { error: 'You need to be signed in to change your password.' }

  const { error } = await supabase.auth.updateUser({
    current_password: currentPassword,
    password: newPassword,
  })
  if (!error) return { error: null }

  // The server rejects a wrong current password with its own wording; say the
  // plain thing instead, and never dress it up as a sign-in failure.
  if (/current password|invalid|credential/i.test(error.message)) {
    return { error: 'That current password is not right.' }
  }
  return { error: error.message }
}

/**
 * Set a new password during recovery, without asking for the old one.
 *
 * Deliberately skips the re-authentication that `changePassword` requires: the
 * student followed a link sent to their own inbox, which is what proves
 * identity here. Asking for the current password would be asking for the thing
 * they came to reset.
 */
export async function completePasswordReset(newPassword: string): Promise<{ error: string | null }> {
  // Clearing needs_password in the same call keeps the two in step. A separate
  // write could fail on its own and leave an invited student stuck on the
  // choose-a-password screen with a password that is already set.
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    data: { needs_password: false },
  })
  return { error: error ? error.message : null }
}

/**
 * Send a password-reset link. Always reports success: telling an unknown
 * address apart from a known one would let anyone check which students have
 * accounts here.
 */
export async function sendPasswordReset(
  email: string,
  captchaToken?: string,
): Promise<{ error: string | null }> {
  // Bare origin, byte-identical to the OAuth redirects above, so it matches the
  // same allow-list entry. Recovery is driven by the auth event, so the
  // `#reset` fragment this used to carry bought nothing and risked failing the
  // match.
  await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
    captchaToken,
  })
  // Every outcome reports the same thing, including rate limiting. Surfacing a
  // 429 would have been a registration oracle all by itself: only an address
  // that exists can be throttled, so "too many attempts" answers the question
  // the silence was there to avoid.
  return { error: null }
}

/**
 * Sign out, and make sure the session is really gone from this device.
 *
 * supabase-js returns early when its server call fails and never reaches the
 * step that removes the stored session, so on a dropped connection the tab is
 * left signed in while the app shows the login screen. On a shared school
 * computer the next person to reload lands in the previous student's account.
 *
 * When the server call fails we clear the stored session ourselves. The access
 * token stays valid until it expires — we cannot revoke it without the network
 * — but it is no longer on this device, which is the part that matters here.
 */
export async function signOut(): Promise<{ error: AuthError | null; clearedLocally: boolean }> {
  try {
    const { error } = await supabase.auth.signOut()
    if (!error) return { error: null, clearedLocally: false }
    clearStoredSession()
    return { error, clearedLocally: true }
  } finally {
    // Per-user caches live at module scope, so without this the next person to
    // sign in on this tab is served the previous student's tracked
    // scholarships and college list, and opens wherever they last were.
    clearFafsaCaches()
    clearRoute()
  }
}

/** Remove supabase's stored session. Keys are `sb-<project-ref>-auth-token`. */
function clearStoredSession() {
  try {
    const store = window.localStorage
    // Collect first: removing while iterating by index skips entries.
    const stale: string[] = []
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i)
      if (key && key.startsWith('sb-') && key.includes('-auth-token')) stale.push(key)
    }
    for (const key of stale) store.removeItem(key)
  } catch {
    // Storage unavailable (private mode, blocked cookies). Nothing further we
    // can do from here; the caller still shows the signed-out screen.
  }
}

/** Typed by the student to confirm deletion. Deliberately not a single click. */
export const DELETE_CONFIRM_PHRASE = 'DELETE'

/**
 * Delete the signed-in account and everything attached to it.
 *
 * The work happens in the `delete-account` edge function, because removing a
 * row from `auth.users` needs the service role key and that must never reach a
 * browser. Every per-user table cascades from it.
 *
 * Resolves with `incomplete` naming any table whose rows survived the cascade.
 * The account is gone either way by then — the caller's job is to say so
 * honestly rather than claim a clean sweep.
 */
export async function deleteAccount(
  confirm: string,
): Promise<{ error: string | null; incomplete?: string[] }> {
  if (confirm !== DELETE_CONFIRM_PHRASE) {
    return { error: `Type ${DELETE_CONFIRM_PHRASE} to confirm.` }
  }
  const { data, error } = await supabase.functions.invoke<{
    deleted?: boolean
    incomplete?: string[]
    error?: string
  }>('delete-account', { body: { confirm } })

  if (error) return { error: 'Could not delete the account — try again.' }
  if (typeof data?.error === 'string' && data.error) return { error: data.error }
  if (!data?.deleted) return { error: 'Could not delete the account — try again.' }
  return { error: null, incomplete: data.incomplete }
}
