// Ports the exact geometry from PathTimeline.tsx
// All node positions, Catmull-Rom → cubic bezier, section sub-paths

export const SVG_W = 400
export const ZOOM  = 3.0

const MONTH_GAPS   = [5, 3, 4, 5, 3, 2, 3, 3, 4, 5, 3, 3, 5]
const PX_PER_MONTH = 15

const NODE_FRACS = [
  0.46, 0.54, 0.46,       // Freshman
  0.55, 0.45, 0.54,       // Sophomore
  0.46, 0.55, 0.44, 0.55, // Junior
  0.46, 0.54, 0.45, 0.55, // Senior
]

// ── Y positions ──────────────────────────────────────────────────────────────
function buildYPositions(): number[] {
  const ys = [60]
  for (const gap of MONTH_GAPS) ys.push(ys[ys.length - 1] + gap * PX_PER_MONTH)
  return ys
}
const Y_POS = buildYPositions()

// ── Node screen coords ───────────────────────────────────────────────────────
export interface Point { x: number; y: number }

export const NODES: Point[] = NODE_FRACS.map((xf, i) => ({
  x: SVG_W / 2 + ZOOM * (xf * SVG_W - SVG_W / 2),
  y: ZOOM * Y_POS[i] + 60,
}))

export const SVG_H = NODES[NODES.length - 1].y + 600

// ── Catmull-Rom → cubic bezier control points ────────────────────────────────
interface Segment { cp1: Point; cp2: Point }

function catmullRomCPs(pts: Point[]): Segment[] {
  const n = pts.length
  return Array.from({ length: n - 1 }, (_, i) => {
    const p0 = i === 0
      ? { x: 2 * pts[0].x - pts[1].x, y: 2 * pts[0].y - pts[1].y }
      : pts[i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = i === n - 2
      ? { x: 2 * pts[n-1].x - pts[n-2].x, y: 2 * pts[n-1].y - pts[n-2].y }
      : pts[i + 2]
    return {
      cp1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      cp2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
    }
  })
}

export const SEGS = catmullRomCPs(NODES)

// ── Path string builders ─────────────────────────────────────────────────────
const f = (v: number) => v.toFixed(2)

export function buildPath(pts: Point[], segs: Segment[]): string {
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const { cp1, cp2 } = segs[i]
    const n = pts[i + 1]
    d += ` C ${f(cp1.x)} ${f(cp1.y)} ${f(cp2.x)} ${f(cp2.y)} ${f(n.x)} ${f(n.y)}`
  }
  return d
}

export const FULL_PATH_D = buildPath(NODES, SEGS)

// Section sub-paths for per-year coloring
function buildSubPath(startIdx: number, endIdx: number): string {
  return buildPath(NODES.slice(startIdx, endIdx + 1), SEGS.slice(startIdx, endIdx))
}

export const SECTIONS = [
  { startNode: 0,  endNode: 2,  color: '#2D9E72', d: buildSubPath(0, 2) },
  { startNode: 2,  endNode: 5,  color: '#1D7FC4', d: buildSubPath(2, 5) },
  { startNode: 5,  endNode: 9,  color: '#7048C8', d: buildSubPath(5, 9) },
  { startNode: 9,  endNode: 13, color: '#C47A12', d: buildSubPath(9, 13) },
]

// Approximate cumulative arc-lengths for stroke-dashoffset progress
function segLen(p0: Point, cp1: Point, cp2: Point, p1: Point, N = 60): number {
  let len = 0, prev = p0
  for (let i = 1; i <= N; i++) {
    const t = i / N, m = 1 - t
    const pt = {
      x: m**3*p0.x + 3*m**2*t*cp1.x + 3*m*t**2*cp2.x + t**3*p1.x,
      y: m**3*p0.y + 3*m**2*t*cp1.y + 3*m*t**2*cp2.y + t**3*p1.y,
    }
    len += Math.hypot(pt.x - prev.x, pt.y - prev.y)
    prev = pt
  }
  return len
}

export const SECTION_LENGTHS = SECTIONS.map(s => {
  let total = 0
  for (let i = s.startNode; i < s.endNode; i++) {
    total += segLen(NODES[i], SEGS[i].cp1, SEGS[i].cp2, NODES[i + 1])
  }
  return total
})

// Phantom tail (fading continuation past last node)
const _last = NODES[NODES.length - 1]
const _phantomFracs = [0.45, 0.55, 0.44]
const _phantomSpacing = ZOOM * PX_PER_MONTH * 4
export const PHANTOM_NODES: Point[] = _phantomFracs.map((xf, i) => ({
  x: SVG_W / 2 + ZOOM * (xf * SVG_W - SVG_W / 2),
  y: _last.y + _phantomSpacing * (i + 1),
}))

const _tailCtrlPts = [NODES[NODES.length - 2], _last, ...PHANTOM_NODES]
const _tailCR = catmullRomCPs(_tailCtrlPts)

function buildTailSub(startIdx: number, endIdx: number): string {
  return buildPath(_tailCtrlPts.slice(startIdx, endIdx + 1), _tailCR.slice(startIdx, endIdx))
}

export const TAIL_SEGS = [
  { d: buildTailSub(1, 2), opacity: 0.28 },
  { d: buildTailSub(2, 3), opacity: 0.14 },
  { d: buildTailSub(3, 4), opacity: 0.05 },
]

// Phase label short names (matching the RN app)
export const PHASE_SHORT: Record<string, string> = {
  'Fall Semester':             'Fall',
  'Spring Semester':           'Spring',
  'End of Year':               'Year End',
  'Summer':                    'Summer',
  'Before School Starts':      'Pre-season',
  'Winter':                    'Winter',
  'Spring':                    'Spring',
  'Summer Before Senior Year': 'Summer',
  'Early Fall':                'Early Fall',
}

// Which side a node's label lives on
export function labelSide(nodeIdx: number): 'left' | 'right' {
  return NODES[nodeIdx].x < SVG_W * 0.5 ? 'right' : 'left'
}

// Target Y fraction for camera (active node kept at 38% from top)
export const TARGET_Y_FRAC = 0.38
