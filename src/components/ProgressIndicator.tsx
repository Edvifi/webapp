import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { Milestone } from '../data/timelineData';

interface DotProps {
  index: number;
  progress: SharedValue<number>;
  accentColor?: string;
}

const Dot = ({ index, progress, accentColor }: DotProps) => {
  const animStyle = useAnimatedStyle(() => {
    'worklet';
    const rel = Math.abs(index - progress.value);
    const width = interpolate(rel, [0, 0.5, 1], [24, 14, 8], Extrapolation.CLAMP);
    const opacity = interpolate(rel, [0, 0.5, 1, 2], [1.0, 0.7, 0.35, 0.2], Extrapolation.CLAMP);
    const scale = interpolate(rel, [0, 1], [1.0, 0.85], Extrapolation.CLAMP);
    return { width, opacity, transform: [{ scale }] };
  });

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: accentColor ?? '#FFFFFF' }, animStyle]}
    />
  );
};

interface ProgressIndicatorProps {
  progress: SharedValue<number>;
  total: number;
  scenes: Partial<Milestone>[];
}

const ProgressIndicator = ({ progress, total, scenes }: ProgressIndicatorProps) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <Dot key={i} index={i} progress={progress} accentColor={scenes[i]?.accent} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
});

export default ProgressIndicator;
