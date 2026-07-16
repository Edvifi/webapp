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
import { NODES, SVG_W, SEGS, type Point } from '../data/pathGeometry'
import { milestones, yearGroupOf, YEAR_GROUPS, type YearGroup } from '../data/timelineData'
import { getModuleData } from '../lib/moduleProgress'
import type { ApplicationEntry } from '../data/applicationsChecklist'
import {
  deriveDeadlineEvents,
  upcomingEvents,
  APPLICATIONS_MODULE,
  APPLICATIONS_DATA_KEY,
  type DeadlineEvent,
} from '../data/applicationDeadlines'
import { useCollegesReady } from '../lib/useColleges'

interface Props {
  startIdx: number
  answers: Record<string, number>
}

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

const SENIOR_GROUP: YearGroup = YEAR_GROUPS.find((g) => g.label === 'Senior') ?? YEAR_GROUPS[YEAR_GROUPS.length - 1]

/**
 * Map a real deadline date onto the timeline path. Application deadlines are
 * senior-year events, so they always land in the *senior* section of the path
 * (milestones 10–13) — which is visible on every student's timeline, not just
 * seniors'. Returns { afterMilestone, position }, or null if the date falls
 * outside the senior window (e.g. summer, before the first senior milestone).
 *
 * This is intentionally independent of the viewer's grade: a junior scrolling
 * down to the senior stretch sees what's coming; the sidebar lists it by date.
 */
function eventToPathPos(date: Date): { afterMilestone: number; position: number } | null {
  const calMonth = date.getMonth()
  // Day-level resolution so two deadlines in the same month (e.g. Jan 1 vs
  // Jan 15) don't collapse onto the exact same point on the path.
  const dayFrac = (date.getDate() - 1) / 31
  const schoolMonth = (calMonth >= 7 ? calMonth - 7 : calMonth + 5) + dayFrac
  const first = SENIOR_GROUP.startIndex
  const last = SENIOR_GROUP.startIndex + SENIOR_GROUP.count - 1
  for (let i = first; i < last; i++) {
    const mA = MILESTONE_SCHOOL_MONTHS[i]
    const mB = MILESTONE_SCHOOL_MONTHS[i + 1]
    const span = mB > mA ? mB - mA : mB + 12 - mA
    const dist = schoolMonth >= mA ? schoolMonth - mA : schoolMonth + 12 - mA
    if (dist < span) return { afterMilestone: i, position: dist / span }
  }
  return null
}

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

/**
 * Exact point on the rendered path for segment `i` at t∈[0,1]. The path is a
 * Catmull-Rom → cubic bezier through NODES, so a straight lerp between node
 * centers lands *beside* the curve (leaving a gap under the connector line).
 * Evaluating the actual cubic bezier puts the anchor right on the path.
 */
function bezierPoint(i: number, t: number): Point {
  const seg = SEGS[i]
  const p0 = NODES[i]
  const p1 = NODES[i + 1]
  if (!seg || !p0 || !p1) return p0 ?? { x: SVG_W / 2, y: 0 }
  const m = 1 - t
  return {
    x: m ** 3 * p0.x + 3 * m ** 2 * t * seg.cp1.x + 3 * m * t ** 2 * seg.cp2.x + t ** 3 * p1.x,
    y: m ** 3 * p0.y + 3 * m ** 2 * t * seg.cp1.y + 3 * m * t ** 2 * seg.cp2.y + t ** 3 * p1.y,
  }
}

