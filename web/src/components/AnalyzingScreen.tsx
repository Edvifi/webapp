/**
 * AnalyzingScreen
 *
 * Brief interstitial: "Analyzing your answers, customizing your dashboard..."
 * Shows a progress ring that fills, then a checkmark draws inside it.
 */

import { useEffect, useRef, useState } from 'react'
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

const STEP1_DELAY = 1200
const STEP2_DELAY = 2400
const DONE_DELAY = 3400
const COMPLETE_DELAY = 4600

export default function AnalyzingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)

  // Stash callback in a ref so the timed sequence isn't reset on parent
  // re-renders (e.g. an auth-context tick changing onComplete's identity).
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), STEP1_DELAY)
    const t2 = setTimeout(() => setStep(2), STEP2_DELAY)
    const t3 = setTimeout(() => { setStep(3); setDone(true) }, DONE_DELAY)
    const t4 = setTimeout(() => onCompleteRef.current(), COMPLETE_DELAY)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

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
          <img src="/logos/logo-color.png" alt="Edvifi" className="analyzing-logo-img" />
        </motion.div>

        {/* Animated ring + checkmark */}
        <motion.div className="analyzing-ring">
          <svg viewBox="0 0 60 60" width="60" height="60">
            {/* Background track */}
            <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(var(--line-rgb), 0.08)" strokeWidth="3" />

            {/* Progress fill */}
            <motion.circle
              cx="30" cy="30" r="26" fill="none"
              stroke="var(--c-fresh)" strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={163}
              initial={{ strokeDashoffset: 163 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 3.2, ease: 'easeInOut' }}
              style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
            />

            {/* Checkmark — draws itself after ring completes */}
            <motion.path
              d="M20 31 L27 38 L40 23"
              fill="none"
              stroke="var(--c-fresh)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={done ? { pathLength: 1, opacity: 1 } : {}}
              transition={{
                pathLength: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.1 },
              }}
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

        {/* Done message */}
        <motion.p
          className="analyzing-done"
          initial={{ opacity: 0, y: 6 }}
          animate={done ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.5, ease: EASE_OUT }}
        >
          All set!
        </motion.p>
      </div>
    </motion.div>
  )
}
