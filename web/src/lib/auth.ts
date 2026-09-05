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
