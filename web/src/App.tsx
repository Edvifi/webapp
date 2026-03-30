import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import GradePicker from './components/GradePicker'
import TimelineScreen from './components/TimelineScreen'

export default function App() {
  const [startIdx, setStartIdx] = useState<number | null>(null)

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {startIdx === null ? (
          <GradePicker key="picker" onSelect={setStartIdx} />
        ) : (
          <TimelineScreen key="timeline" startIdx={startIdx} />
        )}
      </AnimatePresence>
    </div>
  )
}
