import type { AuthError } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * Minimum password length. Must match `password_min_length` in Supabase Auth:
 * a client that allows shorter lets a student type something the server will
 * reject, and they see a raw API error instead of the rule.
 */
export const MIN_PASSWORD_LENGTH = 8
import { clearFafsaCaches } from './fafsaData'

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

export function signInWithApple() {
  return supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: window.location.origin },
  })
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
  const { error } = await supabase.auth.updateUser({ password: newPassword })
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
    // scholarships and college list.
    clearFafsaCaches()
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
