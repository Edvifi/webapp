/**
 * ModuleTour — generic spotlight tour for module shells.
 *
 * Phase 1: Blurred intro with typed message
 * Phase 2: Step-by-step spotlight that auto-switches tabs and highlights
 *          `[data-tour="..."]` elements one at a time.
 *
 * Modules supply their own `steps` and intro copy. The shell layout is
 * expected to mark its sidebar / breadcrumb / content / chat regions with
 * `data-tour="sidebar"`, `data-tour="breadcrumb"`, etc. so blur targeting works.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { computeTooltipPos, TOUR_SECTIONS, type TourStep } from './moduleTour.helpers'
import { EASE_OUT } from '../lib/designTokens'

interface ModuleTourProps<TabId extends string = string> {
  steps: TourStep<TabId>[]
  introText: string
  introSub: string
  introBtnText?: string
  onDismiss: () => void
  onStart?: () => void
  onSwitchTab?: (tabId: TabId) => void
  /** Optional: tab to reset to when the tour dismisses. */
  resetTab?: TabId
}

const CHAR_DELAY = 0.04

const INTRO_INITIAL_DELAY_MS = 400
const INTRO_TYPE_BUFFER_MS = 400
const INTRO_SUB_DELAY_AFTER_TYPE_MS = 0
const INTRO_CONTINUE_DELAY_AFTER_SUB_MS = 800

const TAB_RENDER_POLL_MAX_MS = 600
const STEP_TRANSITION_DELAY_MS = 60

interface Rect { x: number; y: number; w: number; h: number }

