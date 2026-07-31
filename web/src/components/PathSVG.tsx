/**
 * PathSVG
 *
 * Renders the snake timeline path. Accepts an optional `zoom` prop —
 * when the SVG is CSS-scaled externally, all text/node/stroke sizes
 * are divided by `zoom` so they stay visually proportionate.
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
  /** CSS scale applied externally. Sizes divided by this to compensate. Default 1. */
  zoom?: number
  /** 0–1 fraction of the CURRENT segment that should be filled (for partial progress). Default 0. */
  progressFraction?: number
}

// ── Build a single-segment bezier path string ─────────────────────────────────
const fmt = (v: number) => v.toFixed(2)

function segmentPath(i: number): string {
  const p0 = NODES[i]
  const { cp1, cp2 } = SEGS[i]
  const p1 = NODES[i + 1]
  return `M ${fmt(p0.x)} ${fmt(p0.y)} C ${fmt(cp1.x)} ${fmt(cp1.y)} ${fmt(cp2.x)} ${fmt(cp2.y)} ${fmt(p1.x)} ${fmt(p1.y)}`
}

function segmentColor(i: number): string {
  if (i < 2)  return YEAR_COLORS[0]
  if (i < 5)  return YEAR_COLORS[1]
  if (i < 9)  return YEAR_COLORS[2]
  return YEAR_COLORS[3]
}

const SEGMENT_PATHS = NODES.slice(0, -1).map((_, i) => ({
  d: segmentPath(i),
  color: segmentColor(i),
}))

// ── Segment ───────────────────────────────────────────────────────────────────
function Segment({ index, currentIdx, z, partialFill = 0 }: { index: number; currentIdx: number; z: number; partialFill?: number }) {
  const clampedFill = Math.max(0, Math.min(1, partialFill))
  const seg = SEGMENT_PATHS[index]
  const pathRef = useRef<SVGPathElement>(null)
  const [len, setLen] = useState(0)
  const progress = useMotionValue(0)
  const dashOffset = useTransform(progress, (p) => len * (1 - p))

  useEffect(() => {
    if (pathRef.current) setLen(pathRef.current.getTotalLength())
  }, [])

  useEffect(() => {
    if (len === 0) return
    let target = 0
    if (currentIdx > index) {
      target = 1 // fully filled
    } else if (currentIdx === index && clampedFill > 0) {
      target = clampedFill // partially filled (0–1)
    }
    animate(progress, target, { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] })
  }, [currentIdx, index, len, progress, clampedFill])

  const filled = currentIdx > index
  const partial = currentIdx === index && clampedFill > 0
  const nearby = Math.abs(currentIdx - index) <= 1

  return (
    <g>
      <motion.path
        d={seg.d} stroke={seg.color} strokeWidth={22 / z}
        strokeLinecap="round" strokeLinejoin="round" fill="none"
        strokeDasharray={len || undefined}
        strokeDashoffset={dashOffset as unknown as number}
        animate={{ opacity: filled || partial ? 0.16 : 0 }}
        transition={{ duration: 0.4 }}
      />
      <motion.path
        ref={pathRef}
        d={seg.d} stroke={seg.color} strokeWidth={11 / z}
        strokeLinecap="round" strokeLinejoin="round" fill="none"
        strokeDasharray={len || undefined}
        strokeDashoffset={dashOffset as unknown as number}
        opacity={filled || partial || nearby ? 0.85 : 0.15}
        style={{ transition: 'opacity 0.4s' }}
      />
    </g>
  )
}

