import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SceneArt } from './SceneArt';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// TimelineScene
// Each scene computes its own transforms from the shared `progress` value.
//
// Depth model:
//   rel < 0  →  scene is in the PAST  (small, dim, shifted down)
//   rel = 0  →  scene is CURRENT      (full size, full opacity, centered)
//   rel > 0  →  scene is in the FUTURE(slightly large, very faint, shifted up)
//
// This creates the "camera fly-through" illusion: as progress advances,
// the current scene recedes (past), and the next zooms down into focus.
// ─────────────────────────────────────────────────────────────────────────────
const TimelineScene = ({ data, index, progress, total }) => {
  // ── Outer container: handles scale, opacity, translateY, zIndex ──────────
  const containerStyle = useAnimatedStyle(() => {
    'worklet';
    const rel = index - progress.value;

    const scale = interpolate(
      rel,
      [-2, -1, 0, 1, 2],
      [0.72, 0.87, 1.0, 1.07, 1.14],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      rel,
      [-1.5, -0.85, -0.1, 0, 0.1, 0.85, 1.5],
      [0.0, 0.14, 0.95, 1.0, 0.95, 0.11, 0.0],
      Extrapolation.CLAMP
    );

    // Simulate Z-axis depth: past scenes shift down, future scenes shift up
    const translateY = interpolate(
      rel,
      [-1.5, 0, 1.5],
      [55, 0, -38],
      Extrapolation.CLAMP
    );

    // Subtle X drift for organic feel
    const translateX = interpolate(
      rel,
      [-1.5, 0, 1.5],
      [8, 0, -6],
      Extrapolation.CLAMP
    );

    // Scene closest to current progress stays on top
    const zIndex = Math.round(
      interpolate(
        Math.abs(rel),
        [0, 0.5, 1, 2],
        [total + 1, total, total - 2, 0],
        Extrapolation.CLAMP
      )
    );

    return {
      opacity,
      zIndex,
      transform: [{ scale }, { translateY }, { translateX }],
    };
  });

  // ── Background layer: parallax — moves at 30% of container's motion ──────
  const bgParallaxStyle = useAnimatedStyle(() => {
    'worklet';
    const rel = index - progress.value;
    const translateY = interpolate(
      rel,
      [-1.5, 0, 1.5],
      [-16, 0, 11], // counter-motion: bg moves opposite, appearing slower
      Extrapolation.CLAMP
    );
    const translateX = interpolate(
      rel,
      [-1.5, 0, 1.5],
      [-6, 0, 4],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateY }, { translateX }] };
  });

  // ── Foreground content: parallax — moves at 60% of container's motion ─────
  const contentParallaxStyle = useAnimatedStyle(() => {
    'worklet';
    const rel = index - progress.value;
    const translateY = interpolate(
      rel,
      [-1.5, 0, 1.5],
      [-10, 0, 7],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateY }] };
  });

  return (
    <Animated.View style={[styles.sceneWrapper, containerStyle]}>
      <LinearGradient
        colors={data.gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      {/* Accent color wash */}
      <View
        style={[
          styles.accentWash,
          { backgroundColor: data.accentDim },
        ]}
      />

      {/* Background art — moves slower (parallax) */}
      <Animated.View style={[styles.artLayer, bgParallaxStyle]}>
        <SceneArt artType={data.artType} color={data.accent} />
      </Animated.View>

      {/* Foreground content — moves slightly faster than bg */}
      <Animated.View style={[styles.contentLayer, contentParallaxStyle]}>
        {/* Tag */}
        <View style={[styles.tagPill, { borderColor: data.accent + '50' }]}>
          <Text style={[styles.tagText, { color: data.accent }]}>
            {data.tag}
          </Text>
        </View>

        {/* Year */}
        <Text style={[styles.year, { color: data.accent }]}>
          {data.year}
        </Text>

        {/* Title */}
        <Text style={styles.title}>{data.title}</Text>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: data.accent }]} />

        {/* Subtitle */}
        <Text style={styles.subtitle}>{data.subtitle}</Text>
      </Animated.View>

      {/* Vignette overlay */}
      <View style={styles.vignette} pointerEvents="none" />
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  sceneWrapper: {
    position: 'absolute',
    width: SCREEN_W,
    height: SCREEN_H,
    overflow: 'hidden',
    backgroundColor: '#07070D',
  },

  accentWash: {
    ...StyleSheet.absoluteFillObject,
  },

  artLayer: {
    position: 'absolute',
    top: SCREEN_H * 0.06,
    right: -20,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    pointerEvents: 'none',
  },

  contentLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingBottom: SCREEN_H * 0.22,
  },

  tagPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 20,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
  },

  year: {
    fontSize: 72,
    fontWeight: '200',
    letterSpacing: -2,
    lineHeight: 72,
    marginBottom: 16,
  },

  title: {
    fontSize: 38,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    lineHeight: 44,
    marginBottom: 20,
  },

  divider: {
    width: 36,
    height: 2,
    borderRadius: 1,
    marginBottom: 18,
    opacity: 0.8,
  },

  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 26,
    maxWidth: 320,
  },

  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // Soft edges via nested radial-ish vignette using opacity
    // (true radial gradient requires expo-linear-gradient composition)
    borderWidth: 0,
  },
});

export default TimelineScene;
