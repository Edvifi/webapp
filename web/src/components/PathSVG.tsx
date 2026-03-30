/**
 * PathSVG
 *
 * Renders the snake timeline path with:
 * - Full background track
 * - Per-segment colored progress (simple opacity, no dashoffset)
 * - Animated nodes (glow, fill)
 * - Phase pill labels
 * - Year labels with animated line
 * - Phantom fading tail
 */

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  NODES, SEGS, SVG_W, SVG_H,
  FULL_PATH_D, TAIL_SEGS, PHASE_SHORT, labelSide,
} from '../data/pathGeometry'
import { milestones, YEAR_GROUPS, YEAR_COLORS } from '../data/timelineData'

interface Props {
  currentIdx: number
}

// ── Build a single-segment bezier path string ─────────────────────────────────
const f = (v: number) => v.toFixed(2)

function segmentPath(i: number): string {
  const p0 = NODES[i]
  const { cp1, cp2 } = SEGS[i]
  const p1 = NODES[i + 1]
  return `M ${f(p0.x)} ${f(p0.y)} C ${f(cp1.x)} ${f(cp1.y)} ${f(cp2.x)} ${f(cp2.y)} ${f(p1.x)} ${f(p1.y)}`
}

// Which year color does a segment belong to?
function segmentColor(i: number): string {
  // Segment i connects node i → node i+1.
  // Use the color of the year group that node i belongs to.
  if (i < 2)  return YEAR_COLORS[0] // Freshman: segments 0,1
  if (i < 5)  return YEAR_COLORS[1] // Sophomore: segments 2,3,4
  if (i < 9)  return YEAR_COLORS[2] // Junior: segments 5,6,7,8
  return YEAR_COLORS[3]             // Senior: segments 9,10,11,12
}

// Pre-build all segment paths
const SEGMENT_PATHS = NODES.slice(0, -1).map((_, i) => ({
  d: segmentPath(i),
  color: segmentColor(i),
}))

// ── Segment (one bezier between two nodes) ────────────────────────────────────
// Uses browser-measured getTotalLength() for accurate stroke-dashoffset drawing.
function Segment({ index, currentIdx }: { index: number; currentIdx: number }) {
  const seg = SEGMENT_PATHS[index]
  const pathRef = useRef<SVGPathElement>(null)
  const [len, setLen] = useState(0)
  const progress = useMotionValue(0)
  const dashOffset = useTransform(progress, (p) => len * (1 - p))

  // Measure actual path length from the browser on mount
  useEffect(() => {
    if (pathRef.current) {
      setLen(pathRef.current.getTotalLength())
    }
  }, [])

  // Animate progress: 0 = hidden, 1 = fully drawn
  useEffect(() => {
    if (len === 0) return
    const filled = currentIdx > index     // user has passed this segment
    const active = currentIdx === index   // user is on the start node

    // When going forward past this segment, draw it. When on the start node,
    // keep it hidden (the previous segment already reaches this node).
    const target = filled ? 1 : 0

    animate(progress, target, {
      duration: 0.55,
      ease: [0.25, 0.46, 0.45, 0.94],
    })
  }, [currentIdx, index, len, progress])

  const filled = currentIdx > index
  const nearby = Math.abs(currentIdx - index) <= 1

  return (
    <g>
      {/* Glow layer */}
      <motion.path
        d={seg.d}
        stroke={seg.color}
        strokeWidth={22}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={len || undefined}
        strokeDashoffset={dashOffset as unknown as number}
        animate={{ opacity: filled ? 0.16 : 0 }}
        transition={{ duration: 0.4 }}
      />
      {/* Solid layer — this is the one we measure */}
      <motion.path
        ref={pathRef}
        d={seg.d}
        stroke={seg.color}
        strokeWidth={11}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={len || undefined}
        strokeDashoffset={dashOffset as unknown as number}
        opacity={filled || nearby ? 0.85 : 0.15}
        style={{ transition: 'opacity 0.4s' }}
      />
    </g>
  )
}

