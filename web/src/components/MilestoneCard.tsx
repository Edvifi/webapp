/**
 * MilestoneCard — Skeuomorphic planner page
 *
 * Layered paper textures, spiral binding holes, deckled edges,
 * leather grade tab, mixed typography (serif + handwritten),
 * and illustrated task icons.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { milestones } from '../data/timelineData'
import { CARD_LAYOUTS } from '../data/cardLayout'
import { TASK_ICONS } from '../data/taskIcons'

interface Props {
  currentIdx: number
  side: 'left' | 'right'
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const

export default function MilestoneCard({ currentIdx, side }: Props) {
  const m  = milestones[currentIdx]
  const lo = CARD_LAYOUTS[currentIdx]
  const icons = TASK_ICONS[currentIdx] ?? []

  const fromX = (side === 'right' ? 36 : -36) + lo.entryY * 0.5
  const exitX = side === 'right' ? -24 : 24

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentIdx}
        className="planner-card"
        initial={{ opacity: 0, x: fromX, y: lo.entryY, scale: 0.94, rotate: lo.entryRotate }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, x: exitX, scale: 0.96 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        style={{ '--accent': m.accent, '--accent-dim': m.accentDim } as React.CSSProperties}
      >
        {/* Stacked paper layers behind */}
        <div className="planner-paper planner-paper--back" />
        <div className="planner-paper planner-paper--mid" />

        {/* Main page */}
        <div className="planner-page">
          {/* Paper grain texture */}
          <div className="planner-grain" />

          {/* Faint graph lines */}
          <div className="planner-lines" />

          {/* Spiral binding holes */}
          <div className="planner-binding">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="binding-hole" />
            ))}
          </div>

          {/* Sticky page flag — wraps over the top edge */}
          <motion.div
            className="leather-tab"
            style={{ '--accent': m.accent } as React.CSSProperties}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.35, ease: EASE_OUT }}
          >
            <div className="leather-tab-front">
              <span className="leather-tab-text">{m.grade} Grade</span>
            </div>
            <div className="leather-tab-fold" />
          </motion.div>

          {/* Phase tab on the right */}
          <motion.div
            className="phase-tab"
            initial={{ x: 8, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.16, duration: 0.4, ease: EASE_OUT }}
          >
            {m.phase}
          </motion.div>

          {/* Content area */}
          <div className="planner-content">
            {/* Title row — title + wax seal */}
            <motion.div
              className="planner-title-row"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: EASE_OUT }}
            >
              <h3 className="planner-title">{m.title}</h3>
              <motion.div
                className="wax-seal"
                style={{ '--seal-color': m.accent } as React.CSSProperties}
                initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.26, type: 'spring', stiffness: 280, damping: 18 }}
              >
                <span className="wax-seal-emoji">{m.emoji}</span>
              </motion.div>
            </motion.div>

            {/* Description — handwritten feel */}
            <motion.p
              className="planner-desc"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.4 }}
            >
              {m.description}
            </motion.p>

            {/* Divider — sketchy line */}
            <motion.div
              className="planner-divider"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.32, duration: 0.4, ease: EASE_OUT }}
            />

            {/* Tasks with illustrated icons */}
            <div className="planner-tasks">
              {m.tasks.map((t, i) => (
                <motion.div
                  key={i}
                  className="planner-task"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.36 + i * 0.08, duration: 0.38, ease: EASE_OUT }}
                >
                  <motion.span
                    className="planner-task-icon"
                    style={{ color: m.accent }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.08, type: 'spring', stiffness: 400, damping: 20 }}
                    // SAFE: SVG source is trusted static data from taskIcons.ts
                    dangerouslySetInnerHTML={{ __html: icons[i] ?? '' }}
                  />
                  <span className="planner-task-text">{t}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
