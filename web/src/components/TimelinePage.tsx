/**
 * TimelinePage — Overview of the user's timeline position
 *
 * Zoomed-in scrollable path. "You are here" draws a line to the
 * current node then fades away. TODOs are positioned BETWEEN nodes
 * with connector lines to the path.
 *
 * Tasks use a standard interface so they can be swapped with backend data.
 */

import { useMemo, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import PathSVG from './PathSVG'
import { NODES, SVG_W } from '../data/pathGeometry'
import { milestones, yearGroupOf, YEAR_GROUPS } from '../data/timelineData'

interface Props {
  startIdx: number
  answers: Record<string, number>
}

/** Task shape — plug into backend by replacing this array */
export interface TimelineTask {
  id: string
  title: string
  due: string       // ISO date or display string
  /** Index of the milestone this task falls AFTER (task sits between afterMilestone and afterMilestone+1) */
  afterMilestone: number
  /** 0–1 how far between the two milestones (0 = right after, 1 = right before next) */
  position: number
  color: string
  module: string
}

// Mock data — dates in April 2026 to match current context
const MOCK_TASKS: TimelineTask[] = [
  // Completed — Freshman Fall (milestone 0)
  { id: 't1', title: 'Explore the Knowledge Library', due: 'Sep 10', afterMilestone: 0, position: 0.3, color: '#3F5BA9', module: 'Knowledge Library' },
  { id: 't2', title: 'Research FAFSA basics',         due: 'Oct 5',  afterMilestone: 0, position: 0.7, color: '#C47A12', module: 'Financial Aid' },
  // Completed — Freshman Spring (milestone 1)
  { id: 't3', title: 'Find scholarships you qualify for', due: 'Jan 20', afterMilestone: 1, position: 0.3, color: '#C47A12', module: 'Financial Aid' },
  { id: 't4', title: 'Start your college list',       due: 'Feb 15', afterMilestone: 1, position: 0.7, color: '#7048C8', module: 'Application Tracking' },
  // Current — Freshman End of Year (milestone 2)
  { id: 't5', title: 'Brainstorm essay topics',       due: 'Mar 28', afterMilestone: 2, position: 0.3, color: '#1D7FC4', module: 'College Essays' },
  // Upcoming — still Freshman
  { id: 't6', title: 'Draft your personal statement', due: 'Apr 14', afterMilestone: 2, position: 0.6, color: '#1D7FC4', module: 'College Essays' },
  { id: 't7', title: 'Add deadlines to your tracker', due: 'May 1',  afterMilestone: 2, position: 0.85, color: '#7048C8', module: 'Application Tracking' },
]

const EASE_OUT = [0.22, 1, 0.36, 1] as const
const SCALE = 1.4

/**
 * Calculate progress index based on current date, constrained to user's year.
 *
 * Uses YEAR_GROUPS to determine which milestones belong to the user's grade.
 * Maps each milestone to a calendar date within the school year (Aug → June),
 * then interpolates based on today's date.
 */

// Each milestone's approximate month within its school year (Aug=0 … July=11)
// School year months: Aug(0) Sep(1) Oct(2) Nov(3) Dec(4) Jan(5) Feb(6) Mar(7) Apr(8) May(9) Jun(10) Jul(11)
const MILESTONE_SCHOOL_MONTHS = [
  1,   // 0: Freshman Fall — Sep
  5,   // 1: Freshman Spring — Jan
  9,   // 2: Freshman End of Year — May
  1,   // 3: Sophomore Fall — Sep
  5,   // 4: Sophomore Spring — Jan
  10,  // 5: Sophomore Summer — Jun
  0,   // 6: Junior Pre-school — Aug
  2,   // 7: Junior Fall — Oct
  4,   // 8: Junior Winter — Dec
  7,   // 9: Junior Spring — Mar
  10,  // 10: Senior Summer Before — Jun
  1,   // 11: Senior Early Fall — Sep
  4,   // 12: Senior Winter — Dec
  8,   // 13: Senior Spring — Apr
]

function calculateProgress(startIdx: number): number {
  const now = new Date()

  // Figure out the user's year group
  const yg = yearGroupOf(startIdx)
  const firstMilestone = yg.startIndex
  const lastMilestone = yg.startIndex + yg.count - 1

  // Convert today to school-year month (Aug=0, Sep=1, ..., Jul=11)
  const calMonth = now.getMonth() // 0=Jan ... 11=Dec
  const schoolMonth = calMonth >= 7 ? calMonth - 7 : calMonth + 5

  // Find which two milestones we're between within this year.
  // School months can wrap (e.g. Senior: Jun=10, Sep=1 means mB < mA).
  for (let i = firstMilestone; i < lastMilestone; i++) {
    const mA = MILESTONE_SCHOOL_MONTHS[i]
    const mB = MILESTONE_SCHOOL_MONTHS[i + 1]
    const span = mB > mA ? mB - mA : mB + 12 - mA // handle year wrap
    const dist = schoolMonth >= mA ? schoolMonth - mA : schoolMonth + 12 - mA
    if (dist < span) {
      const frac = dist / span
      return i + frac
    }
  }

  // If past the last milestone in this year, cap there
  if (schoolMonth >= MILESTONE_SCHOOL_MONTHS[lastMilestone]) {
    return lastMilestone
  }

  // Before the first milestone
  return firstMilestone
}

/** Interpolate a point between two nodes */
function lerpNode(idxA: number, idxB: number, t: number) {
  const a = NODES[idxA], b = NODES[idxB]
  if (!a || !b) return a ?? { x: 200, y: 200 }
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

export default function TimelinePage({ startIdx }: Props) {
  const group = yearGroupOf(startIdx)
  const node = NODES[startIdx]
  const [hereVisible, setHereVisible] = useState(true)

  // Fractional progress based on current date (e.g., 1.75 = 75% between milestone 1 and 2)
  const rawProgress = useMemo(() => calculateProgress(startIdx), [startIdx])
  // PathSVG currentIdx controls which nodes are "active" — use the floor
  const progressIdx = Math.floor(rawProgress)

  const pathStyle = useMemo(() => ({
    transform: `scale(${SCALE})`,
    transformOrigin: 'top center',
    width: `${SVG_W}px`,
    margin: '0 auto',
  }), [])

  // Auto-scroll to current node
  useEffect(() => {
    const el = document.getElementById('tl-scroll')
    if (el) el.scrollTop = Math.max(0, node.y * SCALE - 180)
  }, [node])

  // "You are here" draws in then fades out after 3s
  useEffect(() => {
    const t = setTimeout(() => setHereVisible(false), 3500)
    return () => clearTimeout(t)
  }, [])

  const nodeScaledX = `calc(50% + ${(node.x - SVG_W / 2) * SCALE}px)`
  const nodeScaledY = node.y * SCALE

  return (
    <div className="tl-page">
      <motion.div
        className="tl-header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        <h1 className="tl-title">Your Timeline</h1>
        <p className="tl-subtitle">
          You're on <strong style={{ color: group.color }}>{milestones[startIdx].title}</strong> — {group.label} Year
        </p>
        <div className="tl-legend">
          {YEAR_GROUPS.map(yg => (
            <div key={yg.label} className={`tl-legend-item ${yg === group ? 'tl-legend-item--active' : ''}`}>
              <span className="tl-legend-dot" style={{ background: yg.color }} />
              <span className="tl-legend-label">{yg.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="tl-body">
        <motion.div
          className="tl-path-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          style={{ '--tl-tint': group.tint, '--tl-color': group.color } as React.CSSProperties}
        >
          <div
            className="tl-path-glow"
            style={{
              left: nodeScaledX,
              top: `${nodeScaledY}px`,
              background: `radial-gradient(ellipse 300px 300px at center, ${group.color}18, transparent 70%)`,
            }}
          />

          <div className="tl-path-scroll" id="tl-scroll">
            <div className="tl-path-content">
              <div style={pathStyle}>
                <PathSVG currentIdx={progressIdx} zoom={SCALE} progressFraction={rawProgress - progressIdx} />
              </div>

              {/* "You are here" — badge + line that draws then fades */}
              <motion.div
                className="tl-here-group"
                style={{ left: nodeScaledX, top: `${nodeScaledY}px` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: hereVisible ? 1 : 0 }}
                transition={{ duration: hereVisible ? 0.4 : 0.8, delay: hereVisible ? 0.4 : 0 }}
              >
                {/* Connector line from badge to node */}
                <motion.div
                  className="tl-here-line"
                  style={{ background: group.color }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: hereVisible ? 1 : 0 }}
                  transition={{
                    duration: hereVisible ? 0.5 : 0.6,
                    delay: hereVisible ? 0.5 : 0,
                    ease: EASE_OUT,
                  }}
                />
                <motion.div
                  className="tl-here-badge"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: hereVisible ? 1 : 0.8, opacity: hereVisible ? 1 : 0 }}
                  transition={{
                    duration: hereVisible ? 0.4 : 0.5,
                    delay: hereVisible ? 0.8 : 0,
                    type: hereVisible ? 'spring' : 'tween',
                    stiffness: 300, damping: 20,
                  }}
                >
                  <span className="tl-here-dot" style={{ background: group.color }} />
                  <span className="tl-here-text">You are here</span>
                </motion.div>
              </motion.div>

              {/* TODO cards — positioned BETWEEN milestones with connector lines */}
              {MOCK_TASKS.map((task, i) => {
                const nextIdx = Math.min(task.afterMilestone + 1, NODES.length - 1)
                const pt = lerpNode(task.afterMilestone, nextIdx, task.position)
                const side = pt.x < SVG_W / 2 ? 'right' : 'left'
                const taskX = `calc(50% + ${(pt.x - SVG_W / 2) * SCALE}px)`
                const taskY = pt.y * SCALE

                return (
                  <motion.div
                    key={task.id}
                    className={`tl-todo-group tl-todo-group--${side}`}
                    style={{ top: `${taskY}px`, left: taskX }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 + i * 0.06, duration: 0.4, ease: EASE_OUT }}
                  >
                    {/* Horizontal connector line to path */}
                    <motion.div
                      className={`tl-todo-line tl-todo-line--${side}`}
                      style={{ background: task.color + '55' }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.7 + i * 0.06, duration: 0.3, ease: EASE_OUT }}
                    />
                    {/* Card */}
                    <motion.div
                      className={`tl-path-todo tl-path-todo--${side}`}
                      initial={{ opacity: 0, x: side === 'right' ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.75 + i * 0.06, duration: 0.35, ease: EASE_OUT }}
                    >
                      <div className="tl-todo-bar" style={{ background: task.color }} />
                      <div className="tl-todo-content">
                        <span className="tl-todo-name">{task.title}</span>
                        <span className="tl-todo-due">{task.module} · {task.due}</span>
                      </div>
                    </motion.div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* Tasks sidebar */}
        <div className="tl-tasks">
          <h3 className="tl-tasks-title">All Upcoming</h3>
          {MOCK_TASKS.map((task, i) => (
            <motion.div
              key={task.id}
              className="tl-task"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.06, duration: 0.4, ease: EASE_OUT }}
            >
              <div className="tl-task-bar" style={{ background: task.color }} />
              <div className="tl-task-content">
                <span className="tl-task-name">{task.title}</span>
                <span className="tl-task-meta">{task.module} · {task.due}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

    </div>
  )
}
