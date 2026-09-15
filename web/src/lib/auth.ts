import type { AuthError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { clearFafsaCaches } from './fafsaData'

export function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
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
 * Change the password, after proving the person at the keyboard knows the old
 * one.
 *
 * `updateUser` alone only needs a live session, so on a shared school computer
 * anyone who reached a walked-away tab could set a new password and take the
 * account permanently. Re-authenticating first makes a live session
 * insufficient on its own.
 *
 * A wrong current password is reported as exactly that, and never as a sign-in
 * failure, so a student is not left wondering whether they have been signed out.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ error: string | null }> {
  const { data: userData } = await supabase.auth.getUser()
  const email = userData.user?.email
  if (!email) return { error: 'You need to be signed in to change your password.' }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (reauthError) return { error: 'That current password is not right.' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return { error: error ? error.message : null }
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
export async function sendPasswordReset(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/#reset`,
  })
  // A rate-limit response is worth surfacing; anything else is swallowed on
  // purpose so the reply does not reveal whether the address is registered.
  if (error && error.status === 429) {
    return { error: 'Too many attempts. Wait a minute and try again.' }
  }
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
