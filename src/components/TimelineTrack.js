import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';
import { milestones, YEAR_GROUPS, TOTAL } from '../data/timelineData';

const { width: SCREEN_W } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// Layout constants
// ─────────────────────────────────────────────────────────────────────────────
export const NODE_SPACING = 68;   // px between each milestone node center
const NODE_R = 7;                  // default node radius
const NODE_R_ACTIVE = 10;          // active node radius
const GLOW_R = 22;                 // glow ring radius
const TRACK_HEIGHT = 100;

// X position of node i in track-local coordinates.
// We'll translate the whole track so the active node is always at SCREEN_W/2.
const nodeX = (i) => i * NODE_SPACING;

// Returns the YEAR_GROUP object for a given milestone index
const yearGroupFor = (index) => {
  for (let i = YEAR_GROUPS.length - 1; i >= 0; i--) {
    if (index >= YEAR_GROUPS[i].startIndex) return YEAR_GROUPS[i];
  }
  return YEAR_GROUPS[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// Single animated node
// ─────────────────────────────────────────────────────────────────────────────
const TrackNode = ({ index, progress }) => {
  const m = milestones[index];
  const isFirstOfYear = YEAR_GROUPS.some((g) => g.startIndex === index);
  const group = yearGroupFor(index);

  // Outer glow (only visible when active)
  const glowStyle = useAnimatedStyle(() => {
    'worklet';
    const dist = Math.abs(index - progress.value);
    const opacity = interpolate(dist, [0, 0.6], [0.35, 0], Extrapolation.CLAMP);
    const scale = interpolate(dist, [0, 0.5], [1, 0.6], Extrapolation.CLAMP);
    return { opacity, transform: [{ scale }] };
  });

  // Node body: scale + color interpolation
  const nodeStyle = useAnimatedStyle(() => {
    'worklet';
    const rel = index - progress.value;
    const dist = Math.abs(rel);

    const size = interpolate(dist, [0, 0.5, 1, 2], [NODE_R_ACTIVE * 2, NODE_R * 2, NODE_R * 2, (NODE_R - 2) * 2], Extrapolation.CLAMP);
    const opacity = interpolate(dist, [0, 1.5, 2.5], [1, 0.6, 0.25], Extrapolation.CLAMP);

    // Past nodes filled, future nodes outlined — blend through current
    const backgroundColor = interpolateColor(rel, [-0.5, 0, 0.5], [m.accent, m.accent, 'transparent']);
    const borderColor = interpolateColor(dist, [0, 1.5], [m.accent, m.accent + '55']);

    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor,
      borderColor,
      opacity,
    };
  });

  // Label (year name) fades in when node is active, out otherwise
  const labelStyle = useAnimatedStyle(() => {
    'worklet';
    const dist = Math.abs(index - progress.value);
    return {
      opacity: interpolate(dist, [0, 0.8], [1, 0], Extrapolation.CLAMP),
    };
  });

  return (
    <View style={[styles.nodeWrapper, { left: nodeX(index) }]}>
      {/* Year group label — only shown above first node of each year */}
      {isFirstOfYear && (
        <Animated.View style={[styles.yearLabelWrapper, labelStyle]}>
          <Text style={[styles.yearLabel, { color: group.color }]}>{group.label}</Text>
        </Animated.View>
      )}

      {/* Glow ring */}
      <Animated.View
        style={[
          styles.nodeGlow,
          { width: GLOW_R * 2, height: GLOW_R * 2, borderRadius: GLOW_R, borderColor: m.accent },
          glowStyle,
        ]}
      />

      {/* Node body */}
      <Animated.View
        style={[
          styles.nodeBase,
          nodeStyle,
        ]}
      />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// The connecting line (two layers: dim base + colored progress)
// ─────────────────────────────────────────────────────────────────────────────
const TrackLine = ({ progress }) => {
  const totalWidth = (TOTAL - 1) * NODE_SPACING;

  // Progress line width: from node 0 to current progress position
  const progressLineStyle = useAnimatedStyle(() => {
    'worklet';
    const width = Math.max(0, progress.value * NODE_SPACING);
    // Color shifts through year group colors based on progress
    const color = interpolateColor(
      progress.value,
      [0, 3, 6, 10, TOTAL - 1],
      ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#F59E0B']
    );
    return { width, backgroundColor: color };
  });

  return (
    <View style={[styles.lineBase, { width: totalWidth }]}>
      <Animated.View style={[styles.lineProgress, progressLineStyle]} />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TimelineTrack — the full scrolling track
// ─────────────────────────────────────────────────────────────────────────────
const TimelineTrack = ({ progress }) => {
  // Translate the track so the active node stays centered in the screen
  const trackStyle = useAnimatedStyle(() => {
    'worklet';
    const translateX = SCREEN_W / 2 - progress.value * NODE_SPACING;
    return { transform: [{ translateX }] };
  });

  const totalTrackWidth = (TOTAL - 1) * NODE_SPACING + SCREEN_W;

  return (
    <View style={styles.container}>
      {/* Static center-marker line (the "now" indicator) */}
      <View style={styles.centerMarker} pointerEvents="none" />

      <Animated.View
        style={[
          styles.track,
          { width: totalTrackWidth },
          trackStyle,
        ]}
      >
        {/* Connecting line */}
        <TrackLine progress={progress} />

        {/* Nodes */}
        {milestones.map((_, i) => (
          <TrackNode key={i} index={i} progress={progress} />
        ))}
      </Animated.View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    height: TRACK_HEIGHT,
    width: SCREEN_W,
    overflow: 'hidden',
    justifyContent: 'center',
  },

  track: {
    height: TRACK_HEIGHT,
    justifyContent: 'center',
    // nodes are absolutely positioned inside here
  },

  // Connecting line sits at vertical center
  lineBase: {
    position: 'absolute',
    height: 1.5,
    top: TRACK_HEIGHT / 2,
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1,
  },
  lineProgress: {
    height: '100%',
    borderRadius: 1,
  },

  // Node wrapper — absolutely positioned at its x
  nodeWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    bottom: 0,
    width: NODE_R_ACTIVE * 2,
    marginLeft: -NODE_R_ACTIVE, // center on nodeX
  },

  nodeGlow: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  nodeBase: {
    borderWidth: 1.5,
  },

  // Year label floats above node
  yearLabelWrapper: {
    position: 'absolute',
    top: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  yearLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Subtle vertical tick at screen center (visual anchor)
  centerMarker: {
    position: 'absolute',
    bottom: 0,
    left: SCREEN_W / 2 - 0.5,
    width: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    zIndex: 10,
  },
});

export default TimelineTrack;
