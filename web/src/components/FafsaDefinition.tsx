/**
 * FafsaDefinition — "What is the FAFSA?" typed intro overlay
 *
 * Rendered at Dashboard root level to cover sidebar.
 * Uses the same tour-intro animation style as other onboarding overlays.
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface Props {
  onDismiss: () => void
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

const LINE_1 = 'What is the FAFSA?'
const LINE_2 = "The FAFSA — Free Application for Federal Student Aid — is a form that unlocks access to grants, scholarships, work-study, and federal student loans."
const LINE_3 = "Almost every college in the U.S. uses it to determine how much aid you qualify for. Filing is free, and it takes about 30 minutes."
const CHAR_DELAY = 0.04
const L2_DELAY = LINE_1.length * CHAR_DELAY * 1000 + 700
const L3_DELAY = L2_DELAY + 1000
const BTN_DELAY = L3_DELAY + 1000

export default function FafsaDefinition({ onDismiss }: Props) {
  const [showText, setShowText] = useState(false)
  const [showL2, setShowL2] = useState(false)
  const [showL3, setShowL3] = useState(false)
  const [showBtn, setShowBtn] = useState(false)

  useEffect(() => {
    const t0 = setTimeout(() => setShowText(true), 300)
    const t1 = setTimeout(() => setShowL2(true), L2_DELAY)
    const t2 = setTimeout(() => setShowL3(true), L3_DELAY)
    const t3 = setTimeout(() => setShowBtn(true), BTN_DELAY)
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <motion.div
      className="tour-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div className="tour-intro" exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
        <div className="tour-intro-blur" />
        <div className="tour-intro-content" style={{ maxWidth: 520 }}>
          <h2 className="tour-intro-title">
            {LINE_1.split('').map((char, i) => (
              <motion.span
                key={i}
                className="tour-intro-char"
                initial={{ opacity: 0, y: 6 }}
                animate={showText ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * CHAR_DELAY, duration: 0.3, ease: EASE_OUT }}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </h2>
          <motion.p
            className="tour-intro-sub"
            initial={{ opacity: 0, y: 12 }}
            animate={showL2 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: EASE_OUT }}
          >
            {LINE_2}
          </motion.p>
          <motion.p
            className="tour-intro-sub"
            initial={{ opacity: 0, y: 12 }}
            animate={showL3 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: EASE_OUT }}
          >
            {LINE_3}
          </motion.p>
          <motion.button
            className="tour-intro-btn"
            initial={{ opacity: 0, y: 10 }}
            animate={showBtn ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            onClick={onDismiss}
          >
            Got it — let's dive in
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
