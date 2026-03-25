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
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { milestones, YEAR_GROUPS } from '../data/timelineData';

const AnimatedPath   = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

// ─── Colors ───────────────────────────────────────────────────────────────────
const COLOR_STOPS = {
  input:  [0,        2.5,       5.5,       9.5,       13       ],
  output: ['#2D9E72', '#1D7FC4', '#7048C8', '#C47A12', '#B86A0A'],
};
function yearGroupOf(idx) {
  for (let i = YEAR_GROUPS.length - 1; i >= 0; i--) {
    if (idx >= YEAR_GROUPS[i].startIndex) return YEAR_GROUPS[i];
  }
  return YEAR_GROUPS[0];
}
function accentAt(idx) {
  return COLOR_STOPS.output[YEAR_GROUPS.indexOf(yearGroupOf(idx))];
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

// ─── Node (circles only — labels rendered in a separate top pass) ─────────────
const TrackNode = ({ index, progress }) => {
  const accent = accentAt(index);
  const node   = NODES[index];

  const glowProps = useAnimatedProps(() => {
    'worklet';
    const dist = Math.abs(index - progress.value);
    return {
      opacity: interpolate(dist, [0, 0.6], [0.20, 0], Extrapolation.CLAMP),
      r:       interpolate(dist, [0, 0.5], [30, 15],  Extrapolation.CLAMP),
    };
  });

  const nodeProps = useAnimatedProps(() => {
    'worklet';
    const rel = index - progress.value;
    return {
      r:             8,
      fillOpacity:   interpolate(rel, [0, 0.7], [1, 0], Extrapolation.CLAMP),
      strokeOpacity: 0,
    };
  });

  return (
    <G>
      <AnimatedCircle cx={node.x} cy={node.y} fill="none" stroke={accent} strokeWidth={3} animatedProps={glowProps} />
      <AnimatedCircle cx={node.x} cy={node.y} fill={accent} stroke="none" animatedProps={nodeProps} />
    </G>
  );
};

// ─── Node label — phase name beside each dot ──────────────────────────────────
const NodeLabel = ({ index }) => {
  const node       = NODES[index];
  const accent     = accentAt(index);
  const phase      = PHASE_SHORT[milestones[index].phase] || milestones[index].phase;
  const nodeOnLeft = node.x < W * 0.5;
  const lx         = nodeOnLeft ? node.x - 20 : node.x + 20;
  const anchor     = nodeOnLeft ? 'end' : 'start';
  return (
    <SvgText
      x={lx}
      y={node.y + 5}
      fontSize={14}
      fontWeight="600"
      fill={accent}
      fillOpacity={0.65}
      textAnchor={anchor}
    >
      {phase}
    </SvgText>
  );
};

// ─── Year label (rendered after all nodes so it's never occluded) ─────────────
// Anchored to the screen edge OPPOSITE the node so it stays clear of the path.
const YearLabel = ({ index }) => {
  const isFirstYear = YEAR_GROUPS.some(g => g.startIndex === index);
  if (!isFirstYear) return null;
  const accent = accentAt(index);
  const node   = NODES[index];
  const group  = yearGroupOf(index);
  const nodeOnLeft = node.x < W * 0.5;
  // Put label on the opposite side from the node
  const lx     = nodeOnLeft ? W - 24 : 24;
  const anchor = nodeOnLeft ? 'end' : 'start';
  return (
    <SvgText
      x={lx}
      y={node.y - 16}
      fontSize={22}
      fontWeight="700"
      fill={accent}
      fillOpacity={0.85}
      textAnchor={anchor}
      letterSpacing={5}
    >
      {group.label.toUpperCase()}
    </SvgText>
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

  const progressProps = useAnimatedProps(() => {
    'worklet';
    const len    = interpolate(progress.value, IDX_RANGE, CUM_LENS, Extrapolation.CLAMP);
    const stroke = interpolateColor(progress.value, COLOR_STOPS.input, COLOR_STOPS.output);
    return { strokeDashoffset: TOTAL_LEN - len, stroke };
  });

  const glowProps = useAnimatedProps(() => {
    'worklet';
    const len    = interpolate(progress.value, IDX_RANGE, CUM_LENS, Extrapolation.CLAMP);
    const stroke = interpolateColor(progress.value, COLOR_STOPS.input, COLOR_STOPS.output);
    return { strokeDashoffset: TOTAL_LEN - len, stroke };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[{ width: W, height: SVG_H }, cameraStyle]}>
        <Svg width={W} height={SVG_H}>

          {/* Dim background track */}
          <Path
            d={PATH_D}
            stroke="rgba(40,22,6,0.12)"
            strokeWidth={15}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Progress glow */}
          <AnimatedPath
            d={PATH_D}
            strokeWidth={30}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={TOTAL_LEN}
            opacity={0.22}
            animatedProps={glowProps}
          />

          {/* Progress solid */}
          <AnimatedPath
            d={PATH_D}
            strokeWidth={15}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={TOTAL_LEN}
            animatedProps={progressProps}
          />

          {NODES.map((_, i) => (
            <TrackNode key={i} index={i} progress={progress} />
          ))}

          {/* Phase labels beside each dot */}
          {NODES.map((_, i) => (
            <NodeLabel key={i} index={i} />
          ))}

          {/* Year labels rendered last — always on top */}
          {NODES.map((_, i) => (
            <YearLabel key={i} index={i} />
          ))}

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
