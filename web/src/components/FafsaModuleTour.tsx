/**
 * FafsaModuleTour — Guided spotlight tour of the Financial Aid module
 *
 * Phase 1: Blurred intro with typed message (matches journey/timeline intros)
 * Phase 2: Step-by-step spotlight tour switching tabs and highlighting
 *          key UI components within each section.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  onDismiss: () => void
  onSwitchTab?: (tabId: string) => void
}

interface TourStep {
  selector: string
  pad: number
  padY?: number
  title: string
  desc: string
  switchTab?: string
  /** data-tour values of sections to keep unblurred (sidebar, breadcrumb, overview, chat) */
  keepClear: string[]
}

const ALL_SECTIONS = ['sidebar', 'breadcrumb', 'overview', 'chat']

const STEPS: TourStep[] = [
  // Sidebar
  {
    selector: '[data-tour="sidebar"]',
    pad: 8,
    title: 'Module Navigation',
    desc: 'Switch between sections here. Your overall progress is tracked at the bottom.',
    keepClear: ['sidebar'],
  },

  // Overview tab — keep sidebar + content clear so user sees the full tab
  {
    selector: '[data-tour="tab-overview"]',
    pad: 6,
    title: 'Overview',
    desc: 'Start here — articles, quizzes, and tasks that build your financial aid knowledge step by step.',
    switchTab: 'overview',
    keepClear: ['sidebar', 'overview'],
  },
  {
    selector: '[data-tour="overview-progress"]',
    pad: 8,
    title: 'Your Progress',
    desc: 'Track how far along you are. Items update automatically as you complete them.',
    switchTab: 'overview',
    keepClear: ['overview'],
  },
  {
    selector: '[data-tour="overview"]',
    pad: 10,
    title: 'Checklist',
    desc: 'Click any item to open its content — articles, quizzes, and action items. Check them off as you go.',
    switchTab: 'overview',
    keepClear: ['overview'],
  },

  // Scholarships tab
  {
    selector: '[data-tour="tab-scholarships"]',
    pad: 6,
    title: 'Scholarships',
    desc: 'Build and manage your personal scholarship tracker, or browse our database to discover new opportunities.',
    switchTab: 'scholarships',
    keepClear: ['sidebar', 'overview'],
  },
  {
    selector: '[data-tour="scholarships-toggle"]',
    pad: 8,
    title: 'Tracker vs. Discover',
    desc: '"My Tracker" is your personal list. "Discover" lets you browse and add scholarships from our database.',
    switchTab: 'scholarships',
    keepClear: ['overview'],
  },

  // Aid Engine tab
  {
    selector: '[data-tour="tab-scholarship-search"]',
    pad: 6,
    title: 'Aid Engine',
    desc: 'Our matching engine scores scholarships against your profile. Higher match percentage = better fit for you.',
    switchTab: 'scholarship-search',
    keepClear: ['sidebar', 'overview'],
  },
  {
    selector: '[data-tour="aid-engine-filters"]',
    pad: 8,
    title: 'Search & Filter',
    desc: 'Search by name, filter by match strength, type, or deadline, and sort to find the best opportunities fast.',
    switchTab: 'scholarship-search',
    keepClear: ['overview'],
  },

  // Deadlines tab
  {
    selector: '[data-tour="tab-deadlines"]',
    pad: 6,
    title: 'Deadlines',
    desc: 'Track financial aid deadlines for your college list. Missing a priority deadline can cost thousands.',
    switchTab: 'deadlines',
    keepClear: ['sidebar', 'overview'],
  },
  {
    selector: '[data-tour="deadlines-search"]',
    pad: 8,
    title: 'Add Colleges',
    desc: 'Search and add colleges to see their FAFSA, CSS Profile, and aid letter deadlines with urgency indicators.',
    switchTab: 'deadlines',
    keepClear: ['overview'],
  },

  // Aid Compare tab
  {
    selector: '[data-tour="tab-aid-compare"]',
    pad: 6,
    title: 'Aid Compare',
    desc: 'Compare cost of attendance and estimated aid across your college list side by side.',
    switchTab: 'aid-compare',
    keepClear: ['sidebar', 'overview'],
  },
  {
    selector: '[data-tour="aid-compare-search"]',
    pad: 8,
    title: 'Compare Costs',
    desc: 'Add colleges, then enter estimated aid from each school\'s Net Price Calculator to see your real net cost.',
    switchTab: 'aid-compare',
    keepClear: ['overview'],
  },

  // Chat
  {
    selector: '[data-tour="chat"]',
    pad: 8,
    title: 'AI Advisor',
    desc: "Have questions? Ask the AI advisor anything about FAFSA, scholarships, or aid packages. No question is too basic.",
    switchTab: 'overview',
    keepClear: ['chat'],
  },

  // Breadcrumb
  {
    selector: '[data-tour="breadcrumb"]',
    pad: 6,
    title: 'Navigation',
    desc: 'Get back to the dashboard anytime from here, or press Esc to close.',
    keepClear: ['breadcrumb'],
  },
]

