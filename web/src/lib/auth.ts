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

export async function signOut() {
  try {
    return await supabase.auth.signOut()
  } finally {
    // Per-user caches live at module scope, so without this the next person to
    // sign in on this tab is served the previous student's tracked
    // scholarships and college list.
    clearFafsaCaches()
  }
}
