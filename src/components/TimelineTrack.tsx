import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  interpolateColor,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { milestones, YEAR_GROUPS, TOTAL } from '../data/timelineData';

const { width: SCREEN_W } = Dimensions.get('window');

export const NODE_SPACING = 68;
const NODE_R        = 7;
const NODE_R_ACTIVE = 10;
const GLOW_R        = 22;
const TRACK_HEIGHT  = 100;

const nodeX = (i: number) => i * NODE_SPACING;

const yearGroupFor = (index: number) => {
  for (let i = YEAR_GROUPS.length - 1; i >= 0; i--) {
    if (index >= YEAR_GROUPS[i].startIndex) return YEAR_GROUPS[i];
  }
  return YEAR_GROUPS[0];
};

interface TrackNodeProps {
  index: number;
  progress: SharedValue<number>;
}

const TrackNode = ({ index, progress }: TrackNodeProps) => {
  const m = milestones[index];
  const isFirstOfYear = YEAR_GROUPS.some(g => g.startIndex === index);
  const group = yearGroupFor(index);

  const glowStyle = useAnimatedStyle(() => {
    'worklet';
    const dist = Math.abs(index - progress.value);
    return {
      opacity: interpolate(dist, [0, 0.6], [0.35, 0], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(dist, [0, 0.5], [1, 0.6], Extrapolation.CLAMP) }],
    };
  });

  const nodeStyle = useAnimatedStyle(() => {
    'worklet';
    const rel  = index - progress.value;
    const dist = Math.abs(rel);
    const size = interpolate(dist, [0, 0.5, 1, 2], [NODE_R_ACTIVE * 2, NODE_R * 2, NODE_R * 2, (NODE_R - 2) * 2], Extrapolation.CLAMP);
    const opacity = interpolate(dist, [0, 1.5, 2.5], [1, 0.6, 0.25], Extrapolation.CLAMP);
    const backgroundColor = interpolateColor(rel, [-0.5, 0, 0.5], [m.accent, m.accent, 'transparent']);
    const borderColor = interpolateColor(dist, [0, 1.5], [m.accent, m.accent + '55']);
    return { width: size, height: size, borderRadius: size / 2, backgroundColor, borderColor, opacity };
  });

  const labelStyle = useAnimatedStyle(() => {
    'worklet';
    return { opacity: interpolate(Math.abs(index - progress.value), [0, 0.8], [1, 0], Extrapolation.CLAMP) };
  });

  return (
    <View style={[styles.nodeWrapper, { left: nodeX(index) }]}>
      {isFirstOfYear && (
        <Animated.View style={[styles.yearLabelWrapper, labelStyle]}>
          <Text style={[styles.yearLabel, { color: group.color }]}>{group.label}</Text>
        </Animated.View>
      )}
      <Animated.View style={[styles.nodeGlow, { width: GLOW_R * 2, height: GLOW_R * 2, borderRadius: GLOW_R, borderColor: m.accent }, glowStyle]} />
      <Animated.View style={[styles.nodeBase, nodeStyle]} />
    </View>
  );
};

interface TrackLineProps {
  progress: SharedValue<number>;
}

const TrackLine = ({ progress }: TrackLineProps) => {
  const totalWidth = (TOTAL - 1) * NODE_SPACING;
  const progressLineStyle = useAnimatedStyle(() => {
    'worklet';
    const width = Math.max(0, progress.value * NODE_SPACING);
    const color = interpolateColor(progress.value, [0, 3, 6, 10, TOTAL - 1], ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#F59E0B']);
    return { width, backgroundColor: color };
  });
  return (
    <View style={[styles.lineBase, { width: totalWidth }]}>
      <Animated.View style={[styles.lineProgress, progressLineStyle]} />
    </View>
  );
};

interface TimelineTrackProps {
  progress: SharedValue<number>;
}

const TimelineTrack = ({ progress }: TimelineTrackProps) => {
  const trackStyle = useAnimatedStyle(() => {
    'worklet';
    return { transform: [{ translateX: SCREEN_W / 2 - progress.value * NODE_SPACING }] };
  });

  return (
    <View style={styles.container}>
      <View style={styles.centerMarker} pointerEvents="none" />
      <Animated.View style={[styles.track, { width: (TOTAL - 1) * NODE_SPACING + SCREEN_W }, trackStyle]}>
        <TrackLine progress={progress} />
        {milestones.map((_, i) => (
          <TrackNode key={i} index={i} progress={progress} />
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: TRACK_HEIGHT, width: SCREEN_W, overflow: 'hidden', justifyContent: 'center' },
  track: { height: TRACK_HEIGHT, justifyContent: 'center' },
  lineBase: { position: 'absolute', height: 1.5, top: TRACK_HEIGHT / 2, left: 0, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1 },
  lineProgress: { height: '100%', borderRadius: 1 },
  nodeWrapper: { position: 'absolute', alignItems: 'center', justifyContent: 'center', top: 0, bottom: 0, width: NODE_R_ACTIVE * 2, marginLeft: -NODE_R_ACTIVE },
  nodeGlow: { position: 'absolute', borderWidth: 1.5 },
  nodeBase: { borderWidth: 1.5 },
  yearLabelWrapper: { position: 'absolute', top: 8, alignItems: 'center', minWidth: 80 },
  yearLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  centerMarker: { position: 'absolute', bottom: 0, left: SCREEN_W / 2 - 0.5, width: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.15)', zIndex: 10 },
});

export default TimelineTrack;
