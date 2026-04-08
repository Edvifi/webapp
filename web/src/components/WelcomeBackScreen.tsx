/**
 * WelcomeBackScreen
 *
 * Brief loading screen for returning users.
 * Shows logo + personalized greeting + loading indicator,
 * then auto-advances to dashboard.
 */

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface Props {
  firstName?: string | null
  onComplete: () => void
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const

export default function WelcomeBackScreen({ firstName, onComplete }: Props) {
  // Stash callback in ref so the timer isn't reset on parent re-renders
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const t = setTimeout(() => onCompleteRef.current(), 2200)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div
      className="wb-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5 }}
    >
      <div className="wb-grain" />

      <div className="wb-content">
        <motion.div
          className="wb-logo"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        >
          <img src="/logos/logo-color.png" alt="Edvifi" className="wb-logo-img" />
        </motion.div>

        <motion.h1
          className="wb-greeting"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: EASE_OUT }}
        >
          {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        </motion.h1>

        <motion.p
          className="wb-sub"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5, ease: EASE_OUT }}
        >
          Loading your experience...
        </motion.p>

        <motion.div
          className="wb-dots"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.4 }}
        >
          <span className="wb-dot" />
          <span className="wb-dot" />
          <span className="wb-dot" />
        </motion.div>
      </div>

      <motion.button
        className="wb-skip"
        onClick={onComplete}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.4 }}
      >
        Skip
      </motion.button>
    </motion.div>
  )
}
