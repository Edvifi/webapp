import { useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import SplashScreen from './components/SplashScreen'
import GradePicker from './components/GradePicker'
import TimelineZoomed from './components/TimelineZoomed'
import AnalyzingScreen from './components/AnalyzingScreen'
import Dashboard from './components/Dashboard'

type Screen = 'splash' | 'picker' | 'timeline' | 'analyzing' | 'dashboard'

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [startIdx, setStartIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})

  const handleGradeSelect = useCallback((idx: number) => {
    setStartIdx(idx)
    setScreen('timeline')
  }, [])

  const handleTimelineComplete = useCallback((ans: Record<string, number>) => {
    setAnswers(ans)
    setScreen('analyzing')
  }, [])

  const renderScreen = () => {
    switch (screen) {
      case 'splash':
        return <SplashScreen key="splash" onComplete={() => setScreen('picker')} />
      case 'picker':
        return <GradePicker key="picker" onSelect={handleGradeSelect} />
      case 'timeline':
        return <TimelineZoomed key="timeline" startIdx={startIdx} onComplete={handleTimelineComplete} />
      case 'analyzing':
        return <AnalyzingScreen key="analyzing" onComplete={() => setScreen('dashboard')} />
      case 'dashboard':
        return <Dashboard key="dashboard" startIdx={startIdx} answers={answers} />
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
