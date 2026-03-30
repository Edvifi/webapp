/**
 * YearBackgrounds
 * CSS-animated particle layers cross-fading between years.
 * Matches the RN YearBackgrounds component visually.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { yearGroupOf, YEAR_GROUPS } from '../data/timelineData'

interface Props { currentIdx: number }

// Seeded deterministic random
function makeRand(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

// ── Freshman: Sticky notes ────────────────────────────────────────────────────
function StickyNotes() {
  const r = makeRand(42)
  const items = Array.from({ length: 7 }, () => ({
    x:       r() * 85 + 5,
    y:       r() * 65 + 10,
    rot0:    (r() - 0.5) * 28,
    driftX:  (r() - 0.5) * 40,
    driftY:  (r() - 0.5) * 28,
    driftR:  (r() - 0.5) * 14,
    dur:     4 + r() * 3,
    delay:   r() * 2.2,
    opacity: 0.30 + r() * 0.2,
  }))

  return (
    <>
      {items.map((it, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: `${it.x}vw`,
            top:  `${it.y}vh`,
            opacity: it.opacity,
          }}
          animate={{
            x:      [0, it.driftX, -it.driftX * 0.7, 0],
            y:      [0, it.driftY, -it.driftY * 0.4, 0],
            rotate: [it.rot0, it.rot0 + it.driftR, it.rot0 - it.driftR * 0.5, it.rot0],
          }}
          transition={{ duration: it.dur, delay: it.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg width={30} height={30} viewBox="0 0 30 30">
            <rect x={1} y={1} width={28} height={28} rx={2} fill="#2D9E72" fillOpacity={0.45} />
            <line x1={5} y1={10} x2={25} y2={10} stroke="#2D9E72" strokeWidth={1.5} strokeOpacity={0.7} />
            <line x1={5} y1={15} x2={25} y2={15} stroke="#2D9E72" strokeWidth={1.5} strokeOpacity={0.7} />
            <line x1={5} y1={20} x2={19} y2={20} stroke="#2D9E72" strokeWidth={1.5} strokeOpacity={0.7} />
          </svg>
        </motion.div>
      ))}
    </>
  )
}

// ── Sophomore: Paper planes ───────────────────────────────────────────────────
function PaperPlanes() {
  const r = makeRand(88)
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const items = Array.from({ length: 5 }, (_, i) => {
    const goesRight = i % 2 === 0
    return {
      startX:  goesRight ? -60 : vw + 60,
      endDX:   goesRight ? vw + 120 : -(vw + 120),
      y:       r() * 60 + 12,
      waveAmp: 8 + r() * 10,
      dur:     7.5 + r() * 4,
      delay:   r() * 4.5,
      scale:   0.75 + r() * 0.55,
      opacity: 0.28 + r() * 0.18,
      goesRight,
    }
  })

  return (
    <>
      {items.map((it, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: it.startX,
            top: `${it.y}vh`,
            opacity: it.opacity,
            scaleX: it.goesRight ? 1 : -1,
            scale: it.scale,
          }}
          animate={{ x: [0, it.endDX], y: [0, it.waveAmp, -it.waveAmp, 0] }}
          transition={{
            x: { duration: it.dur, delay: it.delay, repeat: Infinity, ease: 'linear' },
            y: { duration: it.dur / 2, delay: it.delay, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          {/* Nose points right (positive X). scaleX:-1 flips for left-going planes */}
          <svg width={44} height={26} viewBox="0 0 44 26">
            <path d="M 42 13 L 2 7 L 14 13 L 2 19 Z" fill="#1D7FC4" fillOpacity={0.5} />
            <path d="M 42 13 L 14 13 L 24 22 Z"       fill="#1D7FC4" fillOpacity={0.3} />
            <line x1={30} y1={10} x2={14} y2={13} stroke="#1D7FC4" strokeWidth={0.8} strokeOpacity={0.55} />
          </svg>
        </motion.div>
      ))}
    </>
  )
}

