/**
 * TimelineInstructions — Step-by-step guided tour
 *
 * Uses 4 blur/dim panels around a spotlight cutout.
 * No clip-path or SVG mask needed for the blur — just positioned divs.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  onDismiss: () => void
}

interface TourStep {
  selector: string | null
  pad: number
  padY?: number
  title: string
  desc: string
  customRect?: string
}

const STEPS: TourStep[] = [
  {
    selector: null,
    pad: 0,
    title: 'Your Timeline',
    desc: "This is your college journey. Each dot is a milestone on the path to college. Tap or scroll to explore.",
    customRect: 'full',
  },
  {
    selector: '.tz-card-slot',
    pad: 10,
    title: 'Milestone Details',
    desc: 'Each milestone comes with a card showing what to focus on and actionable tasks.',
  },
  {
    selector: '.scroll-toast',
    pad: 10,
    title: 'Navigate',
    desc: 'Scroll, swipe, or tap to move through milestones. You can also use arrow keys.',
  },
  {
    selector: '.zoom-toggle',
    pad: 14,
    title: 'Zoom Toggle',
    desc: 'Click this to zoom out and see the full path, or zoom back in for the immersive view.',
  },
  {
    selector: '.hud-row',
    pad: 6,
    title: 'Your Progress',
    desc: "This shows which year you're in. The dots fill in as you advance through milestones.",
  },
]

const EASE_OUT = [0.22, 1, 0.36, 1] as const

interface Rect { x: number; y: number; w: number; h: number }

export default function TimelineInstructions({ onDismiss }: Props) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 })
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  const measure = useCallback((stepIdx: number) => {
    const s = STEPS[stepIdx]
    const py = s.padY ?? s.pad

    if (s.customRect === 'full') {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const m = 20 // small margin so the border is visible
      setRect({ x: m, y: m, w: vw - m * 2, h: vh - m * 2 })
      return
    }

    if (!s.selector) {
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      setRect({ x: cx - s.pad, y: cy - py, w: s.pad * 2, h: py * 2 })
      return
    }

    const el = document.querySelector(s.selector)
    if (el) {
      const b = el.getBoundingClientRect()
      setRect({
        x: b.left - s.pad,
        y: b.top - py,
        w: b.width + s.pad * 2,
        h: b.height + py * 2,
      })
    } else {
      const cx = window.innerWidth / 2
      setRect({ x: cx - 80, y: 100, w: 160, h: 80 })
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => measure(step), 50)
    return () => clearTimeout(t)
  }, [step, measure])

  const next = () => {
    if (isLast) onDismiss()
    else setStep(s => s + 1)
  }

  const tooltipStyle = (): React.CSSProperties => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const spotCx = rect.x + rect.w / 2
    const spotCy = rect.y + rect.h / 2
    const tw = 320

    if (spotCy < vh * 0.5) {
      return {
        top: Math.min(rect.y + rect.h + 16, vh - 200),
        left: Math.max(16, Math.min(spotCx - tw / 2, vw - tw - 16)),
      }
    } else {
      return {
        top: Math.max(16, rect.y - 200),
        left: Math.max(16, Math.min(spotCx - tw / 2, vw - tw - 16)),
      }
    }
  }

  // The 4 panels around the spotlight rect
  const vw = window.innerWidth
  const vh = window.innerHeight

  return (
    <motion.div
      className="tour-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Single spotlight div — box-shadow creates the dim overlay, border-radius rounds the cutout */}
      <motion.div
        className="tour-spotlight"
        animate={{
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
        }}
        transition={{ duration: 0.45, ease: EASE_OUT }}
      />

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="tour-tooltip"
          style={tooltipStyle()}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
        >
          <div className="tour-tooltip-content">
            <h4 className="tour-tooltip-title">{current.title}</h4>
            <p className="tour-tooltip-desc">{current.desc}</p>
          </div>
          <div className="tour-tooltip-footer">
            <span className="tour-tooltip-counter">{step + 1} of {STEPS.length}</span>
            <div className="tour-tooltip-actions">
              <button className="tour-skip-btn" onClick={onDismiss}>Skip</button>
              {step > 0 && (
                <button className="tour-back-btn" onClick={() => setStep(s => s - 1)}>
                  ← Back
                </button>
              )}
              <button className="tour-next-btn" onClick={next}>
                {isLast ? "Let's go!" : 'Next'}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
