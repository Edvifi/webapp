import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from './contexts/AuthContext'
import { saveOnboardingData } from './lib/profiles'
import AuthScreen from './components/AuthScreen'
import SplashScreen from './components/SplashScreen'
import GradePicker from './components/GradePicker'
import TimelineZoomed from './components/TimelineZoomed'
import DemographicSurvey from './components/DemographicSurvey'
import AnalyzingScreen from './components/AnalyzingScreen'
import Dashboard from './components/Dashboard'
import WelcomeBackScreen from './components/WelcomeBackScreen'
import { signOut } from './lib/auth'
import { useToast } from './contexts/ToastContext'
import ResetPasswordScreen from './components/ResetPasswordScreen'
import { resolvePreferences } from './lib/preferences'
import { useThemePref } from './lib/theme'
import type { Demographics } from './types/user'

type Screen = 'loading' | 'auth' | 'welcome-back' | 'splash' | 'picker' | 'timeline' | 'demographics' | 'analyzing' | 'dashboard'

export default function App() {
  const { user, profile, loading, profileReady, refreshProfile, recovering } = useAuth()
  const toast = useToast()

  // Apply the user's theme preference (falls back to light when signed out)
  useThemePref(resolvePreferences(profile?.settings).theme)

  const initialScreen = useMemo<Screen>(() => {
    if (loading) return 'loading'
    if (!user) return 'auth'
    // Signed in but the profile hasn't resolved yet (or a fetch is failing).
    // Keep loading rather than onboarding — a null profile here means a failed
    // fetch, not a new user (the profile row always exists).
    if (!profileReady) return 'loading'
    if (profile?.onboarding_complete) return 'welcome-back'
    return 'splash'
  }, [loading, user, profile, profileReady])

  const [screen, setScreen] = useState<Screen>('loading')
  const [startIdx, setStartIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [demographics, setDemographics] = useState<Demographics | null>(null)

  // Sync screen with auth state changes — only on real auth transitions,
  // not profile mutations mid-screen (which could bounce user back)
  const prevInitial = useRef(initialScreen)
  useEffect(() => {
    const prev = prevInitial.current
    prevInitial.current = initialScreen
    // Sync only on genuine auth transitions: initial load resolving (prev
    // 'loading'), sign-out (initialScreen 'auth'), or sign-in (prev 'auth').
    // NOT on profile-only changes mid-onboarding, which would bounce the user.
    if (prev === 'loading' || initialScreen === 'auth' || prev === 'auth') {
      setScreen(initialScreen)
    }
  }, [initialScreen])

  // For returning users, hydrate from profile
  const dashStartIdx = profile?.onboarding_complete ? (profile.grade_start_idx ?? 0) : startIdx
  const dashAnswers = profile?.onboarding_complete && screen === 'dashboard' && Object.keys(answers).length === 0
    ? (profile.answers ?? {})
    : answers
  const dashName = profile?.onboarding_complete
    ? (profile.display_name ?? null)
    : (demographics?.first_name ?? null)

  const handleGradeSelect = useCallback((idx: number) => {
    setStartIdx(idx)
    setScreen('timeline')
  }, [])

  const handleTimelineComplete = useCallback((ans: Record<string, number>) => {
    setAnswers(ans)
    setScreen('demographics')
  }, [])

  const handleDemographicsComplete = useCallback((demo: Demographics) => {
    setDemographics(demo)
    setScreen('analyzing')
  }, [])

  const handleAnalyzingComplete = useCallback(() => {
    // Navigate to the dashboard immediately. The dashboard renders from the
    // local onboarding state (demographics + answers), so it must NOT wait on
    // the network — a slow or hung Supabase request would otherwise trap the
    // user on the "All set" screen indefinitely (no request timeout).
    setScreen('dashboard')

    // Persist in the background. Retry transient failures — if the save never
    // lands, onboarding_complete stays false and the user would be sent back
    // through the whole flow on their next visit.
    if (user && demographics) {
      void (async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await saveOnboardingData(user.id, startIdx, answers, demographics)
            await refreshProfile()
            return
          } catch {
            if (attempt < 2) await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
          }
        }
      })()
    }
  }, [user, startIdx, answers, demographics, refreshProfile])

  const handleSignOut = useCallback(async () => {
    const { error, clearedLocally } = await signOut()
    setScreen('auth')
    if (error) {
      // The session is off this device either way, so the student is safe to
      // walk away; say what did and did not happen rather than nothing.
      toast.info(
        clearedLocally
          ? "Signed out on this device. We couldn't reach the server, so you may still be signed in elsewhere."
          : 'Signed out.',
      )
    }
  }, [toast])

  const renderScreen = () => {
    // Recovery outranks every other screen. The student arrived from a reset
    // email and is signed in but still does not know their password, so
    // anything else here — dashboard included — is a dead end for them.
    if (recovering) return <ResetPasswordScreen key="reset" />
    switch (screen) {
      case 'loading':
        return <motion.div key="loading" className="wb-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><div className="wb-grain" /></motion.div>
      case 'auth':
        return <AuthScreen key="auth" />
      case 'welcome-back':
        return <WelcomeBackScreen key="wb" firstName={profile?.display_name} onComplete={() => setScreen('dashboard')} />
      case 'splash':
        return <SplashScreen key="splash" onComplete={() => setScreen('picker')} />
      case 'picker':
        return <GradePicker key="picker" onSelect={handleGradeSelect} />
      case 'timeline':
        return <TimelineZoomed key="timeline" startIdx={startIdx} onComplete={handleTimelineComplete} />
      case 'demographics':
        return <DemographicSurvey key="demographics" onComplete={handleDemographicsComplete} />
      case 'analyzing':
        return <AnalyzingScreen key="analyzing" onComplete={handleAnalyzingComplete} />
      case 'dashboard':
        return <Dashboard key="dashboard" startIdx={dashStartIdx} answers={dashAnswers} firstName={dashName} onSignOut={handleSignOut} />
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {renderScreen()}
      </AnimatePresence>
    </div>
  )
}
