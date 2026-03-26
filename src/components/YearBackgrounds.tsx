/**
 * YearBackgrounds
 *
 * Per-section animated particle backgrounds, cross-fading between years.
 *   Freshman  → sticky notes floating
 *   Sophomore → paper planes flying across
 *   Junior    → pages falling / fluttering
 *   Senior    → graduation caps tossed upward
 */

import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import Svg, { Path, Rect, Line, Circle } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// Seeded random so positions are deterministic
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Section cross-fade wrapper ───────────────────────────────────────────────
interface SectionFadeProps {
  progress: SharedValue<number>;
  start: number;
  end: number;
  children: React.ReactNode;
}

const SectionFade = ({ progress, start, end, children }: SectionFadeProps) => {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [start - 1, start, end, end + 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP
    ),
  }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {children}
    </Animated.View>
  );
};

// ─── FRESHMAN: Sticky notes ───────────────────────────────────────────────────
const COLOR_F = '#2D9E72';
const _sf = seededRand(42);

interface StickyConfig {
  x: number; y: number; rot0: number;
  driftX: number; driftY: number; driftR: number;
  dur: number; delay: number; opacity: number;
}

const STICKIES: StickyConfig[] = Array.from({ length: 7 }, () => ({
  x:       _sf() * W * 0.85 + W * 0.05,
  y:       _sf() * H * 0.65 + H * 0.10,
  rot0:    (_sf() - 0.5) * 30,
  driftX:  (_sf() - 0.5) * 44,
  driftY:  (_sf() - 0.5) * 32,
  driftR:  (_sf() - 0.5) * 18,
  dur:     4200 + _sf() * 3000,
  delay:   _sf() * 2200,
  opacity: 0.30 + _sf() * 0.20,
}));

