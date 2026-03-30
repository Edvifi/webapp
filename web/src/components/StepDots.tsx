/**
 * StepDots — top HUD progress dots, same as the RN ProgressIndicator
 * Active dot widens to 20px; past dots are full opacity; future are dim.
 */

import { motion } from 'framer-motion'
import { YEAR_GROUPS, yearGroupOf } from '../data/timelineData'

interface Props {
  currentIdx: number
}

export default function StepDots({ currentIdx }: Props) {
  const group = yearGroupOf(currentIdx)
  const pos   = currentIdx - group.startIndex

  return (
    <div className="hud-row">
      <span className="hud-year" style={{ color: group.color }}>
        {group.label.toUpperCase()}
      </span>
      <div className="step-dots">
        {Array.from({ length: group.count }).map((_, i) => (
          <motion.div
            key={i}
            className="step-dot"
            animate={{
              width:   i === pos ? 20 : 7,
              opacity: i <= pos  ? 1  : 0.22,
              backgroundColor: group.color,
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        ))}
      </div>
    </div>
  )
}
