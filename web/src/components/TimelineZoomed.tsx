/**
 * TimelineZoomed — "riding the path" variant
 *
 * Toggle between zoomed (4×) and pulled-back (1.2×) with a button.
 * Camera always tracks the active node in both X and Y.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion'
import PathSVG from './PathSVG'
import MilestoneCard from './MilestoneCard'
import QuestionCard from './QuestionCard'
import StepDots from './StepDots'
import YearBackgrounds from './YearBackgrounds'
import TimelineInstructions from './TimelineInstructions'
import { NODES } from '../data/pathGeometry'
import { TOTAL, yearGroupOf } from '../data/timelineData'
import { CARD_LAYOUTS } from '../data/cardLayout'
import { TIMELINE_QUESTIONS, type TimelineQuestion } from '../data/questions'

interface Props {
  startIdx: number
  onComplete?: (answers: Record<string, number>) => void
}

// Build a merged sequence: milestones + questions interleaved
// Each step is either { type:'milestone', milestoneIdx } or { type:'question', question }
interface MilestoneStep { type: 'milestone'; milestoneIdx: number }
interface QuestionStep  { type: 'question';  question: TimelineQuestion }
type Step = MilestoneStep | QuestionStep

function buildSteps(): Step[] {
  const steps: Step[] = []
  for (let i = 0; i < TOTAL; i++) {
    steps.push({ type: 'milestone', milestoneIdx: i })
    // Insert any questions that belong after this milestone
    const qs = TIMELINE_QUESTIONS.filter(q => q.afterIndex === i)
    for (const q of qs) steps.push({ type: 'question', question: q })
  }
  return steps
}

const STEPS = buildSteps()

const ZOOM_IN  = 4.0
const ZOOM_OUT = 1.2

export default function TimelineZoomed({ startIdx, onComplete }: Props) {
  // Find the step index that corresponds to startIdx milestone
  const startStep = STEPS.findIndex(s => s.type === 'milestone' && s.milestoneIdx === startIdx)
  const [stepIdx, setStepIdx] = useState(startStep >= 0 ? startStep : 0)
  const [showScrollHint, setShowScrollHint] = useState(true)
  const [showInstructions, setShowInstructions] = useState(true)
  const [zoomed, setZoomed] = useState(true)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const svgX = useMotionValue(0)
  const svgY = useMotionValue(0)
  const svgScale = useMotionValue(ZOOM_IN)
  const wheelCooldown = useRef(false)

  const scale = zoomed ? ZOOM_IN : ZOOM_OUT

  // Current step
  const step = STEPS[stepIdx]
  // The milestone index for camera tracking (questions reuse the previous milestone's position)
  const currentMilestoneIdx = useMemo(() => {
    if (step.type === 'milestone') return step.milestoneIdx
    for (let i = stepIdx - 1; i >= 0; i--) {
      if (STEPS[i].type === 'milestone') return (STEPS[i] as MilestoneStep).milestoneIdx
    }
    return 0
  }, [step, stepIdx])

  // TODO: add resize listener for camera repositioning
  const cameraX = useCallback((idx: number, s: number) => {
    return window.innerWidth / 2 - NODES[idx].x * s
  }, [])
  const cameraY = useCallback((idx: number, s: number) => {
    return window.innerHeight / 2 - NODES[idx].y * s
  }, [])

  // Snap on mount, then show instructions after delay
  useEffect(() => {
    svgX.set(cameraX(currentMilestoneIdx, ZOOM_IN))
    svgY.set(cameraY(currentMilestoneIdx, ZOOM_IN))
    svgScale.set(ZOOM_IN)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Animate camera + scale when zoom toggles
  useEffect(() => {
    const s = zoomed ? ZOOM_IN : ZOOM_OUT
    const dur = 0.8
    const ease = [0.25, 0.46, 0.45, 0.94] as const
    animate(svgX, cameraX(currentMilestoneIdx, s), { duration: dur, ease })
    animate(svgY, cameraY(currentMilestoneIdx, s), { duration: dur, ease })
    animate(svgScale, s, { duration: dur, ease })
  }, [zoomed]) // eslint-disable-line react-hooks/exhaustive-deps

  // Move camera when milestone changes
  const moveCameraTo = useCallback((milestoneIdx: number, dir: 1 | -1) => {
    const s = svgScale.get()
    const dur = dir > 0 ? 0.75 : 0.6
    const ease = dir > 0
      ? [0.25, 0.46, 0.45, 0.94] as const
      : [0.55, 0.06, 0.68, 0.19] as const
    animate(svgX, cameraX(milestoneIdx, s), { duration: dur, ease })
    animate(svgY, cameraY(milestoneIdx, s), { duration: dur, ease })
  }, [svgX, svgY, svgScale, cameraX, cameraY])

  const navigate = useCallback((dir: 1 | -1) => {
    if (showInstructions) return
    setShowScrollHint(false)
    setStepIdx(prev => {
      const next = prev + dir
      if (next < 0 || next >= STEPS.length) return prev
      // Find the milestone index for camera
      const nextStep = STEPS[next]
      let targetMilestone = 0
      if (nextStep.type === 'milestone') {
        targetMilestone = nextStep.milestoneIdx
      } else {
        // Question: use the milestone it's attached to
        for (let i = next - 1; i >= 0; i--) {
          if (STEPS[i].type === 'milestone') { targetMilestone = (STEPS[i] as MilestoneStep).milestoneIdx; break }
        }
      }
      moveCameraTo(targetMilestone, dir)
      return next
    })
  }, [moveCameraTo, showInstructions])

  const handleAnswer = useCallback((questionId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }, [])

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); navigate(1) }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); navigate(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  // Scroll
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (wheelCooldown.current) return
      if (Math.abs(e.deltaY) < 15) return
      wheelCooldown.current = true
      navigate(e.deltaY > 0 ? 1 : -1)
      setTimeout(() => { wheelCooldown.current = false }, 550)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [navigate])

  // Touch
  useEffect(() => {
    let startY = 0, startX = 0
    const onStart = (e: TouchEvent) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY }
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX
      const dy = e.changedTouches[0].clientY - startY
      if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx)) navigate(dy < 0 ? 1 : -1)
      else if (Math.abs(dx) > 60) navigate(dx < 0 ? 1 : -1)
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => { window.removeEventListener('touchstart', onStart); window.removeEventListener('touchend', onEnd) }
  }, [navigate])

  const group   = yearGroupOf(currentMilestoneIdx)
  const node    = NODES[currentMilestoneIdx]
  const canBack = stepIdx > 0
  const canFwd  = stepIdx < STEPS.length - 1
  const atEnd   = stepIdx === STEPS.length - 1
  const cardSide = node.x < 200 ? 'left' : 'right'
  const lo = CARD_LAYOUTS[currentMilestoneIdx]
  const cardStyle = {
    top: `calc(50vh + ${lo.yOffset}vh)`,
    ...(cardSide === 'left'
      ? { left: `${28 + lo.xNudge}px` }
      : { right: `${28 - lo.xNudge}px` }),
  }

  return (
    <motion.div
      className="tz-screen"
      style={{ background: group.tint, transition: 'background 0.7s ease' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <YearBackgrounds currentIdx={currentMilestoneIdx} />

      {/* Instructions overlay — first load only */}
      <AnimatePresence>
        {showInstructions && (
          <TimelineInstructions onDismiss={() => setShowInstructions(false)} />
        )}
      </AnimatePresence>

      {/* Radial vignette — fades with zoom level */}
      <motion.div
        className="tz-vignette"
        animate={{ opacity: zoomed ? 1 : 0 }}
        transition={{ duration: 0.6 }}
      />

      {/* Top bar */}
      <div className="tz-top">
        <div className="top-bar top-bar--stacked">
          <div className="top-bar-row">
            <span className="top-bar-wordmark">edvifi</span>
            <div className="top-bar-right">
              <span className="top-bar-progress">{stepIdx + 1} of {STEPS.length}</span>
              <motion.button
                className="zoom-toggle"
                onClick={() => setZoomed(z => !z)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={zoomed ? 'Zoom out' : 'Zoom in'}
              >
                {zoomed ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M5.5 8h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M5.5 8h5M8 5.5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </motion.button>
            </div>
          </div>
          <StepDots currentIdx={currentMilestoneIdx} />
        </div>
      </div>

      {/* SVG canvas */}
      <div className="tz-canvas">
        <motion.div
          className="tz-svg-mover"
          style={{ x: svgX, y: svgY }}
        >
          <motion.div
            style={{
              scale: svgScale,
              transformOrigin: '0 0',
              willChange: 'transform',
            }}
          >
            <PathSVG currentIdx={currentMilestoneIdx} zoom={scale} />
          </motion.div>
        </motion.div>
      </div>

      {/* Floating card — milestone or question */}
      <div
        className="tz-card-slot"
        key={`slot-${stepIdx}`}
        style={cardStyle}
      >
        {step.type === 'milestone' ? (
          <MilestoneCard currentIdx={step.milestoneIdx} side={cardSide} />
        ) : (
          <QuestionCard
            question={step.question}
            side={cardSide}
            onAnswer={handleAnswer}
            onNext={() => navigate(1)}
            currentAnswer={answers[step.question.id]}
          />
        )}
      </div>

      {/* Bottom nav */}
      <div className="tz-bottom">
        <AnimatePresence>
          {showScrollHint && (
            <motion.div
              className="scroll-toast"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
              transition={{ enter: { delay: 0.7, duration: 0.55 }, exit: { duration: 0.3 } }}
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
              onClick={() => onComplete?.(answers)}
            >
              Go to Dashboard
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        <div className="nav-row">
          <button className="nav-btn" onClick={() => navigate(-1)} disabled={!canBack}>← Back</button>
          <span className="nav-hint">scroll · tap · arrow keys</span>
          <button className="nav-btn" onClick={() => navigate(1)} disabled={!canFwd}>Next →</button>
        </div>
      </div>
    </motion.div>
  )
}
