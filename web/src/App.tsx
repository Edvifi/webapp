import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import GradePicker from './components/GradePicker'
import TimelineScreen from './components/TimelineScreen'
import TimelineZoomed from './components/TimelineZoomed'

// Toggle this to switch between variants
const USE_ZOOMED = true

export default function App() {
  const [startIdx, setStartIdx] = useState<number | null>(null)

  const Timeline = USE_ZOOMED ? TimelineZoomed : TimelineScreen

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {startIdx === null ? (
          <GradePicker key="picker" onSelect={setStartIdx} />
        ) : (
          <Timeline key="timeline" startIdx={startIdx} />
        )}
      </AnimatePresence>
    </div>
  )
}
