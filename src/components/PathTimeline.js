/**
 * PathTimeline — an SVG snake path that the camera "zooms in" and follows.
 *
 * The path winds diagonally: top-left → bottom-right → top-left → …
 * (asymmetric — x values vary slightly each segment so it feels hand-drawn).
 *
 * The Animated.View wrapper translates vertically so the active node is
 * always at ~38% from the top of the visible area — creating the "following
 * a moving path" sensation.
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
import { milestones, YEAR_GROUPS, TOTAL } from '../data/timelineData';

const AnimatedPath   = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width: W, height: SCREEN_H } = Dimensions.get('window');

// ─── Node positions ──────────────────────────────────────────────────────────
// x: fraction of screen width (slight asymmetry for organic feel)
// y: absolute pixels — irregular vertical spacing so it feels nonlinear
// Asymmetric — avoids simple left↔right ping-pong.
// Nodes drift: far-left, right, center-right, far-left, center, far-right, …
const NODE_FRACS = [
  { xf: 0.20, y: 80   },  // 0  Freshman  — left
  { xf: 0.76, y: 250  },  // 1             right
  { xf: 0.54, y: 430  },  // 2             center-right (no bounce back)
  { xf: 0.15, y: 610  },  // 3  Sophomore — far left
  { xf: 0.70, y: 790  },  // 4             right
  { xf: 0.38, y: 970  },  // 5             center
  { xf: 0.82, y: 1155 },  // 6  Junior    — far right
  { xf: 0.22, y: 1335 },  // 7             left
  { xf: 0.62, y: 1520 },  // 8             center-right
  { xf: 0.17, y: 1700 },  // 9             far left
  { xf: 0.80, y: 1885 },  // 10 Senior    — right
  { xf: 0.42, y: 2065 },  // 11            center
  { xf: 0.74, y: 2248 },  // 12            right
  { xf: 0.24, y: 2430 },  // 13            left
];

export const NODES = NODE_FRACS.map(n => ({ x: n.xf * W, y: n.y }));

const SVG_H = NODES[NODES.length - 1].y + 240;

// ─── Bezier control points ────────────────────────────────────────────────────
// Produces a flowing S-curve between each pair of nodes.
// The horizontal "pull" (dx * 0.18) makes the curves feel more organic.
function cps(a, b) {
  const dy = b.y - a.y;
  const dx = b.x - a.x;
  return {
    cp1: { x: a.x + dx * 0.18, y: a.y + dy * 0.44 },
    cp2: { x: b.x - dx * 0.18, y: b.y - dy * 0.44 },
  };
}

// ─── SVG path string ──────────────────────────────────────────────────────────
function buildPath() {
  const f = v => v.toFixed(2);
  let d = `M ${f(NODES[0].x)} ${f(NODES[0].y)}`;
  for (let i = 0; i < NODES.length - 1; i++) {
    const { cp1, cp2 } = cps(NODES[i], NODES[i + 1]);
    d += ` C ${f(cp1.x)} ${f(cp1.y)} ${f(cp2.x)} ${f(cp2.y)} ${f(NODES[i + 1].x)} ${f(NODES[i + 1].y)}`;
  }
  return d;
}

// ─── Arc-length computation ────────────────────────────────────────────────────
function evalBezier(t, p0, cp1, cp2, p1) {
  const m = 1 - t;
  return {
    x: m ** 3 * p0.x + 3 * m ** 2 * t * cp1.x + 3 * m * t ** 2 * cp2.x + t ** 3 * p1.x,
    y: m ** 3 * p0.y + 3 * m ** 2 * t * cp1.y + 3 * m * t ** 2 * cp2.y + t ** 3 * p1.y,
  };
}

function arcLen(p0, cp1, cp2, p1, N = 80) {
  let len = 0, prev = p0;
  for (let i = 1; i <= N; i++) {
    const pt = evalBezier(i / N, p0, cp1, cp2, p1);
    len += Math.hypot(pt.x - prev.x, pt.y - prev.y);
    prev = pt;
  }
  return len;
}

// Cumulative path length at each node index
const CUM_LENS = [0];
for (let i = 0; i < NODES.length - 1; i++) {
  const { cp1, cp2 } = cps(NODES[i], NODES[i + 1]);
  CUM_LENS.push(CUM_LENS[i] + arcLen(NODES[i], cp1, cp2, NODES[i + 1]));
}
const TOTAL_LEN = CUM_LENS[CUM_LENS.length - 1];

const IDX_RANGE = NODES.map((_, i) => i);        // [0, 1, 2, … 13]
const NODE_YS   = NODES.map(n => n.y);             // y at each node

// ─── Color ramps per year (saturated enough to pop on warm cream bg) ──────────
const COLOR_STOPS = {
  input:  [0,        2.5,       5.5,       9.5,       13      ],
  output: ['#2D9E72', '#1D7FC4', '#7048C8', '#C47A12', '#B86A0A'],
};

function yearGroupOf(idx) {
  for (let i = YEAR_GROUPS.length - 1; i >= 0; i--) {
    if (idx >= YEAR_GROUPS[i].startIndex) return YEAR_GROUPS[i];
  }
  return YEAR_GROUPS[0];
}

function accentAt(idx) {
  const g = yearGroupOf(idx);
  const i = YEAR_GROUPS.indexOf(g);
  return COLOR_STOPS.output[Math.min(i, COLOR_STOPS.output.length - 1)];
}

// ─── Single node ──────────────────────────────────────────────────────────────
const TrackNode = ({ index, progress }) => {
  const accent       = accentAt(index);
  const node         = NODES[index];
  const isLeft       = node.x < W * 0.5;
  const isFirstYear  = YEAR_GROUPS.some(g => g.startIndex === index);
  const group        = yearGroupOf(index);

  // Glow ring pulsates on the active node
  const glowProps = useAnimatedProps(() => {
    'worklet';
    const dist = Math.abs(index - progress.value);
    return {
      opacity: interpolate(dist, [0, 0.7], [0.22, 0], Extrapolation.CLAMP),
      r:       interpolate(dist, [0, 0.6], [26, 14],  Extrapolation.CLAMP),
    };
  });

  // Node body: bigger when active, filled for visited, outlined for upcoming
  const nodeProps = useAnimatedProps(() => {
    'worklet';
    const rel  = index - progress.value;
    const dist = Math.abs(rel);
    return {
      r:            interpolate(dist, [0, 0.5, 1.5, 3], [12, 9, 7.5, 5.5], Extrapolation.CLAMP),
      fillOpacity:  interpolate(rel,  [0, 0.6],          [1,  0],           Extrapolation.CLAMP),
      strokeOpacity:interpolate(dist, [0, 3],             [1,  0.2],         Extrapolation.CLAMP),
    };
  });

  const lx = isLeft ? node.x + 18 : node.x - 18;
  const anchor = isLeft ? 'start' : 'end';

  return (
    <G>
      {/* Year group label above the first node of each year */}
      {isFirstYear && (
        <SvgText
          x={lx}
          y={node.y - 20}
          fontSize={9}
          fontWeight="700"
          fill={accent}
          fillOpacity={0.85}
          textAnchor={anchor}
          letterSpacing={2}
        >
          {group.label.toUpperCase()}
        </SvgText>
      )}

      {/* Glow ring */}
      <AnimatedCircle
        cx={node.x}
        cy={node.y}
        fill="none"
        stroke={accent}
        strokeWidth={1.5}
        animatedProps={glowProps}
      />

      {/* Node body */}
      <AnimatedCircle
        cx={node.x}
        cy={node.y}
        fill={accent}
        stroke={accent}
        strokeWidth={2}
        animatedProps={nodeProps}
      />
    </G>
  );
};