// ── Single node ───────────────────────────────────────────────────────────────
function TrackNode({ index, currentIdx }: { index: number; currentIdx: number }) {
  const node   = NODES[index]
  const accent = milestones[index].accent
  const isPast   = index < currentIdx
  const isActive = index === currentIdx

  return (
    <g>
      {/* Glow ring */}
      <motion.circle
        cx={node.x} cy={node.y}
        animate={{ r: isActive ? 28 : 18, fillOpacity: isActive ? 0.2 : 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        fill={accent}
      />
      {/* White base */}
      <circle cx={node.x} cy={node.y} r={18} fill="#F2EBE0" />
      {/* Colored fill */}
      <motion.circle
        cx={node.x} cy={node.y} r={18}
        fill={accent}
        animate={{ fillOpacity: isPast || isActive ? 1 : 0.22 }}
        transition={{ duration: 0.35 }}
      />
    </g>
  )
}

// ── Phase pill label ──────────────────────────────────────────────────────────
const CHAR_W = 8.5
const PAD    = 14

function PhaseLabel({ index, currentIdx }: { index: number; currentIdx: number }) {
  const node     = NODES[index]
  const accent   = milestones[index].accent
  const phase    = PHASE_SHORT[milestones[index].phase] ?? milestones[index].phase
  const pillW    = phase.length * CHAR_W + PAD * 2
  const pillH    = 28
  const onLeft   = node.x < SVG_W * 0.5
  const edgeX    = onLeft ? node.x - 20 : node.x + 20
  const pillX    = onLeft ? edgeX - pillW : edgeX
  const textX    = onLeft ? edgeX - pillW / 2 : edgeX + pillW / 2
  const dist     = Math.abs(index - currentIdx)
  const opacity  = dist === 0 ? 1 : dist === 1 ? 0.45 : 0.22

  return (
    <motion.g animate={{ opacity }} transition={{ duration: 0.3 }}>
      <rect
        x={pillX} y={node.y - pillH / 2}
        width={pillW} height={pillH}
        rx={pillH / 2}
        fill="#F2EBE0"
      />
      <rect
        x={pillX} y={node.y - pillH / 2}
        width={pillW} height={pillH}
        rx={pillH / 2}
        fill={accent} fillOpacity={0.18}
      />
      <text
        x={textX} y={node.y + 5}
        fontSize={13} fontWeight={700}
        fill={accent}
        textAnchor="middle"
        fontFamily="'Outfit', sans-serif"
      >
        {phase}
      </text>
    </motion.g>
  )
}

// ── Year label with animated line ─────────────────────────────────────────────
function YearLabel({ groupIdx, currentIdx }: { groupIdx: number; currentIdx: number }) {
  const yg       = YEAR_GROUPS[groupIdx]
  const node     = NODES[yg.startIndex]
  const side     = labelSide(yg.startIndex)
  const lx       = side === 'right' ? SVG_W - 18 : 18
  const anchor   = side === 'right' ? 'end' : 'start'
  const lineX2   = side === 'right' ? node.x + 32 : node.x - 32
  const lineLen  = Math.abs(lx - lineX2)

  const isActive = currentIdx >= yg.startIndex && currentIdx < yg.startIndex + yg.count
  const opacity  = isActive ? 0.85 : 0.28

  const lineProgress = useMotionValue(isActive ? 1 : 0)
  const dashOffset   = useTransform(lineProgress, (p) => lineLen * (1 - p))

  useEffect(() => {
    animate(lineProgress, isActive ? 1 : 0, { duration: 0.45, ease: 'easeOut' })
  }, [isActive, lineProgress])

  return (
    <motion.g animate={{ opacity }} transition={{ duration: 0.4 }}>
      <text
        x={lx} y={node.y - 8}
        fontSize={16} fontWeight={800}
        fill={yg.color}
        textAnchor={anchor}
        letterSpacing={5}
        fontFamily="'Young Serif', Georgia, serif"
      >
        {yg.label.toUpperCase()}
      </text>
      <motion.line
        x1={lx} y1={node.y} x2={lineX2} y2={node.y}
        stroke={yg.color}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={lineLen}
        strokeDashoffset={dashOffset as unknown as number}
      />
    </motion.g>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PathSVG({ currentIdx }: Props) {
  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width={SVG_W}
      style={{ display: 'block' }}
    >
      {/* Dim background track */}
      <path
        d={FULL_PATH_D}
        stroke="rgba(40,22,6,0.10)"
        strokeWidth={11}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Phantom fading tail */}
      {TAIL_SEGS.map((t, i) => (
        <path
          key={i}
          d={t.d}
          stroke="#7BAABF"
          strokeWidth={11}
          strokeLinecap="round"
          fill="none"
          opacity={t.opacity}
        />
      ))}

      {/* Per-segment colored progress */}
      {SEGMENT_PATHS.map((_, i) => (
        <Segment key={i} index={i} currentIdx={currentIdx} />
      ))}

      {/* Year labels */}
      {YEAR_GROUPS.map((_, i) => (
        <YearLabel key={i} groupIdx={i} currentIdx={currentIdx} />
      ))}

      {/* Nodes */}
      {NODES.map((_, i) => (
        <TrackNode key={i} index={i} currentIdx={currentIdx} />
      ))}

      {/* Phase labels */}
      {NODES.map((_, i) => (
        <PhaseLabel key={i} index={i} currentIdx={currentIdx} />
      ))}
    </svg>
  )
}
