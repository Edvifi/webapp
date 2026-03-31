import { motion } from 'framer-motion'
import { YEAR_GROUPS, YEAR_START_IDX } from '../data/timelineData'

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

export default function GradePicker({ onSelect }: Props) {
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
              className="yr-card"
              onClick={() => onSelect(YEAR_START_IDX[i])}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 + i * 0.08, duration: 0.55, ease: EASE_OUT }}
              whileHover={{ y: -6, transition: { duration: 0.25, ease: 'easeOut' } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.12 } }}
              style={{
                '--yr-color': yg.color,
                '--yr-glow': yg.color + '22',
                '--yr-dim': yg.color + '0D',
              } as React.CSSProperties}
            >
              <div className="yr-card-accent" />
              <span className="yr-card-num">{CARDS[i].num}</span>

              {/* Card content: text left, emoji right */}
              <div className="yr-card-row">
                <div className="yr-card-text">
                  <div className="yr-card-label">{yg.label}</div>
                  <div className="yr-card-grade">{yg.grade} Grade</div>
                  <p className="yr-card-tagline">{CARDS[i].tagline}</p>
                </div>
                <span className="yr-card-emoji-side">{CARDS[i].emoji}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