const EASE_OUT = [0.22, 1, 0.36, 1] as const
const INTRO_TEXT = "Here's your financial aid hub."
const INTRO_SUB = "Let's take a quick look at everything you have access to."
const CHAR_DELAY = 0.04

interface Rect { x: number; y: number; w: number; h: number }

export default function FafsaModuleTour({ onDismiss, onSwitchTab }: Props) {
  const [phase, setPhase] = useState<'intro' | 'tour'>('intro')
  const [showIntroText, setShowIntroText] = useState(false)
  const [showSub, setShowSub] = useState(false)
  const [showContinue, setShowContinue] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 })
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  useEffect(() => {
    const t1 = setTimeout(() => setShowIntroText(true), 400)
    const t2 = setTimeout(() => setShowSub(true), 400 + (INTRO_TEXT.length * CHAR_DELAY + 0.4) * 1000)
    const t3 = setTimeout(() => setShowContinue(true), 400 + (INTRO_TEXT.length * CHAR_DELAY + 0.4) * 1000 + 800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const stepRef = useRef(step)
  stepRef.current = step

  // Apply/remove blur on module sections based on current step's keepClear
  useEffect(() => {
    if (phase !== 'tour') return
    const clear = current.keepClear
    ALL_SECTIONS.forEach((section) => {
      const el = document.querySelector(`[data-tour="${section}"]`) as HTMLElement | null
      if (!el) return
      el.style.transition = 'filter 0.35s ease'
      el.style.filter = clear.includes(section) ? '' : 'blur(4px)'
    })
    return () => {
      ALL_SECTIONS.forEach((section) => {
        const el = document.querySelector(`[data-tour="${section}"]`) as HTMLElement | null
        if (el) { el.style.filter = ''; el.style.transition = '' }
      })
    }
  }, [phase, step])

  const measure = useCallback((stepIdx: number) => {
    const s = STEPS[stepIdx]
    const py = s.padY ?? s.pad
    const el = document.querySelector(s.selector)
    if (el) {
      const b = el.getBoundingClientRect()
      setRect({ x: b.left - s.pad, y: b.top - py, w: b.width + s.pad * 2, h: b.height + py * 2 })
    } else {
      const cx = window.innerWidth / 2
      setRect({ x: cx - 80, y: 100, w: 160, h: 80 })
    }
  }, [])

  const goToStep = useCallback((stepIdx: number) => {
    const s = STEPS[stepIdx]
    if (s.switchTab && onSwitchTab) {
      onSwitchTab(s.switchTab)
      // Wait for tab content to render before measuring
      setTimeout(() => measure(stepIdx), 100)
    } else {
      measure(stepIdx)
    }
  }, [onSwitchTab, measure])

  // Navigate to step — go through goToStep which handles tab switching
  useEffect(() => {
    if (phase !== 'tour') return
    const t = setTimeout(() => goToStep(step), 60)
    return () => clearTimeout(t)
  }, [step, phase, goToStep])

  // Re-measure on resize without re-registering the listener every step
  useEffect(() => {
    if (phase !== 'tour') return
    const handleResize = () => measure(stepRef.current)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [phase, measure])

  const dismiss = () => {
    if (onSwitchTab) onSwitchTab('overview')
    onDismiss()
  }

  const next = () => {
    if (isLast) dismiss()
    else setStep(s => s + 1)
  }

  const back = () => {
    if (step > 0) setStep(s => s - 1)
  }

  const tooltipPos = useMemo((): React.CSSProperties => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const spotCx = rect.x + rect.w / 2
    const spotCy = rect.y + rect.h / 2
    const tw = 320

    if (spotCx < vw * 0.35) {
      return {
        top: Math.max(16, Math.min(rect.y, vh - 220)),
        left: Math.min(rect.x + rect.w + 16, vw - tw - 16),
      }
    } else if (spotCy < vh * 0.5) {
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
                {INTRO_TEXT.split('').map((char, i) => (
                  <motion.span
                    key={i}
                    className="tour-intro-char"
                    initial={{ opacity: 0, y: 6 }}
                    animate={showIntroText ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: i * CHAR_DELAY, duration: 0.3, ease: EASE_OUT }}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </motion.span>
                ))}
              </h2>
              <motion.p
                className="tour-intro-sub"
                initial={{ opacity: 0, y: 12 }}
                animate={showSub ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, ease: EASE_OUT }}
              >
                {INTRO_SUB}
              </motion.p>
              <motion.button
                className="tour-intro-btn"
                initial={{ opacity: 0, y: 10 }}
                animate={showContinue ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, ease: EASE_OUT }}
                onClick={() => setPhase('tour')}
              >
                Show me around
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
            {/* Spotlight cutout */}
            <motion.div
              className="tour-spotlight"
              animate={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
            />

            {/* Tooltip */}
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
                  <span className="tour-tooltip-counter">{step + 1} of {STEPS.length}</span>
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