export default function ModuleTour<TabId extends string = string>({
  steps,
  introText,
  introSub,
  introBtnText = 'Show me around',
  onDismiss,
  onStart,
  onSwitchTab,
  resetTab,
}: ModuleTourProps<TabId>) {
  const [phase, setPhase] = useState<'intro' | 'tour'>('intro')
  const [showIntroText, setShowIntroText] = useState(false)
  const [showSub, setShowSub] = useState(false)
  const [showContinue, setShowContinue] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 })
  const isLast = step === steps.length - 1
  const current = steps[step]

  const introTypeDurationMs = introText.length * CHAR_DELAY * 1000 + INTRO_TYPE_BUFFER_MS
  const introSubDelayMs = INTRO_INITIAL_DELAY_MS + introTypeDurationMs + INTRO_SUB_DELAY_AFTER_TYPE_MS
  const introContinueDelayMs = introSubDelayMs + INTRO_CONTINUE_DELAY_AFTER_SUB_MS

  useEffect(() => {
    const t1 = setTimeout(() => setShowIntroText(true), INTRO_INITIAL_DELAY_MS)
    const t2 = setTimeout(() => setShowSub(true), introSubDelayMs)
    const t3 = setTimeout(() => setShowContinue(true), introContinueDelayMs)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [introSubDelayMs, introContinueDelayMs])

  const stepRef = useRef(step)
  useEffect(() => { stepRef.current = step }, [step])

  // Toggle a `data-tour-blur` attribute on each section based on the current
  // step's `keepClear`. CSS in index.css drives the actual filter.
  useEffect(() => {
    if (phase !== 'tour') return
    const clear = current.keepClear
    TOUR_SECTIONS.forEach((section) => {
      const el = document.querySelector(`[data-tour="${section}"]`) as HTMLElement | null
      if (!el) return
      if (clear.includes(section)) {
        el.removeAttribute('data-tour-blur')
      } else {
        el.setAttribute('data-tour-blur', 'on')
      }
    })
    return () => {
      TOUR_SECTIONS.forEach((section) => {
        const el = document.querySelector(`[data-tour="${section}"]`) as HTMLElement | null
        if (el) el.removeAttribute('data-tour-blur')
      })
    }
  }, [phase, step, current.keepClear])

  const measure = useCallback((stepIdx: number): boolean => {
    const s = steps[stepIdx]
    const py = s.padY ?? s.pad
    const el = document.querySelector(s.selector)
    if (el) {
      const b = el.getBoundingClientRect()
      setRect({ x: b.left - s.pad, y: b.top - py, w: b.width + s.pad * 2, h: b.height + py * 2 })
      return true
    }
    const cx = window.innerWidth / 2
    setRect({ x: cx - 80, y: 100, w: 160, h: 80 })
    return false
  }, [steps])

  const measureWithPoll = useCallback((stepIdx: number): (() => void) => {
    const start = performance.now()
    let frame: number | null = null
    const tick = () => {
      const ok = measure(stepIdx)
      if (ok) return
      if (performance.now() - start >= TAB_RENDER_POLL_MAX_MS) return
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => { if (frame !== null) cancelAnimationFrame(frame) }
  }, [measure])

  const goToStep = useCallback((stepIdx: number): (() => void) => {
    const s = steps[stepIdx]
    if (s.switchTab && onSwitchTab) onSwitchTab(s.switchTab)
    return measureWithPoll(stepIdx)
  }, [steps, onSwitchTab, measureWithPoll])

  useEffect(() => {
    if (phase !== 'tour') return
    let cancelMeasure: (() => void) | null = null
    const t = setTimeout(() => { cancelMeasure = goToStep(step) }, STEP_TRANSITION_DELAY_MS)
    return () => { clearTimeout(t); if (cancelMeasure) cancelMeasure() }
  }, [step, phase, goToStep])

  useEffect(() => {
    if (phase !== 'tour') return
    const handleResize = () => measure(stepRef.current)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [phase, measure])

  const dismiss = useCallback(() => {
    if (resetTab && onSwitchTab) onSwitchTab(resetTab)
    onDismiss()
  }, [resetTab, onSwitchTab, onDismiss])

  // Esc closes the tour (capture-phase + stopImmediatePropagation so the
  // parent module's own Esc-to-close listener doesn't also fire).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation()
      dismiss()
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [dismiss])

  // Fire onStart exactly once per mount. Callers pass inline arrow fns
  // so the dependency-tracked variant would re-run on every render and
  // hammer the persistence layer.
  const onStartRef = useRef(onStart)
  useEffect(() => { onStartRef.current = onStart }, [onStart])
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    onStartRef.current?.()
  }, [])

  const next = () => {
    if (isLast) dismiss()
    else setStep(s => s + 1)
  }

  const back = () => {
    if (step > 0) setStep(s => s - 1)
  }

  const tooltipPos = useMemo((): React.CSSProperties => {
    return computeTooltipPos(rect, window.innerWidth, window.innerHeight)
  }, [rect])

  return (
    <motion.div
      className="tour-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="wait">
        {phase === 'intro' ? (
          <motion.div
            key="intro"
            className="tour-intro"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="tour-intro-blur" />
            <div className="tour-intro-content">
              <h2 className="tour-intro-title">
                {introText.split('').map((char, i) => (
                  <motion.span
                    key={i}
                    className="tour-intro-char"
                    initial={{ opacity: 0, y: 6 }}
                    animate={showIntroText ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: i * CHAR_DELAY, duration: 0.3, ease: EASE_OUT }}
                  >
                    {char === ' ' ? ' ' : char}
                  </motion.span>
                ))}
              </h2>
              <motion.p
                className="tour-intro-sub"
                initial={{ opacity: 0, y: 12 }}
                animate={showSub ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, ease: EASE_OUT }}
              >
                {introSub}
              </motion.p>
              <motion.button
                className="tour-intro-btn"
                initial={{ opacity: 0, y: 10 }}
                animate={showContinue ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, ease: EASE_OUT }}
                onClick={() => setPhase('tour')}
              >
                {introBtnText}
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="tour"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="tour-spotlight"
              animate={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                className="tour-tooltip"
                style={tooltipPos}
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
                  <span className="tour-tooltip-counter">{step + 1} of {steps.length}</span>
                  <div className="tour-tooltip-actions">
                    <button className="tour-skip-btn" onClick={dismiss}>Skip</button>
                    {step > 0 && (
                      <button className="tour-back-btn" onClick={back}>← Back</button>
                    )}
                    <button className="tour-next-btn" onClick={next}>
                      {isLast ? "Got it!" : 'Next'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
