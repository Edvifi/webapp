import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { YEAR_GROUPS, YEAR_START_IDX } from '../data/timelineData'
import { useAuth } from '../contexts/AuthContext'
import { markIntroSeen } from '../lib/profiles'
import { mono } from '../lib/designTokens'

interface Props {
  onSelect: (startIdx: number) => void
}

const CARDS = [
  { emoji: '🌱', tagline: 'Build the foundation — no pressure, just explore.', num: '9' },
  { emoji: '📚', tagline: 'Start looking ahead. College is closer than you think.', num: '10' },
  { emoji: '⚡', tagline: 'The most critical year. This is where it all comes together.', num: '11' },
  { emoji: '🎓', tagline: "You've put in the work. Now let's cross the finish line.", num: '12' },
]

const EASE_OUT = [0.22, 1, 0.36, 1] as const

// ─── Journey intro overlay — matches TimelineInstructions intro style ────────
const INTRO_TEXT = "We'll help map your journey."
const INTRO_SUB = "If you're unsure about anything along the way — that's completely normal. We're here to guide you through every step."
const CHAR_DELAY = 0.04
const SUB_DELAY = INTRO_TEXT.length * CHAR_DELAY * 1000 + 800
const BTN_DELAY = SUB_DELAY + 1200

function JourneyIntro({ onDismiss }: { onDismiss: () => void }) {
  const [showIntroText, setShowIntroText] = useState(false)
  const [showSub, setShowSub] = useState(false)
  const [showBtn, setShowBtn] = useState(false)

  useEffect(() => {
    const t0 = setTimeout(() => setShowIntroText(true), 400)
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
            {INTRO_TEXT.split('').map((char, i) => (
              <motion.span
                key={i}
                className="tour-intro-char"
                initial={{ opacity: 0, y: 6 }}
                animate={showIntroText ? { opacity: 1, y: 0 } : {}}
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
            {INTRO_SUB}
          </motion.p>
          <motion.button
            className="tour-intro-btn"
            initial={{ opacity: 0, y: 10 }}
            animate={showBtn ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            onClick={onDismiss}
          >
            Let's get started
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Grade picker ───────────────────────────────────────────────────────────
export default function GradePicker({ onSelect }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const [showIntro, setShowIntro] = useState(() => !profile?.settings?.intros_seen?.includes('journey'))

  return (
    <motion.div
      className="picker"
      exit={{ opacity: 0, scale: 0.97, y: -30 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="picker-grain" />
      <div className="picker-orb picker-orb--1" />
      <div className="picker-orb picker-orb--2" />

      {/* Logo top-left */}
      <motion.div
        className="picker-logo-corner"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05, duration: 0.5 }}
      >
        <img src="/logos/logo-color.png" alt="Edvifi" className="picker-logo-img" />
      </motion.div>

      <div className="picker-content">
        <motion.div
          className="picker-wordmark"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.6, ease: 'easeOut' }}
        >
          edvifi
        </motion.div>

        <motion.p
          className="picker-eyebrow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.5 }}
        >
          College Roadmap
        </motion.p>

        <motion.h1
          className="picker-heading"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.55 }}
        >
          What year are you in?
        </motion.h1>

        <motion.p
          className="picker-sub"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.5 }}
        >
          Pick your year. We'll chart the path ahead.
        </motion.p>

        <div className="picker-grid">
          {YEAR_GROUPS.map((yg, i) => (
            <motion.button
              key={yg.label}
              className="yr-notecard"
              onClick={() => onSelect(YEAR_START_IDX[i])}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 + i * 0.08, duration: 0.55, ease: EASE_OUT }}
              whileHover={{ y: -5, transition: { duration: 0.25, ease: 'easeOut' } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.12 } }}
              style={{ '--yr-color': yg.color } as React.CSSProperties}
            >
              {/* Stacked paper behind */}
              <div className="yr-note-paper yr-note-paper--back" />

              {/* Main page */}
              <div className="yr-note-page">
                {/* Paper grain */}
                <div className="yr-note-grain" />
                {/* Faint lines */}
                <div className="yr-note-lines" />

                {/* Binding holes */}
                <div className="yr-note-binding">
                  <div className="yr-note-hole" />
                  <div className="yr-note-hole" />
                  <div className="yr-note-hole" />
                </div>

                {/* Sticky grade tab */}
                <div className="yr-note-tab" style={{ background: yg.color }}>
                  <span className="yr-note-tab-text">{yg.grade} Grade</span>
                </div>

                {/* Content */}
                <div className="yr-note-content">
                  <div className="yr-note-top">
                    <div>
                      <div className="yr-note-name">{yg.label}</div>
                      <p className="yr-note-tagline">{CARDS[i].tagline}</p>
                    </div>
                    <span className="yr-note-emoji">{mono(CARDS[i].emoji)}</span>
                  </div>
                </div>

                {/* Watermark number */}
                <span className="yr-note-num">{CARDS[i].num}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Journey intro overlay — blurs the picker until dismissed */}
      <AnimatePresence>
        {showIntro && <JourneyIntro onDismiss={() => {
          if (user) markIntroSeen('journey').then(refreshProfile).catch(() => {})
          setShowIntro(false)
        }} />}
      </AnimatePresence>
    </motion.div>
  )
}
