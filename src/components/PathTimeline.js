/**
 * PathTimeline
 *
 * PROPORTIONATE SPACING
 *   Each segment's y-length is proportional to the real calendar duration
 *   between milestones (45 px per month × actual gap).
 *
 * BOUNDED AT 3× ZOOM
 *   With ZOOM = 3.0, the visible x-window is W/3 centred on the screen.
 *   All node xf values stay inside [0.36, 0.64] so nothing clips.
 *   Formula: screen_x = W/2 + (node_x − W/2) × ZOOM
 *   At xf=0.36 → screen_x ≈ 31 px;  at xf=0.64 → screen_x ≈ 359 px.
 *
 * SMOOTH LINE
 *   Catmull-Rom → cubic bezier gives C1 continuity so the line passes
 *   through every dot with no kink.
 *
 * CAMERA
 *   Scale is applied around the View's visual centre (W/2, SVG_H/2), so
 *   translateY must be: (TARGET − SVG_H/2) + ZOOM × (SVG_H/2 − activeY)
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useAnimatedProps,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import Svg, { Path, Circle, G, Text as SvgText, Line } from 'react-native-svg';
import { milestones, YEAR_GROUPS, YEAR_COLORS } from '../data/timelineData';

const AnimatedPath    = Animated.createAnimatedComponent(Path);
const AnimatedCircle  = Animated.createAnimatedComponent(Circle);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);
const AnimatedLine    = Animated.createAnimatedComponent(Line);

const { width: W, height: SCREEN_H } = Dimensions.get('window');

// ─── Zoom ─────────────────────────────────────────────────────────────────────
const ZOOM     = 3.0;
const TARGET_Y = SCREEN_H * 0.38;   // where the active node sits on screen

// ─── Proportionate y-spacing ─────────────────────────────────────────────────
// Duration (months) between consecutive milestone nodes.
// Total = 48 months = 4 academic years. 45 px / month.
//
//  0→1  Freshman Fall → Spring      5 mo
//  1→2  Spring → End of Year        3 mo
//  2→3  Summer → Sophomore Fall     4 mo
//  3→4  Soph Fall → Spring          5 mo
//  4→5  Spring → Summer             3 mo
//  5→6  Summer → Junior Pre-school  2 mo
//  6→7  Pre-school → Junior Fall    3 mo
//  7→8  Fall → Winter               3 mo
//  8→9  Winter → Spring             4 mo
//  9→10 Spring → Senior Summer      5 mo
// 10→11 Summer → Early Fall         3 mo
// 11→12 Early Fall → Winter         3 mo
// 12→13 Winter → Spring/Decision    5 mo
const MONTH_GAPS = [5, 3, 4, 5, 3, 2, 3, 3, 4, 5, 3, 3, 5];
// With ZOOM baked into coordinates, px/month in SVG space = 45/ZOOM.
// Visual spacing on screen stays 45 px/month, but the raw canvas is 3× smaller.
const PX_PER_MONTH = 15;

function buildYPositions() {
  const ys = [60];
  for (const gap of MONTH_GAPS) ys.push(ys[ys.length - 1] + gap * PX_PER_MONTH);
  return ys;
}
const Y_POS = buildYPositions();

// ─── Node positions ───────────────────────────────────────────────────────────
// Gentle left/right oscillation — path travels mostly vertical,
// with a small rhythmic bounce. xf ∈ [0.44, 0.56].
const NODE_FRACS = [
  { xf: 0.46 },  // 0  Freshman Fall     — left
  { xf: 0.54 },  // 1  Freshman Spring   — right
  { xf: 0.46 },  // 2  End of Year       — left
  { xf: 0.55 },  // 3  Sophomore Fall    — right
  { xf: 0.45 },  // 4  Sophomore Spring  — left
  { xf: 0.54 },  // 5  Sophomore Summer  — right
  { xf: 0.46 },  // 6  Junior Pre-school — left
  { xf: 0.55 },  // 7  Junior Fall       — right
  { xf: 0.44 },  // 8  Junior Winter     — left
  { xf: 0.55 },  // 9  Junior Spring     — right
  { xf: 0.46 },  // 10 Senior Summer     — left
  { xf: 0.54 },  // 11 Senior Early Fall — right
  { xf: 0.45 },  // 12 Senior Winter     — left
  { xf: 0.55 },  // 13 Senior Spring     — right
];

// Bake ZOOM into coordinates so the SVG renders at full native resolution.
// Instead of rendering a small SVG and scaling it up (which blurs the bitmap),
// we render the path at its final visual size and only translateY to pan.
export const NODES = NODE_FRACS.map((n, i) => ({
  x: W / 2 + ZOOM * (n.xf * W - W / 2),
  y: ZOOM * Y_POS[i] + 60,
}));
const SVG_H = NODES[NODES.length - 1].y + 600;
const IDX_RANGE = NODES.map((_, i) => i);
const NODE_YS   = NODES.map(n => n.y);

// ─── Catmull-Rom → cubic bezier ───────────────────────────────────────────────
function catmullRomCPs(pts) {
  const n = pts.length;
  return Array.from({ length: n - 1 }, (_, i) => {
    const p0 = i === 0
      ? { x: 2*pts[0].x - pts[1].x, y: 2*pts[0].y - pts[1].y }
      : pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i === n - 2
      ? { x: 2*pts[n-1].x - pts[n-2].x, y: 2*pts[n-1].y - pts[n-2].y }
      : pts[i + 2];
    return {
      cp1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      cp2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
    };
  });
}

const SEGS = catmullRomCPs(NODES);

function buildPath() {
  const f = v => v.toFixed(2);
  let d = `M ${f(NODES[0].x)} ${f(NODES[0].y)}`;
  for (let i = 0; i < NODES.length - 1; i++) {
    const { cp1, cp2 } = SEGS[i];
    const n1 = NODES[i + 1];
    d += ` C ${f(cp1.x)} ${f(cp1.y)} ${f(cp2.x)} ${f(cp2.y)} ${f(n1.x)} ${f(n1.y)}`;
  }
  return d;
}

// Arc lengths (same CPs → dashoffset stays in sync)
function evalBez(t, p0, cp1, cp2, p1) {
  const m = 1 - t;
  return {
    x: m**3*p0.x + 3*m**2*t*cp1.x + 3*m*t**2*cp2.x + t**3*p1.x,
    y: m**3*p0.y + 3*m**2*t*cp1.y + 3*m*t**2*cp2.y + t**3*p1.y,
  };
}
function segLen(p0, cp1, cp2, p1, N = 80) {
  let len = 0, prev = p0;
  for (let i = 1; i <= N; i++) {
    const pt = evalBez(i / N, p0, cp1, cp2, p1);
    len += Math.hypot(pt.x - prev.x, pt.y - prev.y);
    prev = pt;
  }
  return len;
}

const CUM_LENS = [0];
for (let i = 0; i < NODES.length - 1; i++) {
  const { cp1, cp2 } = SEGS[i];
  CUM_LENS.push(CUM_LENS[i] + segLen(NODES[i], cp1, cp2, NODES[i + 1]));
}
const TOTAL_LEN = CUM_LENS[CUM_LENS.length - 1];
const PATH_D    = buildPath();

// ─── Fading tail past the last node ──────────────────────────────────────────
// Phantom nodes continue the same left/right oscillation pattern.
// Spaced ~4 months apart (ZOOM * PX_PER_MONTH * 4 = 180px in SVG space).
const _lastNode       = NODES[NODES.length - 1];
const _phantomSpacing = ZOOM * PX_PER_MONTH * 4;
const _phantomFracs   = [0.45, 0.55, 0.44]; // continue the oscillation
const PHANTOM_NODES   = _phantomFracs.map((xf, i) => ({
  x: W / 2 + ZOOM * (xf * W - W / 2),
  y: _lastNode.y + _phantomSpacing * (i + 1),
}));

// Build Catmull-Rom through [NODES[12], NODES[13], phantom0, phantom1, phantom2]
const _tailCtrlPts = [NODES[NODES.length - 2], _lastNode, ...PHANTOM_NODES];
const _tailCR      = catmullRomCPs(_tailCtrlPts);
function buildTailSub(startIdx, endIdx) {
  const f = v => v.toFixed(2);
  let d = `M ${f(_tailCtrlPts[startIdx].x)} ${f(_tailCtrlPts[startIdx].y)}`;
  for (let i = startIdx; i < endIdx; i++) {
    const { cp1, cp2 } = _tailCR[i];
    const n = _tailCtrlPts[i + 1];
    d += ` C ${f(cp1.x)} ${f(cp1.y)} ${f(cp2.x)} ${f(cp2.y)} ${f(n.x)} ${f(n.y)}`;
  }
  return d;
}
const TAIL_SEGS = [
  { d: buildTailSub(1, 2), opacity: 0.30 }, // NODES[13] → phantom0
  { d: buildTailSub(2, 3), opacity: 0.16 }, // phantom0  → phantom1
  { d: buildTailSub(3, 4), opacity: 0.06 }, // phantom1  → phantom2
];
const TAIL_COLOR = '#7BAABF';

// ─── Per-section sub-paths ────────────────────────────────────────────────────
// Each year section gets its own path so past colors never change.
// Section boundaries sit between the last node of one year and the first of the next.
function buildSubPath(startIdx, endIdx) {
  const f = v => v.toFixed(2);
  let d = `M ${f(NODES[startIdx].x)} ${f(NODES[startIdx].y)}`;
  for (let i = startIdx; i < endIdx; i++) {
    const { cp1, cp2 } = SEGS[i];
    d += ` C ${f(cp1.x)} ${f(cp1.y)} ${f(cp2.x)} ${f(cp2.y)} ${f(NODES[i+1].x)} ${f(NODES[i+1].y)}`;
  }
  return d;
}

const SECTIONS = [
  { startNode: 0,  endNode: 2,  color: YEAR_COLORS[0] },
  { startNode: 2,  endNode: 5,  color: YEAR_COLORS[1] },
  { startNode: 5,  endNode: 9,  color: YEAR_COLORS[2] },
  { startNode: 9,  endNode: 13, color: YEAR_COLORS[3] },
].map(s => ({
  ...s,
  pathD:      buildSubPath(s.startNode, s.endNode),
  startLen:   CUM_LENS[s.startNode],
  sectionLen: CUM_LENS[s.endNode] - CUM_LENS[s.startNode],
}));
function yearGroupOf(idx) {
  for (let i = YEAR_GROUPS.length - 1; i >= 0; i--) {
    if (idx >= YEAR_GROUPS[i].startIndex) return YEAR_GROUPS[i];
  }
  return YEAR_GROUPS[0];
}
function accentAt(idx) {
  return YEAR_COLORS[YEAR_GROUPS.indexOf(yearGroupOf(idx))];
}

const PHASE_SHORT = {
  'Fall Semester':             'Fall',
  'Spring Semester':           'Spring',
  'End of Year':               'Year End',
  'Summer':                    'Summer',
  'Before School Starts':      'Pre-season',
  'Winter':                    'Winter',
  'Spring':                    'Spring',
  'Summer Before Senior Year': 'Summer',
  'Early Fall':                'Early Fall',
};

// ─── Section progress path ────────────────────────────────────────────────────
// Each section is its own fixed-color path, revealed independently.
// Past sections keep their color forever.
const SectionProgress = ({ pathD, color, startLen, sectionLen, progress }) => {
  const glowProps = useAnimatedProps(() => {
    'worklet';
    const total    = interpolate(progress.value, IDX_RANGE, CUM_LENS, Extrapolation.CLAMP);
    const revealed = Math.min(Math.max(total - startLen, 0), sectionLen);
    return { strokeDashoffset: sectionLen - revealed };
  });
  const solidProps = useAnimatedProps(() => {
    'worklet';
    const total    = interpolate(progress.value, IDX_RANGE, CUM_LENS, Extrapolation.CLAMP);
    const revealed = Math.min(Math.max(total - startLen, 0), sectionLen);
    return { strokeDashoffset: sectionLen - revealed };
  });
  return (
    <G>
      <AnimatedPath d={pathD} stroke={color} strokeWidth={22} strokeLinecap="round"
        strokeLinejoin="round" fill="none" strokeDasharray={sectionLen}
        opacity={0.18} animatedProps={glowProps} />
      <AnimatedPath d={pathD} stroke={color} strokeWidth={11} strokeLinecap="round"
        strokeLinejoin="round" fill="none" strokeDasharray={sectionLen}
        animatedProps={solidProps} />
    </G>
  );
};

// ─── Node ─────────────────────────────────────────────────────────────────────
const TrackNode = ({ index, progress }) => {
  const accent = accentAt(index);
  const node   = NODES[index];

  // Outer glow: transparent blob, grows when active
  const glowProps = useAnimatedProps(() => {
    'worklet';
    const dist = Math.abs(index - progress.value);
    return {
      r:           interpolate(dist, [0, 0.6], [28, 18], Extrapolation.CLAMP),
      fillOpacity: interpolate(dist, [0, 0.6], [0.22, 0], Extrapolation.CLAMP),
    };
  });

  // Inner dot: solid always, slightly faint for future nodes
  const dotProps = useAnimatedProps(() => {
    'worklet';
    const rel = index - progress.value;
    return {
      fillOpacity: rel <= 0
        ? 1.0
        : interpolate(rel, [0, 0.6], [1.0, 0.4], Extrapolation.CLAMP),
    };
  });

  return (
    <G>
      <AnimatedCircle cx={node.x} cy={node.y} fill={accent} stroke="none" animatedProps={glowProps} />
      <Circle cx={node.x} cy={node.y} r={18} fill="#F2EBE0" />
      <AnimatedCircle cx={node.x} cy={node.y} r={18} fill={accent} stroke="none" animatedProps={dotProps} />
    </G>
  );
};

// ─── Node label — pill grows from node edge, text always visible ──────────────
const CHAR_W = 8.5;
const PAD    = 14;

// Pill path: rounded outer end, flat inner end (facing the node)
function makePillPath(w, edgeX, nodeY, pillH, nodeOnLeft) {
  'worklet';
  if (w < 2) return 'M 0 0';
  const rx  = Math.min(pillH / 2, w / 2);
  const top = nodeY - pillH / 2;
  const bot = nodeY + pillH / 2;
  if (nodeOnLeft) {
    const left = edgeX - w;
    return `M ${edgeX} ${top} L ${edgeX} ${bot} L ${left + rx} ${bot} A ${rx} ${rx} 0 0 1 ${left + rx} ${top} Z`;
  } else {
    const right = edgeX + w;
    return `M ${edgeX} ${top} L ${right - rx} ${top} A ${rx} ${rx} 0 0 1 ${right - rx} ${bot} L ${edgeX} ${bot} Z`;
  }
}

const NodeLabel = ({ index, progress }) => {
  const node       = NODES[index];
  const accent     = accentAt(index);
  const phase      = PHASE_SHORT[milestones[index].phase] || milestones[index].phase;
  const nodeOnLeft = node.x < W * 0.5;
  const pillW      = phase.length * CHAR_W + PAD * 2;
  const pillH      = 28;
  const edgeX      = nodeOnLeft ? node.x - 20 : node.x + 20;
  const textX      = nodeOnLeft ? edgeX - pillW / 2 : edgeX + pillW / 2;

  const bgProps = useAnimatedProps(() => {
    'worklet';
    const w = interpolate(Math.abs(index - progress.value), [0, 0.5], [pillW, 0], Extrapolation.CLAMP);
    return { d: makePillPath(w, edgeX, node.y, pillH, nodeOnLeft) };
  });

  const fgProps = useAnimatedProps(() => {
    'worklet';
    const w = interpolate(Math.abs(index - progress.value), [0, 0.5], [pillW, 0], Extrapolation.CLAMP);
    return { d: makePillPath(w, edgeX, node.y, pillH, nodeOnLeft) };
  });

  const textProps = useAnimatedProps(() => {
    'worklet';
    const dist = Math.abs(index - progress.value);
    return { fillOpacity: interpolate(dist, [0, 1.0], [1.0, 0.28], Extrapolation.CLAMP) };
  });

  return (
    <G>
      <AnimatedPath fill="#F2EBE0" animatedProps={bgProps} />
      <AnimatedPath fill={accent} fillOpacity={0.20} animatedProps={fgProps} />
      <AnimatedSvgText
        x={textX}
        y={node.y + 5}
        fontSize={13}
        fontWeight="700"
        fill={accent}
        textAnchor="middle"
        animatedProps={textProps}
      >
        {phase}
      </AnimatedSvgText>
    </G>
  );
};

// ─── Year label + animated underline drawing from label to node ───────────────
const YearLabel = ({ index, progress }) => {
  const isFirstYear = YEAR_GROUPS.some(g => g.startIndex === index);
  if (!isFirstYear) return null;
  const accent     = accentAt(index);
  const node       = NODES[index];
  const group      = yearGroupOf(index);
  const nodeOnLeft = node.x < W * 0.5;
  const lx         = nodeOnLeft ? W - 24 : 24;
  const anchor     = nodeOnLeft ? 'end' : 'start';
  // Underline at node's y — visually connects label to the node point
  const lineY  = node.y;
  const lineX1 = lx;
  const lineX2 = nodeOnLeft ? node.x + 32 : node.x - 32;
  const lineLen = Math.abs(lineX2 - lineX1);

  const lineProps = useAnimatedProps(() => {
    'worklet';
    const dist = Math.abs(index - progress.value);
    return {
      strokeDashoffset: interpolate(dist, [0, 1.5], [0, lineLen], Extrapolation.CLAMP),
    };
  });

  return (
    <G>
      <SvgText
        x={lx}
        y={node.y - 6}
        fontSize={22}
        fontWeight="700"
        fill={accent}
        fillOpacity={0.85}
        textAnchor={anchor}
        letterSpacing={5}
      >
        {group.label.toUpperCase()}
      </SvgText>
      <AnimatedLine
        x1={lineX1}
        y1={lineY}
        x2={lineX2}
        y2={lineY}
        stroke={accent}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={lineLen}
        animatedProps={lineProps}
      />
    </G>
  );
};

// ─── Beyond label — mirrors YearLabel style, anchored to first phantom node ───
const LAST_IDX = NODES.length - 1;

const BeyondLabel = ({ progress }) => {
  const node       = PHANTOM_NODES[0];
  const nodeOnLeft = node.x < W * 0.5;
  const lx         = nodeOnLeft ? W - 24 : 24;
  const anchor     = nodeOnLeft ? 'end' : 'start';
  const lineX1     = lx;
  const lineX2     = nodeOnLeft ? node.x + 32 : node.x - 32;
  const lineLen    = Math.abs(lineX2 - lineX1);

  const textProps = useAnimatedProps(() => {
    'worklet';
    const dist = Math.abs(LAST_IDX - progress.value);
    return { fillOpacity: interpolate(dist, [0, 1.5], [0.85, 0], Extrapolation.CLAMP) };
  });

  const lineProps = useAnimatedProps(() => {
    'worklet';
    const dist = Math.abs(LAST_IDX - progress.value);
    return { strokeDashoffset: interpolate(dist, [0, 1.5], [0, lineLen], Extrapolation.CLAMP) };
  });

  return (
    <G>
      <AnimatedSvgText
        x={lx}
        y={node.y - 6}
        fontSize={22}
        fontWeight="700"
        fill={TAIL_COLOR}
        textAnchor={anchor}
        letterSpacing={5}
        animatedProps={textProps}
      >
        BEYOND
      </AnimatedSvgText>
      <AnimatedLine
        x1={lineX1}
        y1={node.y}
        x2={lineX2}
        y2={node.y}
        stroke={TAIL_COLOR}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={lineLen}
        animatedProps={lineProps}
      />
    </G>
  );
};

// ─── PathTimeline ─────────────────────────────────────────────────────────────
export default function PathTimeline({ progress }) {

  // Scale is around the View's visual centre (W/2, SVG_H/2).
  // Derivation: screen_y = SVG_H/2 + t + (nodeY − SVG_H/2)×ZOOM = TARGET_Y
  // ⟹ t = (TARGET_Y − SVG_H/2) + ZOOM×(SVG_H/2 − nodeY)
  const cameraStyle = useAnimatedStyle(() => {
    'worklet';
    const activeY = interpolate(progress.value, IDX_RANGE, NODE_YS, Extrapolation.CLAMP);
    return { transform: [{ translateY: TARGET_Y - activeY }] };
  });


  return (
    <View style={styles.container}>
      <Animated.View style={[{ width: W, height: SVG_H }, cameraStyle]}>
        <Svg width={W} height={SVG_H}>

          {/* Dim background track */}
          <Path
            d={PATH_D}
            stroke="rgba(40,22,6,0.12)"
            strokeWidth={11}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Fading dashed tail — suggests path continues beyond last node */}
          {TAIL_SEGS.map((seg, i) => (
            <Path
              key={i}
              d={seg.d}
              stroke={TAIL_COLOR}
              strokeWidth={11}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={seg.opacity}
            />
          ))}

          {/* Per-section progress — each year keeps its own color permanently */}
          {SECTIONS.map((s, i) => (
            <SectionProgress key={i} {...s} progress={progress} />
          ))}

          {NODES.map((_, i) => (
            <TrackNode key={i} index={i} progress={progress} />
          ))}

          {/* Labels render after nodes so cream pill backing paints over glow overlap */}
          {NODES.map((_, i) => (
            <NodeLabel key={i} index={i} progress={progress} />
          ))}

          {/* Year labels rendered last — always on top */}
          {NODES.map((_, i) => (
            <YearLabel key={i} index={i} progress={progress} />
          ))}

          <BeyondLabel progress={progress} />

        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: W,
    height: SCREEN_H,
    overflow: 'hidden',
  },
});
