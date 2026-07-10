/**
 * SplashScreen
 *
 * Logo appears big and centered → shrinks and floats up →
 * "Welcome to Edvifi" types out below → tagline fades in → auto-advances.
 */

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface Props {
  onComplete: () => void
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const
const TITLE = 'Welcome to Edvifi'
const CHAR_DELAY = 0.045
const TITLE_DUR = TITLE.length * CHAR_DELAY

const LOGO_SETTLE_DELAY = 1400
const TITLE_SHOW_DELAY = 2400
const TAGLINE_SHOW_DELAY = TITLE_SHOW_DELAY + (TITLE_DUR + 0.6) * 1000
const EXIT_DELAY = 6000
const COMPLETE_DELAY = 6700

export default function SplashScreen({ onComplete }: Props) {
  const [logoSettled, setLogoSettled] = useState(false)
  const [showTitle, setShowTitle] = useState(false)
  const [showTagline, setShowTagline] = useState(false)
  const [exiting, setExiting] = useState(false)

  // Stash callback in a ref so the timed sequence isn't reset on parent
  // re-renders (App passes a fresh onComplete each render).
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => {
    // Phase 1: logo big and centered (0–1.4s)
    // Phase 2: logo shrinks and moves up (1.4–2.2s)
    const t0 = setTimeout(() => setLogoSettled(true), LOGO_SETTLE_DELAY)
    // Phase 3: title types out (2.4s+)
    const t1 = setTimeout(() => setShowTitle(true), TITLE_SHOW_DELAY)
    // Phase 4: tagline
    const t2 = setTimeout(() => setShowTagline(true), TAGLINE_SHOW_DELAY)
    // Phase 5: exit
    const t3 = setTimeout(() => setExiting(true), EXIT_DELAY)
    const t4 = setTimeout(() => onCompleteRef.current(), COMPLETE_DELAY)
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  return (
    <motion.div
      className="splash"
      animate={{ opacity: exiting ? 0 : 1, scale: exiting ? 1.03 : 1 }}
      transition={{ duration: 0.7, ease: EASE_OUT }}
    >
      <div className="splash-grain" />
      <div className="splash-orb splash-orb--1" />
      <div className="splash-orb splash-orb--2" />
      <div className="splash-orb splash-orb--3" />

      <div className="splash-content">
        {/* Logo — starts big and centered, shrinks up to resting position */}
        <motion.div
          className="splash-logo"
          initial={{ opacity: 0, scale: 2.2, y: 80 }}
          animate={
            logoSettled
              ? { opacity: 1, scale: 1, y: 0 }
              : { opacity: 1, scale: 2.2, y: 80 }
          }
          transition={
            logoSettled
              ? { duration: 0.9, ease: [0.34, 1.2, 0.64, 1] }
              : { duration: 0.8, ease: EASE_OUT }
          }
        >
          <img src="/logos/logo-color.png" alt="Edvifi" className="splash-logo-img" />
        </motion.div>

        {/* Title — types out after logo settles */}
        <h1 className="splash-title">
          {TITLE.split('').map((char, i) => {
            const isAccent = i >= 11
            return (
              <motion.span
                key={i}
                className={`splash-char ${isAccent ? 'splash-char--accent' : ''}`}
                initial={{ opacity: 0, y: 8 }}
                animate={showTitle ? { opacity: 1, y: 0 } : {}}
                transition={{
                  delay: i * CHAR_DELAY,
                  duration: 0.35,
                  ease: EASE_OUT,
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            )
          })}
        </h1>

        {/* Tagline */}
        <motion.p
          className="splash-tagline"
          initial={{ opacity: 0, y: 10 }}
          animate={showTagline ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        >
          Let's map out your college journey together.
        </motion.p>

        {/* Loading dots */}
        <motion.div
          className="splash-dots"
          initial={{ opacity: 0 }}
          animate={showTagline ? { opacity: 1 } : {}}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <span className="splash-dot" />
          <span className="splash-dot" />
          <span className="splash-dot" />
        </motion.div>
      </div>

      <motion.button
        className="splash-skip"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 2.5, duration: 0.5 }}
        whileHover={{ opacity: 0.7 }}
        onClick={() => { setExiting(true); setTimeout(onComplete, 600) }}
      >
        Skip →
      </motion.button>
    </motion.div>
  )
}
