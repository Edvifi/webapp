import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getProfile } from '../lib/profiles'
import type { UserProfile } from '../types/user'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  /** True once a profile fetch has RESOLVED (a row, or a genuine "no row"). */
  profileReady: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  profileReady: false,
  refreshProfile: async () => {},
})

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider
export function useAuth() {
  return useContext(AuthContext)
}

/** Reject after `ms` so a stalled promise can't hang an awaited caller. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    p.then(
      (v) => { clearTimeout(t); resolve(v) },
      (e) => { clearTimeout(t); reject(e) },
    )
  })
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  // True once a profile fetch has RESOLVED (a row, or a genuine "no row" for a
  // brand-new user). Stays false while a fetch keeps failing — App treats a
  // signed-in user without a resolved profile as "still loading", never as a
  // new user to onboard. The profile row always exists, so a failed fetch must
  // not drop a returning user into onboarding.
  const [profileReady, setProfileReady] = useState(false)
  // True as soon as the listener starts processing — used to distinguish
  // "listener hasn't fired" (timeout should bail) from "listener is still
  // awaiting fetchProfile" (timeout should NOT bail, or we'd show an
  // intermediate user=set/profile=null state and route to splash).
  const listenerFired = useRef(false)
  // Id of the currently-signed-in user, so we only gate the UI on the profile
  // fetch when the user actually changes (initial load / sign-in) rather than
  // on every token refresh.
  const currentUid = useRef<string | null>(null)

  const fetchProfile = useCallback(async (uid: string): Promise<boolean> => {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        // Bound each attempt: this fetch gates the loading screen, so a stalled
        // Supabase call must not hang it. null = a genuine "no row".
        const p = await withTimeout(getProfile(uid), 6000)
        setProfile(p)
        setProfileReady(true)
        return true
      } catch {
        // The profile row always exists (created by a trigger on signup), so a
        // failure here is a transient network / stale-token issue, not a new
        // user. Retry with backoff — Supabase auto-refreshes the access token
        // itself, so we just give it time (an explicit refreshSession() here
        // races that rotation and can sign the user out). Never give up into a
        // null profile, which would misroute a returning user into onboarding.
        if (attempt < 4) await new Promise(r => setTimeout(r, 600 * (attempt + 1)))
      }
    }
    return false // stay unready; App keeps loading and a retry recovers it
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

  useEffect(() => {
    // Use onAuthStateChange as the single source of truth.
    // The listener fires INITIAL_SESSION on subscribe, so it's the
    // authoritative way to discover whether we have a cached session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        listenerFired.current = true
        const u = session?.user ?? null
        const prevUid = currentUid.current
        currentUid.current = u?.id ?? null

        if (u) {
          setUser(u)
          if (u.id !== prevUid) {
            // New signed-in user (initial load or sign-in): stay in the loading
            // state until the profile resolves, so App never sees a "user set,
            // profile null" render and misroutes a returning, onboarded user
            // into onboarding (splash → timeline) before the profile arrives.
            setProfileReady(false)
            setLoading(true)
            await fetchProfile(u.id)
            setLoading(false)
          } else {
            // Same user (token refresh, tab refocus): refresh the profile in the
            // background. Do NOT toggle loading — flipping it would make App
            // re-sync and bounce the user off their current screen.
            void fetchProfile(u.id)
          }
        } else {
          setUser(null)
          setProfile(null)
          setProfileReady(false)
          setLoading(false)
        }
      },
    )

    // Defensive fallback: if the listener never fires (pathological
    // network case), give up after a delay so the user lands on the
    // auth screen instead of staring at a blank loading view.
    // Critically: do NOT bail if the listener has already started
    // processing — that would show an intermediate user=set/profile=null
    // state and route an existing user into the new-account flow.
    const timeout = setTimeout(() => {
      if (!listenerFired.current) setLoading(false)
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [fetchProfile])

  // Recovery: if we have a signed-in user but the profile never resolved (all
  // fetch attempts failed), keep retrying so the user recovers to their real
  // screen instead of being stuck on loading — and is never misrouted into
  // onboarding.
  useEffect(() => {
    if (!user || profileReady || loading) return
    const t = setTimeout(() => { void fetchProfile(user.id) }, 3000)
    return () => clearTimeout(t)
  }, [user, profileReady, loading, fetchProfile])

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileReady, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
