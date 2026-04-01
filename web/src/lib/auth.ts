import { supabase } from './supabase'

export function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({ provider: 'google' })
}

export function signInWithApple() {
  return supabase.auth.signInWithOAuth({ provider: 'apple' })
}

export function signOut() {
  return supabase.auth.signOut()
}