export default function TimelinePage({ startIdx }: Props) {
  const group = yearGroupOf(startIdx)
  const node = NODES[startIdx]
  const [hereVisible, setHereVisible] = useState(true)
  // Cross-highlight between path pins and sidebar rows.
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useCollegesReady() // ensure DB colleges are loaded so deadline lookups resolve
  // Real deadlines derived from the student's college list.
  const [apps, setApps] = useState<ApplicationEntry[]>([])
  useEffect(() => {
    let cancelled = false
    getModuleData<ApplicationEntry[]>(APPLICATIONS_MODULE, APPLICATIONS_DATA_KEY)
      .then((data) => { if (!cancelled && data) setApps(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  const events = useMemo(() => deriveDeadlineEvents(apps), [apps])
  // Deadlines mapped onto the senior stretch of the path (see eventToPathPos).
  const pathEvents = useMemo(
    () =>
      events
        .map((e) => ({ event: e, pos: eventToPathPos(e.date) }))
        .filter((x): x is { event: DeadlineEvent; pos: { afterMilestone: number; position: number } } => x.pos !== null),
    [events],
  )
  // Everything still ahead, for the sidebar rail (all grades).
  const upcoming = useMemo(() => upcomingEvents(events, new Date()), [events])
  // Stable 1-based number per deadline (by date), shared by the path markers
  // and the sidebar so the two cross-reference.
  const numberOf = useMemo(() => new Map(events.map((e, i) => [e.id, i + 1])), [events])

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

  // Non-seniors sit above the senior stretch where deadlines live; offer a jump.
  const showDeadlineJump = group.label !== 'Senior' && pathEvents.length > 0
  const scrollToDeadlines = () => {
    const el = document.getElementById('tl-scroll')
    if (!el) return
    const seniorY = NODES[SENIOR_GROUP.startIndex].y * SCALE
    el.scrollTo({ top: Math.max(0, seniorY - 140), behavior: 'smooth' })
  }

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

              {/* Jump hint — deadlines live down in the senior stretch */}
              {showDeadlineJump && (
                <motion.button
                  type="button"
                  onClick={scrollToDeadlines}
                  className="tl-deadline-jump"
                  style={{ left: nodeScaledX, top: `${nodeScaledY + 66}px` }}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.4, ease: EASE_OUT }}
                  whileHover={{ y: 2 }}
                >
                  📅 {pathEvents.length} deadline{pathEvents.length > 1 ? 's' : ''} in Senior year ↓
                </motion.button>
              )}

              {/* Deadline markers — numbered pins sitting on the senior path */}
              {pathEvents.map(({ event, pos }, i) => {
                const pt = bezierPoint(pos.afterMilestone, pos.position)
                const markX = `calc(50% + ${(pt.x - SVG_W / 2) * SCALE}px)`
                const markY = pt.y * SCALE
                const active = hoveredId === event.id
                return (
                  <motion.div
                    key={event.id}
                    className="tl-deadline-marker"
                    style={{
                      left: markX,
                      top: `${markY}px`,
                      background: event.color,
                      boxShadow: active ? `0 0 0 5px ${event.color}44, 0 4px 14px rgba(60,35,10,0.35)` : undefined,
                      zIndex: active ? 7 : 5,
                    }}
                    title={`${event.shortTitle} — ${event.dateDisplay}`}
                    onMouseEnter={() => setHoveredId(event.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: active ? 1.35 : 1 }}
                    transition={{ delay: 0.6 + i * 0.08, duration: 0.4, ease: EASE_OUT }}
                  >
                    {numberOf.get(event.id)}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* Deadlines sidebar */}
        <div className="tl-tasks">
          <h3 className="tl-tasks-title">Upcoming Deadlines</h3>
          {upcoming.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-faint)', padding: '4px 0' }}>
              {apps.length === 0
                ? 'Add colleges in Application Tracking to see their deadlines here.'
                : 'No upcoming deadlines.'}
            </p>
          )}
          {upcoming.map((event, i) => (
            <motion.div
              key={event.id}
              className="tl-task"
              onMouseEnter={() => setHoveredId(event.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={hoveredId === event.id ? { borderColor: event.color, background: `${event.color}12`, boxShadow: `0 4px 14px ${event.color}30` } : undefined}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.06, duration: 0.4, ease: EASE_OUT }}
            >
              <div className="tl-task-num" style={{ background: event.color }}>{numberOf.get(event.id)}</div>
              <div className="tl-task-content">
                <span className="tl-task-name">{event.title}</span>
                <span className="tl-task-meta">{event.module} · {event.dateDisplay}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

    </div>
  )
}