const StickyNote = ({ x, y, rot0, driftX, driftY, driftR, dur, delay, opacity }: StickyConfig) => {
  const tx  = useSharedValue(0);
  const ty  = useSharedValue(0);
  const rot = useSharedValue(rot0);

  useEffect(() => {
    tx.value  = withDelay(delay, withRepeat(withSequence(
      withTiming( driftX, { duration: dur,        easing: Easing.inOut(Easing.sin) }),
      withTiming(-driftX, { duration: dur,        easing: Easing.inOut(Easing.sin) }),
      withTiming(0,       { duration: dur,        easing: Easing.inOut(Easing.sin) })
    ), -1, false));
    ty.value  = withDelay(delay, withRepeat(withSequence(
      withTiming( driftY, { duration: dur * 1.15, easing: Easing.inOut(Easing.sin) }),
      withTiming(-driftY, { duration: dur * 1.15, easing: Easing.inOut(Easing.sin) }),
      withTiming(0,       { duration: dur * 1.15, easing: Easing.inOut(Easing.sin) })
    ), -1, false));
    rot.value = withDelay(delay, withRepeat(withSequence(
      withTiming(rot0 + driftR, { duration: dur * 0.9, easing: Easing.inOut(Easing.sin) }),
      withTiming(rot0 - driftR, { duration: dur * 0.9, easing: Easing.inOut(Easing.sin) }),
      withTiming(rot0,          { duration: dur * 0.9, easing: Easing.inOut(Easing.sin) })
    ), -1, false));
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x - 16, top: y - 16,
    opacity,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${rot.value}deg` },
    ],
  }));

  return (
    <Animated.View style={style}>
      <Svg width={32} height={32} viewBox="0 0 32 32">
        <Rect x={1} y={1} width={30} height={30} rx={2}
          fill={COLOR_F} fillOpacity={0.50} />
        <Line x1={6} y1={11} x2={26} y2={11}
          stroke={COLOR_F} strokeWidth={1.5} strokeOpacity={0.75} />
        <Line x1={6} y1={16} x2={26} y2={16}
          stroke={COLOR_F} strokeWidth={1.5} strokeOpacity={0.75} />
        <Line x1={6} y1={21} x2={20} y2={21}
          stroke={COLOR_F} strokeWidth={1.5} strokeOpacity={0.75} />
      </Svg>
    </Animated.View>
  );
};

// ─── SOPHOMORE: Paper planes ──────────────────────────────────────────────────
const COLOR_S = '#1D7FC4';
const _sp = seededRand(88);

interface PlaneConfig {
  startX: number; endDX: number; y: number;
  waveAmp: number; dur: number; delay: number;
  scale: number; opacity: number; flip: boolean;
}

const PLANES: PlaneConfig[] = Array.from({ length: 5 }, (_, i) => {
  const fromLeft = i % 2 === 0;
  return {
    startX:  fromLeft ? -60 : W + 60,
    endDX:   fromLeft ? W + 120 : -(W + 120),
    y:       H * (0.12 + _sp() * 0.62),
    waveAmp: 8 + _sp() * 10,
    dur:     7500 + _sp() * 4000,
    delay:   _sp() * 4500,
    scale:   0.75 + _sp() * 0.55,
    opacity: 0.28 + _sp() * 0.18,
    flip:    fromLeft,
  };
});

const PaperPlane = ({ startX, endDX, y, waveAmp, dur, delay, scale, opacity, flip }: PlaneConfig) => {
  const tx   = useSharedValue(0);
  const wave = useSharedValue(0);
  const tilt = useSharedValue(0);

  useEffect(() => {
    tx.value = withDelay(delay, withRepeat(
      withTiming(endDX, { duration: dur, easing: Easing.linear }),
      -1, false
    ));
    wave.value = withDelay(delay, withRepeat(withSequence(
      withTiming( waveAmp, { duration: dur * 0.25, easing: Easing.inOut(Easing.sin) }),
      withTiming(0,        { duration: dur * 0.25, easing: Easing.inOut(Easing.sin) }),
      withTiming(-waveAmp, { duration: dur * 0.25, easing: Easing.inOut(Easing.sin) }),
      withTiming(0,        { duration: dur * 0.25, easing: Easing.inOut(Easing.sin) })
    ), -1, false));
    tilt.value = withDelay(delay + 80, withRepeat(withSequence(
      withTiming(-6, { duration: dur * 0.25, easing: Easing.inOut(Easing.sin) }),
      withTiming(0,  { duration: dur * 0.25, easing: Easing.inOut(Easing.sin) }),
      withTiming( 6, { duration: dur * 0.25, easing: Easing.inOut(Easing.sin) }),
      withTiming(0,  { duration: dur * 0.25, easing: Easing.inOut(Easing.sin) })
    ), -1, false));
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: startX, top: y,
    opacity,
    transform: [
      { translateX: tx.value },
      { translateY: wave.value },
      { rotate: `${tilt.value}deg` },
      { scaleX: flip ? -scale : scale },
      { scaleY: scale },
    ],
  }));

  return (
    <Animated.View style={style}>
      <Svg width={44} height={26} viewBox="0 0 44 26">
        <Path d="M 2 13 L 42 7 L 30 13 L 42 19 Z"
          fill={COLOR_S} fillOpacity={0.55} />
        <Path d="M 2 13 L 30 13 L 20 22 Z"
          fill={COLOR_S} fillOpacity={0.35} />
        <Line x1={14} y1={10} x2={30} y2={13}
          stroke={COLOR_S} strokeWidth={0.8} strokeOpacity={0.60} />
      </Svg>
    </Animated.View>
  );
};

// ─── JUNIOR: Falling pages ────────────────────────────────────────────────────
const COLOR_J = '#7048C8';
const _sj = seededRand(55);

interface PageConfig {
  x: number; startY: number; rot0: number;
  flutter: number; dur: number; delay: number; opacity: number;
}

const PAGES: PageConfig[] = Array.from({ length: 6 }, () => ({
  x:       _sj() * W * 0.82 + W * 0.06,
  startY:  -90 - _sj() * 120,
  rot0:    (_sj() - 0.5) * 40,
  flutter: 14 + _sj() * 20,
  dur:     6500 + _sj() * 4000,
  delay:   _sj() * 5500,
  opacity: 0.28 + _sj() * 0.18,
}));

const FallingPage = ({ x, startY, rot0, flutter, dur, delay, opacity }: PageConfig) => {
  const ty  = useSharedValue(0);
  const rot = useSharedValue(rot0);

  useEffect(() => {
    ty.value = withDelay(delay, withRepeat(
      withTiming(H + 120, { duration: dur, easing: Easing.linear }),
      -1, false
    ));
    // End at rot0 so reset is invisible
    rot.value = withDelay(delay, withRepeat(withSequence(
      withTiming(rot0 + flutter, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      withTiming(rot0 - flutter, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      withTiming(rot0,           { duration: 900, easing: Easing.inOut(Easing.sin) })
    ), -1, false));
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x - 13, top: startY,
    opacity,
    transform: [
      { translateY: ty.value },
      { rotate: `${rot.value}deg` },
    ],
  }));

  return (
    <Animated.View style={style}>
      <Svg width={26} height={32} viewBox="0 0 26 32">
        <Path d="M 0 0 L 19 0 L 26 7 L 26 32 L 0 32 Z"
          fill={COLOR_J} fillOpacity={0.45} />
        <Path d="M 19 0 L 19 7 L 26 7 Z"
          fill={COLOR_J} fillOpacity={0.65} />
        <Line x1={4} y1={12} x2={22} y2={12}
          stroke={COLOR_J} strokeWidth={1.2} strokeOpacity={0.70} />
        <Line x1={4} y1={16} x2={22} y2={16}
          stroke={COLOR_J} strokeWidth={1.2} strokeOpacity={0.70} />
        <Line x1={4} y1={20} x2={22} y2={20}
          stroke={COLOR_J} strokeWidth={1.2} strokeOpacity={0.70} />
        <Line x1={4} y1={24} x2={16} y2={24}
          stroke={COLOR_J} strokeWidth={1.2} strokeOpacity={0.70} />
      </Svg>
    </Animated.View>
  );
};

// ─── SENIOR: Graduation caps ──────────────────────────────────────────────────
const COLOR_SR = '#C47A12';
const _sc = seededRand(77);

interface CapConfig {
  x: number; throwY: number; driftX: number;
  rot0: number; spinDur: number; throwDur: number;
  delay: number; opacity: number;
}

const CAPS: CapConfig[] = Array.from({ length: 6 }, () => ({
  x:        _sc() * W * 0.78 + W * 0.11,
  throwY:   -(H + 80),
  driftX:   (_sc() - 0.5) * 60,
  rot0:     _sc() * 360,
  spinDur:  2800 + _sc() * 2500,
  throwDur: 2200 + _sc() * 1800,
  delay:    _sc() * 4200,
  opacity:  0.30 + _sc() * 0.20,
}));

const GradCap = ({ x, throwY, driftX, rot0, spinDur, throwDur, delay, opacity }: CapConfig) => {
  // Cap starts below screen (top: H + 30) and ty=0, throws up to throwY then returns to 0
  const ty  = useSharedValue(0);
  const tx  = useSharedValue(0);
  const rot = useSharedValue(rot0);

  useEffect(() => {
    // Sequence ends at 0 → reset is invisible (0 → 0)
    ty.value = withDelay(delay, withRepeat(withSequence(
      withTiming(throwY,  { duration: throwDur,       easing: Easing.out(Easing.cubic) }),
      withTiming(0,       { duration: throwDur * 1.6, easing: Easing.in(Easing.cubic)  })
    ), -1, false));
    tx.value = withDelay(delay, withRepeat(withSequence(
      withTiming( driftX, { duration: throwDur * 1.3, easing: Easing.inOut(Easing.sin) }),
      withTiming(-driftX, { duration: throwDur * 1.3, easing: Easing.inOut(Easing.sin) }),
      withTiming(0,       { duration: throwDur * 1.3, easing: Easing.inOut(Easing.sin) })
    ), -1, false));
    // rot0 + 360 looks same as rot0 → reset invisible
    rot.value = withDelay(delay, withRepeat(
      withTiming(rot0 + 360, { duration: spinDur, easing: Easing.linear }),
      -1, false
    ));
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x - 17,
    top: H + 30,
    opacity,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${rot.value}deg` },
    ],
  }));

  return (
    <Animated.View style={style}>
      <Svg width={34} height={26} viewBox="0 0 34 26">
        {/* Board */}
        <Rect x={1} y={1} width={32} height={9} rx={1}
          fill={COLOR_SR} fillOpacity={0.55} />
        {/* Crown */}
        <Path d="M 9 10 L 25 10 L 23 20 L 11 20 Z"
          fill={COLOR_SR} fillOpacity={0.45} />
        {/* Tassel */}
        <Line x1={30} y1={5} x2={33} y2={17}
          stroke={COLOR_SR} strokeWidth={1.5} strokeOpacity={0.75} />
        <Circle cx={33} cy={19} r={2.5}
          fill={COLOR_SR} fillOpacity={0.75} />
      </Svg>
    </Animated.View>
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────
interface YearBackgroundsProps {
  progress: SharedValue<number>;
}

export default function YearBackgrounds({ progress }: YearBackgroundsProps) {
  return (
    <>
      <SectionFade progress={progress} start={0} end={2}>
        {STICKIES.map((p, i) => <StickyNote key={i} {...p} />)}
      </SectionFade>

      <SectionFade progress={progress} start={3} end={5}>
        {PLANES.map((p, i) => <PaperPlane key={i} {...p} />)}
      </SectionFade>

      <SectionFade progress={progress} start={6} end={9}>
        {PAGES.map((p, i) => <FallingPage key={i} {...p} />)}
      </SectionFade>

      <SectionFade progress={progress} start={10} end={13}>
        {CAPS.map((p, i) => <GradCap key={i} {...p} />)}
      </SectionFade>
    </>
  );
}
