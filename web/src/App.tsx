import { useState, useCallback, useEffect, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from './contexts/AuthContext'
import { saveOnboardingData } from './lib/profiles'
import LoadingScreen from './components/LoadingScreen'
import AuthScreen from './components/AuthScreen'
import SplashScreen from './components/SplashScreen'
import GradePicker from './components/GradePicker'
import TimelineZoomed from './components/TimelineZoomed'
import AnalyzingScreen from './components/AnalyzingScreen'
import Dashboard from './components/Dashboard'
import { signOut } from './lib/auth'

type Screen = 'loading' | 'auth' | 'splash' | 'picker' | 'timeline' | 'analyzing' | 'dashboard'

export default function App() {
  const { user, profile, loading, refreshProfile } = useAuth()

  const initialScreen = useMemo<Screen>(() => {
    if (loading) return 'loading'
    if (!user) return 'auth'
    if (profile?.onboarding_complete) return 'dashboard'
    return 'splash'
  }, [loading, user, profile])

  const [screen, setScreen] = useState<Screen>('loading')
  const [startIdx, setStartIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})

  // Sync screen with auth state changes
  useEffect(() => {
    setScreen(initialScreen)
  }, [initialScreen])

  // For returning users, hydrate from profile
  const dashStartIdx = profile?.onboarding_complete ? (profile.grade_start_idx ?? 0) : startIdx
  const dashAnswers = profile?.onboarding_complete && screen === 'dashboard' && Object.keys(answers).length === 0
    ? (profile.answers ?? {})
    : answers

  const handleGradeSelect = useCallback((idx: number) => {
    setStartIdx(idx)
    setScreen('timeline')
  }, [])

  const handleTimelineComplete = useCallback((ans: Record<string, number>) => {
    setAnswers(ans)
    setScreen('analyzing')
  }, [])

  const handleAnalyzingComplete = useCallback(async () => {
    if (user) {
      try {
        await saveOnboardingData(user.id, startIdx, answers)
        await refreshProfile()
      } catch {
        // Still show dashboard even if save fails
      }
    }
    setScreen('dashboard')
  }, [user, startIdx, answers, refreshProfile])

  const handleSignOut = useCallback(async () => {
    await signOut()
    setScreen('auth')
  }, [])

  const renderScreen = () => {
    switch (screen) {
      case 'loading':
        return <LoadingScreen key="loading" />
      case 'auth':
        return <AuthScreen key="auth" />
      case 'splash':
        return <SplashScreen key="splash" onComplete={() => setScreen('picker')} />
      case 'picker':
        return <GradePicker key="picker" onSelect={handleGradeSelect} />
      case 'timeline':
        return <TimelineZoomed key="timeline" startIdx={startIdx} onComplete={handleTimelineComplete} />
      case 'analyzing':
        return <AnalyzingScreen key="analyzing" onComplete={handleAnalyzingComplete} />
      case 'dashboard':
        return <Dashboard key="dashboard" startIdx={dashStartIdx} answers={dashAnswers} onSignOut={handleSignOut} />
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
