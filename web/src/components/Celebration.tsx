/**
 * Celebration — a one-shot confetti burst overlay.
 *
 * Rendered with a changing `key` to (re)fire; calls onDone when the burst
 * finishes so the parent can unmount it. Deterministic (index-based, no random)
 * to keep render pure.
 */

import { motion } from 'framer-motion'

const COLORS = ['#7048C8', '#2D9E72', '#1D7FC4', '#C47A12', '#B93A3A', '#E8B84B']
const N = 42

export default function Celebration({ onDone }: { onDone: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2000, overflow: 'hidden' }}>
      {Array.from({ length: N }, (_, i) => {
        const angle = (i / N) * Math.PI * 2
        const dist = 130 + (i % 5) * 46
        const dx = Math.cos(angle) * dist
        const dy = Math.sin(angle) * dist
        const color = COLORS[i % COLORS.length]
        const round = i % 3 === 0
        return (
          <motion.div
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
            animate={{ opacity: 0, x: dx, y: dy + 320, rotate: (i % 2 ? 1 : -1) * 420 }}
            transition={{ duration: 1.3, ease: [0.2, 0.7, 0.3, 1] }}
            onAnimationComplete={i === 0 ? onDone : undefined}
            style={{ position: 'absolute', left: '50%', top: '34%', width: round ? 10 : 8, height: round ? 10 : 15, borderRadius: round ? '50%' : 2, background: color }}
          />
        )
      })}
    </div>
  )
}
