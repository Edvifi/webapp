/**
 * AnalyzingScreen
 *
 * Brief interstitial: "Analyzing your answers, customizing your dashboard..."
 * Shows a progress animation then auto-advances.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  onComplete: () => void
}

const STEPS = [
  'Reviewing your answers...',
  'Identifying focus areas...',
  'Customizing your dashboard...',
]

const EASE_OUT = [0.22, 1, 0.36, 1] as const

export default function AnalyzingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 1200)
    const t2 = setTimeout(() => setStep(2), 2400)
    const t3 = setTimeout(() => onComplete(), 3800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])

  return (
    <motion.div
      className="analyzing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5 }}
    >
      <div className="analyzing-grain" />

      <div className="analyzing-content">
        <motion.div
          className="analyzing-logo"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        >
          <img src="/logos/logo-color.png" alt="" className="analyzing-logo-img" />
        </motion.div>

        {/* Animated ring */}
        <motion.div className="analyzing-ring">
          <svg viewBox="0 0 60 60" width="60" height="60">
            <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(60,35,10,0.08)" strokeWidth="3" />
            <motion.circle
              cx="30" cy="30" r="26" fill="none"
              stroke="#2D9E72" strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={163}
              initial={{ strokeDashoffset: 163 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 3.5, ease: 'easeInOut' }}
              style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
            />
          </svg>
        </motion.div>

        {/* Steps */}
        <div className="analyzing-steps">
          {STEPS.map((text, i) => (
            <motion.p
              key={i}
              className="analyzing-step"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: step >= i ? 1 : 0.2, y: step >= i ? 0 : 8 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              <motion.span
                className="analyzing-check"
                initial={{ scale: 0 }}
                animate={{ scale: step > i ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                ✓
              </motion.span>
              {text}
            </motion.p>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
