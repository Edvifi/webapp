import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SceneArt, ArtType } from './SceneArt';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export interface SceneData {
  artType: ArtType;
  tag: string;
  year: string;
  title: string;
  subtitle: string;
  accent: string;
  accentDim: string;
  gradientColors: [string, string];
}

interface TimelineSceneProps {
  data: SceneData;
  index: number;
  progress: SharedValue<number>;
  total: number;
}

const TimelineScene = ({ data, index, progress, total }: TimelineSceneProps) => {
  const containerStyle = useAnimatedStyle(() => {
    'worklet';
    const rel = index - progress.value;
    const scale = interpolate(rel, [-2, -1, 0, 1, 2], [0.72, 0.87, 1.0, 1.07, 1.14], Extrapolation.CLAMP);
    const opacity = interpolate(rel, [-1.5, -0.85, -0.1, 0, 0.1, 0.85, 1.5], [0.0, 0.14, 0.95, 1.0, 0.95, 0.11, 0.0], Extrapolation.CLAMP);
    const translateY = interpolate(rel, [-1.5, 0, 1.5], [55, 0, -38], Extrapolation.CLAMP);
    const translateX = interpolate(rel, [-1.5, 0, 1.5], [8, 0, -6], Extrapolation.CLAMP);
    const zIndex = Math.round(interpolate(Math.abs(rel), [0, 0.5, 1, 2], [total + 1, total, total - 2, 0], Extrapolation.CLAMP));
    return { opacity, zIndex, transform: [{ scale }, { translateY }, { translateX }] };
  });

  const bgParallaxStyle = useAnimatedStyle(() => {
    'worklet';
    const rel = index - progress.value;
    return { transform: [{ translateY: interpolate(rel, [-1.5, 0, 1.5], [-16, 0, 11], Extrapolation.CLAMP) }, { translateX: interpolate(rel, [-1.5, 0, 1.5], [-6, 0, 4], Extrapolation.CLAMP) }] };
  });

  const contentParallaxStyle = useAnimatedStyle(() => {
    'worklet';
    const rel = index - progress.value;
    return { transform: [{ translateY: interpolate(rel, [-1.5, 0, 1.5], [-10, 0, 7], Extrapolation.CLAMP) }] };
  });

  return (
    <Animated.View style={[styles.sceneWrapper, containerStyle]}>
      <LinearGradient colors={data.gradientColors} style={StyleSheet.absoluteFill} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} />
      <View style={[styles.accentWash, { backgroundColor: data.accentDim }]} />
      <Animated.View style={[styles.artLayer, bgParallaxStyle]}>
        <SceneArt artType={data.artType} color={data.accent} />
      </Animated.View>
      <Animated.View style={[styles.contentLayer, contentParallaxStyle]}>
        <View style={[styles.tagPill, { borderColor: data.accent + '50' }]}>
          <Text style={[styles.tagText, { color: data.accent }]}>{data.tag}</Text>
        </View>
        <Text style={[styles.year, { color: data.accent }]}>{data.year}</Text>
        <Text style={styles.title}>{data.title}</Text>
        <View style={[styles.divider, { backgroundColor: data.accent }]} />
        <Text style={styles.subtitle}>{data.subtitle}</Text>
      </Animated.View>
      <View style={styles.vignette} pointerEvents="none" />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sceneWrapper: { position: 'absolute', width: SCREEN_W, height: SCREEN_H, overflow: 'hidden', backgroundColor: '#07070D' },
  accentWash: { ...StyleSheet.absoluteFillObject },
  artLayer: { position: 'absolute', top: SCREEN_H * 0.06, right: -20, alignItems: 'flex-end', justifyContent: 'flex-start' },
  contentLayer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 32, paddingBottom: SCREEN_H * 0.22 },
  tagPill: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 20 },
  tagText: { fontSize: 10, fontWeight: '700', letterSpacing: 2.5 },
  year: { fontSize: 72, fontWeight: '200', letterSpacing: -2, lineHeight: 72, marginBottom: 16 },
  title: { fontSize: 38, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.8, lineHeight: 44, marginBottom: 20 },
  divider: { width: 36, height: 2, borderRadius: 1, marginBottom: 18, opacity: 0.8 },
  subtitle: { fontSize: 16, fontWeight: '400', color: 'rgba(255,255,255,0.55)', lineHeight: 26, maxWidth: 320 },
  vignette: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
});

export default TimelineScene;
