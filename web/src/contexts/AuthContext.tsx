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

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)
  // True as soon as the listener starts processing — used to distinguish
  // "listener hasn't fired" (timeout should bail) from "listener is still
  // awaiting fetchProfile" (timeout should NOT bail, or we'd show an
  // intermediate user=set/profile=null state and route to splash).
  const listenerFired = useRef(false)

  const fetchProfile = useCallback(async (uid: string) => {
    try {
      const p = await getProfile(uid)
      setProfile(p)
    } catch {
      // Network or permission error — leave profile null so user isn't stuck
      setProfile(null)
    }
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
        setUser(u)
        if (u) {
          await fetchProfile(u.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
        initialized.current = true
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