// ── Junior: Falling pages ─────────────────────────────────────────────────────
function FallingPages() {
  const r = makeRand(55)
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  const items = Array.from({ length: 6 }, () => ({
    x:       r() * 82 + 6,
    startY:  -90 - r() * 100,
    rot0:    (r() - 0.5) * 38,
    flutter: (r() - 0.5) * 60,
    dur:     6 + r() * 4,
    delay:   r() * 5.5,
    opacity: 0.28 + r() * 0.16,
  }))

  return (
    <>
      {items.map((it, i) => (
        <motion.div
          key={i}
          style={{ position: 'absolute', left: `${it.x}vw`, top: it.startY, opacity: it.opacity }}
          animate={{ y: [0, vh + 120], rotate: [it.rot0, it.rot0 + it.flutter] }}
          transition={{ duration: it.dur, delay: it.delay, repeat: Infinity, ease: 'linear' }}
        >
          <svg width={26} height={32} viewBox="0 0 26 32">
            <path d="M 0 0 L 19 0 L 26 7 L 26 32 L 0 32 Z" fill="#7048C8" fillOpacity={0.4} />
            <path d="M 19 0 L 19 7 L 26 7 Z"               fill="#7048C8" fillOpacity={0.6} />
            <line x1={4} y1={12} x2={22} y2={12} stroke="#7048C8" strokeWidth={1.2} strokeOpacity={0.65} />
            <line x1={4} y1={16} x2={22} y2={16} stroke="#7048C8" strokeWidth={1.2} strokeOpacity={0.65} />
            <line x1={4} y1={20} x2={22} y2={20} stroke="#7048C8" strokeWidth={1.2} strokeOpacity={0.65} />
            <line x1={4} y1={24} x2={16} y2={24} stroke="#7048C8" strokeWidth={1.2} strokeOpacity={0.65} />
          </svg>
        </motion.div>
      ))}
    </>
  )
}

// ── Senior: Graduation caps ───────────────────────────────────────────────────
function GradCaps() {
  const r = makeRand(77)
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  const items = Array.from({ length: 6 }, () => ({
    x:        r() * 78 + 11,
    driftX:   (r() - 0.5) * 60,
    rot0:     r() * 360,
    throwDur: 2.2 + r() * 1.8,
    delay:    r() * 4.2,
    opacity:  0.30 + r() * 0.2,
  }))

  return (
    <>
      {items.map((it, i) => (
        <motion.div
          key={i}
          style={{ position: 'absolute', left: `${it.x}vw`, top: '95vh', opacity: it.opacity }}
          animate={{
            y:      [0, -(vh * 0.7), 0],
            x:      [0, it.driftX, -it.driftX, 0],
            rotate: [it.rot0, it.rot0 + 360],
          }}
          transition={{
            duration: it.throwDur * 2.6,
            delay:    it.delay,
            repeat:   Infinity,
            ease:     'easeInOut',
          }}
        >
          <svg width={34} height={26} viewBox="0 0 34 26">
            <rect x={1} y={1} width={32} height={9}  rx={1} fill="#C47A12" fillOpacity={0.5} />
            <path d="M 9 10 L 25 10 L 23 20 L 11 20 Z"       fill="#C47A12" fillOpacity={0.4} />
            <line x1={30} y1={5} x2={33} y2={17} stroke="#C47A12" strokeWidth={1.5} strokeOpacity={0.7} />
            <circle cx={33} cy={19} r={2.5} fill="#C47A12" fillOpacity={0.7} />
          </svg>
        </motion.div>
      ))}
    </>
  )
}

// ── Layer map ─────────────────────────────────────────────────────────────────
const LAYERS = [StickyNotes, PaperPlanes, FallingPages, GradCaps]

export default function YearBackgrounds({ currentIdx }: Props) {
  const group   = yearGroupOf(currentIdx)
  const yearIdx = YEAR_GROUPS.indexOf(group)
  const Layer   = LAYERS[yearIdx]

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={yearIdx}
          style={{ position: 'absolute', inset: 0 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Layer />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
