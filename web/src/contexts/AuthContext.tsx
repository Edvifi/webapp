import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getProfile } from '../lib/profiles'
import type { UserProfile } from '../types/user'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
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
  // True as soon as the listener starts processing — used to distinguish
  // "listener hasn't fired" (timeout should bail) from "listener is still
  // awaiting fetchProfile" (timeout should NOT bail, or we'd show an
  // intermediate user=set/profile=null state and route to splash).
  const listenerFired = useRef(false)
  // Id of the currently-signed-in user, so we only gate the UI on the profile
  // fetch when the user actually changes (initial load / sign-in) rather than
  // on every token refresh.
  const currentUid = useRef<string | null>(null)

  const fetchProfile = useCallback(async (uid: string) => {
    // The profile row always exists (created by a trigger on signup), so a
    // failed fetch is almost always a transient error rather than a genuinely
    // absent profile. Retry a few times before giving up, otherwise a blip
    // would drop a returning, onboarded user back into the onboarding flow.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // Bound each attempt: this fetch gates the loading screen on the
        // initial/sign-in path, so a stalled Supabase call must not hang it.
        const p = await withTimeout(getProfile(uid), 6000) // null only for a genuine "no row"
        setProfile(p)
        return
      } catch {
        if (attempt < 2) await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
      }
    }
    // Exhausted retries — leave profile null so the user isn't stuck loading.
    setProfile(null)
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

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
