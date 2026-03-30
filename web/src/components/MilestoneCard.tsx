/**
 * MilestoneCard
 *
 * Always shows full content. Orchestrated entrance with staggered children.
 * Accepts optional layout offsets for dynamic positioning.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { milestones } from '../data/timelineData'
import { CARD_LAYOUTS, type CardLayout } from '../data/cardLayout'

interface Props {
  currentIdx: number
  side: 'left' | 'right'
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const

export default function MilestoneCard({ currentIdx, side }: Props) {
  const m  = milestones[currentIdx]
  const lo = CARD_LAYOUTS[currentIdx]

  const fromX = (side === 'right' ? 36 : -36) + lo.entryY * 0.5
  const exitX = side === 'right' ? -24 : 24

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentIdx}
        className="milestone-card"
        initial={{ opacity: 0, x: fromX, y: lo.entryY, scale: 0.94, rotate: lo.entryRotate }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, x: exitX, scale: 0.96 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        style={{ '--card-accent': m.accent, '--card-accent-dim': m.accentDim } as React.CSSProperties}
      >
        {/* Landing glow */}
        <motion.div
          className="card-glow"
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          style={{ background: `radial-gradient(ellipse at ${side === 'right' ? '0%' : '100%'} 50%, ${m.accent}18, transparent 70%)` }}
        />

        {/* Accent stripe */}
        <motion.div
          className="card-stripe"
          style={{ background: m.accent, transformOrigin: 'top' }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.08, duration: 0.4, ease: EASE_OUT }}
        />

        <div className="card-body">
          <div className="card-top-row">
            <div className="card-meta-col">
              <motion.div
                className="card-meta-row"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.14, duration: 0.4, ease: EASE_OUT }}
              >
                <span
                  className="card-badge"
                  style={{
                    color: m.accent,
                    background: m.accentDim,
                    borderColor: m.accent + '40',
                  }}
                >
                  {m.grade} Grade
                </span>
                <span className="card-phase">{m.phase}</span>
              </motion.div>

              <motion.div
                className="card-title"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.5, ease: EASE_OUT }}
              >
                {m.title}
              </motion.div>
            </div>

            <motion.div
              className="card-emoji-box"
              style={{ background: m.accentDim }}
              initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.26, type: 'spring', stiffness: 340, damping: 18 }}
            >
              {m.emoji}
            </motion.div>
          </div>

          <motion.p
            className="card-desc"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {m.description}
          </motion.p>

          <div className="card-tasks">
            {m.tasks.map((t, i) => (
              <motion.div
                key={i}
                className="task-row"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.36 + i * 0.07, duration: 0.38, ease: EASE_OUT }}
              >
                <motion.div
                  className="task-dot"
                  style={{ background: m.accent }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.07, type: 'spring', stiffness: 500, damping: 22 }}
                />
                <span className="task-text">{t}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