// ── Node ──────────────────────────────────────────────────────────────────────
function TrackNode({ index, currentIdx, z }: { index: number; currentIdx: number; z: number }) {
  const node   = NODES[index]
  const accent = milestones[index].accent
  const isPast   = index < currentIdx
  const isActive = index === currentIdx
  const r = 18 / z
  const glowR = 28 / z

  return (
    <g>
      <motion.circle
        cx={node.x} cy={node.y}
        animate={{ r: isActive ? glowR : r, fillOpacity: isActive ? 0.2 : 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        fill={accent}
      />
      <circle cx={node.x} cy={node.y} r={r} fill="var(--bg)" />
      <motion.circle
        cx={node.x} cy={node.y} r={r}
        fill={accent}
        animate={{ fillOpacity: isPast || isActive ? 1 : 0.22 }}
        transition={{ duration: 0.35 }}
      />
    </g>
  )
}

// ── Phase pill label ──────────────────────────────────────────────────────────
function PhaseLabel({ index, currentIdx, z }: { index: number; currentIdx: number; z: number }) {
  const node     = NODES[index]
  const accent   = milestones[index].accent
  const phase    = PHASE_SHORT[milestones[index].phase] ?? milestones[index].phase
  const s        = Math.max((z + 1) / 2, 1)
  const fontSize = 13 / s
  const charW    = 8.5 / s
  const pad      = 14 / s
  const pillW    = phase.length * charW + pad * 2
  const pillH    = 28 / s
  const gap      = 18 + 4 / s
  const onLeft   = node.x < SVG_W * 0.5
  const edgeX    = onLeft ? node.x - gap : node.x + gap
  const pillX    = onLeft ? edgeX - pillW : edgeX
  const textX    = onLeft ? edgeX - pillW / 2 : edgeX + pillW / 2
  const dist     = Math.abs(index - currentIdx)
  const opacity  = dist === 0 ? 1 : dist === 1 ? 0.45 : 0.22

  return (
    <motion.g animate={{ opacity }} transition={{ duration: 0.3 }}>
      <rect
        x={pillX} y={node.y - pillH / 2}
        width={pillW} height={pillH}
        rx={pillH / 2} fill="var(--bg)"
      />
      <rect
        x={pillX} y={node.y - pillH / 2}
        width={pillW} height={pillH}
        rx={pillH / 2}
        fill={accent} fillOpacity={0.18}
      />
      <text
        x={textX} y={node.y + fontSize * 0.38}
        fontSize={fontSize} fontWeight={700}
        fill={accent} textAnchor="middle"
        fontFamily="'Outfit', sans-serif"
      >
        {phase}
      </text>
    </motion.g>
  )
}

// ── Year label ────────────────────────────────────────────────────────────────
function YearLabel({ groupIdx, currentIdx, z }: { groupIdx: number; currentIdx: number; z: number }) {
  const yg       = YEAR_GROUPS[groupIdx]
  const node     = NODES[yg.startIndex]
  const side     = labelSide(yg.startIndex)
  const s        = Math.max((z + 1) / 2, 1)

  const fontSize = 16 / s
  const strokeW  = 5 / s

  const nodeEdge = 30
  const labelOffset = 80 / s
  const lx = z > 1
    ? (side === 'right' ? node.x + nodeEdge + labelOffset : node.x - nodeEdge - labelOffset)
    : (side === 'right' ? SVG_W - 18 : 18)
  const anchor   = side === 'right' ? 'start' : 'end'
  const textW    = yg.label.length * fontSize * 0.75
  const lineEnd  = side === 'right'
    ? node.x + nodeEdge + labelOffset + textW + 6 / s
    : node.x - nodeEdge - labelOffset - textW - 6 / s
  const lineX2   = side === 'right' ? node.x + nodeEdge : node.x - nodeEdge
  const lineLen  = Math.abs(lineEnd - lineX2)

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
        x={lx} y={node.y - 8 / s}
        fontSize={fontSize} fontWeight={800}
        fill={yg.color} textAnchor={anchor}
        letterSpacing={5 / s}
        fontFamily="'Young Serif', Georgia, serif"
      >
        {yg.label.toUpperCase()}
      </text>
      <motion.line
        x1={lineEnd} y1={node.y} x2={lineX2} y2={node.y}
        stroke={yg.color} strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={lineLen}
        strokeDashoffset={dashOffset as unknown as number}
      />
    </motion.g>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PathSVG({ currentIdx, zoom = 1, progressFraction = 0 }: Props) {
  const z = zoom

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
          key={i} d={t.d}
          stroke="#7BAABF" strokeWidth={11}
          strokeLinecap="round" fill="none"
          opacity={t.opacity}
        />
      ))}

      {/* Per-segment colored progress */}
      {SEGMENT_PATHS.map((_, i) => (
        <Segment key={i} index={i} currentIdx={currentIdx} z={1} partialFill={i === currentIdx ? progressFraction : 0} />
      ))}

      {/* Year labels */}
      {YEAR_GROUPS.map((_, i) => (
        <YearLabel key={i} groupIdx={i} currentIdx={currentIdx} z={z} />
      ))}

      {/* Nodes — keep original size */}
      {NODES.map((_, i) => (
        <TrackNode key={i} index={i} currentIdx={currentIdx} z={1} />
      ))}

      {/* Phase labels — text scaled down for zoom */}
      {NODES.map((_, i) => (
        <PhaseLabel key={i} index={i} currentIdx={currentIdx} z={z} />
      ))}
    </svg>
  )
}