// ─── PathTimeline component ───────────────────────────────────────────────────
const PathTimeline = ({ progress }) => {
  const PATH_D = buildPath();

  // Camera: keeps the active node at 38% from the top of the visible area
  const cameraStyle = useAnimatedStyle(() => {
    'worklet';
    const activeY  = interpolate(progress.value, IDX_RANGE, NODE_YS, Extrapolation.CLAMP);
    const translateY = SCREEN_H * 0.38 - activeY;
    return { transform: [{ translateY }] };
  });

  // Progress line: two layers (glow + solid) using strokeDashoffset
  const progressProps = useAnimatedProps(() => {
    'worklet';
    const len    = interpolate(progress.value, IDX_RANGE, CUM_LENS, Extrapolation.CLAMP);
    const offset = TOTAL_LEN - len;
    const stroke = interpolateColor(
      progress.value,
      COLOR_STOPS.input,
      COLOR_STOPS.output
    );
    return { strokeDashoffset: offset, stroke };
  });

  const glowProps = useAnimatedProps(() => {
    'worklet';
    const len    = interpolate(progress.value, IDX_RANGE, CUM_LENS, Extrapolation.CLAMP);
    const offset = TOTAL_LEN - len;
    const stroke = interpolateColor(
      progress.value,
      COLOR_STOPS.input,
      COLOR_STOPS.output
    );
    return { strokeDashoffset: offset, stroke };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[{ width: W, height: SVG_H }, cameraStyle]}>
        <Svg width={W} height={SVG_H}>

          {/* ── Background track (dim full path) ── */}
          <Path
            d={PATH_D}
            stroke="rgba(40,22,6,0.10)"
            strokeWidth={12}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* ── Progress glow (thick, translucent) ── */}
          <AnimatedPath
            d={PATH_D}
            strokeWidth={34}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={TOTAL_LEN}
            opacity={0.20}
            animatedProps={glowProps}
          />

          {/* ── Progress solid line ── */}
          <AnimatedPath
            d={PATH_D}
            strokeWidth={12}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={TOTAL_LEN}
            animatedProps={progressProps}
          />

          {/* ── Nodes ── */}
          {NODES.map((_, i) => (
            <TrackNode key={i} index={i} progress={progress} />
          ))}

        </Svg>
      </Animated.View>
    </View>
  );
};

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

export default PathTimeline;
