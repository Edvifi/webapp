/**
 * TimelineScreen
 *
 * Three-column layout:
 *   Left panel  │  SVG path (camera-panned)  │  Right panel
 *
 * Navigation: scroll wheel, arrow keys, click zones, swipe, nav buttons.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion'
import PathSVG from './PathSVG'
import MilestoneCard from './MilestoneCard'
import StepDots from './StepDots'
import YearBackgrounds from './YearBackgrounds'
import { NODES, TARGET_Y_FRAC } from '../data/pathGeometry'
import { TOTAL, yearGroupOf } from '../data/timelineData'

interface Props {
  startIdx: number
}

export default function TimelineScreen({ startIdx }: Props) {
  const [currentIdx, setCurrentIdx] = useState(startIdx)
  const [showScrollHint, setShowScrollHint] = useState(true)
  const svgY = useMotionValue(0)
  const wheelCooldown = useRef(false)

  const cameraY = useCallback((idx: number) => {
    return window.innerHeight * TARGET_Y_FRAC - NODES[idx].y
  }, [])

  // Snap camera on mount
  useEffect(() => {
    svgY.set(cameraY(startIdx))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = useCallback((dir: 1 | -1) => {
    setShowScrollHint(false)
    setCurrentIdx(prev => {
      const next = prev + dir
      if (next < 0 || next >= TOTAL) return prev
      animate(svgY, cameraY(next), {
        duration: dir > 0 ? 0.62 : 0.50,
        ease: dir > 0
          ? [0.25, 0.46, 0.45, 0.94]
          : [0.55, 0.06, 0.68, 0.19],
      })
      return next
    })
  }, [svgY, cameraY])

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); navigate(1) }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); navigate(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  // Mouse wheel / trackpad scroll
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (wheelCooldown.current) return

      // Require a minimum delta to avoid accidental tiny scrolls
      if (Math.abs(e.deltaY) < 15) return

      wheelCooldown.current = true
      navigate(e.deltaY > 0 ? 1 : -1)

      // Cooldown prevents rapid-fire navigation
      setTimeout(() => { wheelCooldown.current = false }, 500)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [navigate])

  // Touch swipe
  useEffect(() => {
    let startY = 0
    let startX = 0
    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX
      const dy = e.changedTouches[0].clientY - startY
      // Prefer vertical swipe for scroll, horizontal for swipe
      if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx)) {
        navigate(dy < 0 ? 1 : -1)
      } else if (Math.abs(dx) > 60) {
        navigate(dx < 0 ? 1 : -1)
      }
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend',   onEnd)
    }
  }, [navigate])

  const group    = yearGroupOf(currentIdx)
  const nodeLeft = NODES[currentIdx].x < 200
  const canBack  = currentIdx > 0
  const canFwd   = currentIdx < TOTAL - 1
  const atEnd    = currentIdx === TOTAL - 1

  return (
    <div
      className="timeline-screen"
      style={{ background: group.tint, transition: 'background 0.7s ease' }}
    >
      <YearBackgrounds currentIdx={currentIdx} />

      {/* Top bar */}
      <div className="top-fade">
        <div className="top-bar">
          <StepDots currentIdx={currentIdx} />
          <div className="top-bar-right">
            <span className="top-bar-progress">{currentIdx + 1} of {TOTAL}</span>
            <span className="top-bar-wordmark">edvifi</span>
          </div>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="timeline-layout">

        {/* Left panel */}
        <div className="side-panel side-panel--left">
          {!nodeLeft && (
            <div className="card-anchor card-anchor--left" key={currentIdx}>
              <MilestoneCard currentIdx={currentIdx} side="left" />
            </div>
          )}
        </div>

        {/* Center: SVG + click zones */}
        <div className="svg-column">
          <div className="click-zone click-zone--back" onClick={() => navigate(-1)} />
          <div className="click-zone click-zone--fwd"  onClick={() => navigate(1)}  />
          <motion.div style={{ y: svgY }}>
            <PathSVG currentIdx={currentIdx} />
          </motion.div>
        </div>

        {/* Right panel */}
        <div className="side-panel side-panel--right">
          {nodeLeft && (
            <div className="card-anchor card-anchor--right" key={currentIdx}>
              <MilestoneCard currentIdx={currentIdx} side="right" />
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom card */}
      <div className="bottom-card-wrap">
        <MilestoneCard currentIdx={currentIdx} side="right" />
      </div>

      {/* Bottom gradient + nav buttons */}
      <div className="bottom-fade">
        {/* Scroll toast — appears once, dismisses on first interaction */}
        <AnimatePresence>
          {showScrollHint && (
            <motion.div
              className="scroll-toast"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
              transition={{
                enter: { delay: 0.7, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                exit:  { duration: 0.3 },
              }}
              onClick={() => { navigate(1); setShowScrollHint(false) }}
            >
              <span className="scroll-toast-text">Scroll to explore</span>
              <motion.span
                className="scroll-toast-chevrons"
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard CTA — fades in at the last milestone */}
        <AnimatePresence>
          {atEnd && (
            <motion.button
              className="dashboard-btn"
              initial={{ opacity: 0, y: 18, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
              whileHover={{ y: -2, boxShadow: '0 14px 36px rgba(196,122,18,0.28)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { /* TODO: route to dashboard */ }}
            >
              Go to Dashboard
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        <div className="nav-row">
          <button
            className="nav-btn"
            onClick={() => navigate(-1)}
            disabled={!canBack}
          >
            ← Back
          </button>
          <span className="nav-hint">scroll · tap · arrow keys</span>
          <button
            className="nav-btn"
            onClick={() => navigate(1)}
            disabled={!canFwd}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
