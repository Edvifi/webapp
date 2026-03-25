import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

// ─────────────────────────────────────────────────────────────────────────────
// Single animated dot
// ─────────────────────────────────────────────────────────────────────────────
const Dot = ({ index, progress, accentColor }) => {
  const animStyle = useAnimatedStyle(() => {
    'worklet';
    const rel = Math.abs(index - progress.value);

    // Active dot expands into a pill
    const width = interpolate(
      rel,
      [0, 0.5, 1],
      [24, 14, 8],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      rel,
      [0, 0.5, 1, 2],
      [1.0, 0.7, 0.35, 0.2],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      rel,
      [0, 1],
      [1.0, 0.85],
      Extrapolation.CLAMP
    );

    return { width, opacity, transform: [{ scale }] };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: accentColor || '#FFFFFF' },
        animStyle,
      ]}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Progress Indicator
// ─────────────────────────────────────────────────────────────────────────────
const ProgressIndicator = ({ progress, total, scenes }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <Dot
          key={i}
          index={i}
          progress={progress}
          accentColor={scenes[i]?.accent}
        />
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
