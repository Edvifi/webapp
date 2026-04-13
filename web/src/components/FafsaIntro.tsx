/**
 * FafsaIntro — Animated intro before the Financial Aid module opens
 *
 * Same dark-blur overlay style as the journey intro / timeline instructions.
 * Plays once per session when user first clicks the Financial Aid module.
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface Props {
  onComplete: () => void
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

const HEADLINE = "Let's talk financial aid."
const SUBTEXT = "If you've ever felt unsure about paying for college — you're not alone. We're here to break it all down, step by step."
const CHAR_DELAY = 0.04
const SUB_DELAY = HEADLINE.length * CHAR_DELAY * 1000 + 800
const BTN_DELAY = SUB_DELAY + 1200

export default function FafsaIntro({ onComplete }: Props) {
  const [showText, setShowText] = useState(false)
  const [showSub, setShowSub] = useState(false)
  const [showBtn, setShowBtn] = useState(false)

  useEffect(() => {
    const t0 = setTimeout(() => setShowText(true), 400)
    const t1 = setTimeout(() => setShowSub(true), SUB_DELAY)
    const t2 = setTimeout(() => setShowBtn(true), BTN_DELAY)
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2) }
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
        <div className="tour-intro-content">
          <h2 className="tour-intro-title">
            {HEADLINE.split('').map((char, i) => (
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
            animate={showSub ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: EASE_OUT }}
          >
            {SUBTEXT}
          </motion.p>
          <motion.button
            className="tour-intro-btn"
            initial={{ opacity: 0, y: 10 }}
            animate={showBtn ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            onClick={onComplete}
          >
            Let's get started
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
