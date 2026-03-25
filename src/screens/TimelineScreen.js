import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PathTimeline from '../components/PathTimeline';
import MilestoneCard from '../components/MilestoneCard';
import { milestones, YEAR_GROUPS, TOTAL } from '../data/timelineData';

const { width: SCREEN_W } = Dimensions.get('window');

const EASE_FWD = Easing.bezier(0.25, 0.46, 0.45, 0.94);
const EASE_BWD = Easing.bezier(0.55, 0.06, 0.68, 0.19);

// Warm light palette
export const BG = '#F2EBE0';

const YEAR_COLORS = ['#2D9E72', '#1D7FC4', '#7048C8', '#C47A12'];

function yearGroupOf(idx) {
  for (let i = YEAR_GROUPS.length - 1; i >= 0; i--) {
    if (idx >= YEAR_GROUPS[i].startIndex) return YEAR_GROUPS[i];
  }
  return YEAR_GROUPS[0];
}

// ─── Step dots ────────────────────────────────────────────────────────────────
const StepDots = ({ currentIndex }) => {
  const group = yearGroupOf(currentIndex);
  const pos   = currentIndex - group.startIndex;
  const color = YEAR_COLORS[YEAR_GROUPS.indexOf(group)];
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: group.count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: color,
              opacity: i <= pos ? 1 : 0.2,
              width: i === pos ? 20 : 7,
            },
          ]}
        />
      ))}
    </View>
  );
};

// ─── Top HUD ─────────────────────────────────────────────────────────────────
const TopHud = ({ currentIndex }) => {
  const group = yearGroupOf(currentIndex);
  const color = YEAR_COLORS[YEAR_GROUPS.indexOf(group)];
  return (
    <View style={styles.topHud}>
      <Text style={[styles.hudYear, { color }]}>{group.label}</Text>
      <StepDots currentIndex={currentIndex} />
    </View>
  );
};

// ─── Nav button ──────────────────────────────────────────────────────────────
const NavBtn = ({ label, onPress, disabled }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.6}
    style={[styles.navBtn, disabled && styles.navBtnOff]}
  >
    <Text style={styles.navBtnText}>{label}</Text>
  </TouchableOpacity>
);

// ─── TimelineScreen ───────────────────────────────────────────────────────────
export default function TimelineScreen() {
  const insets   = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (cur, prev) => {
      if (cur !== prev && cur >= 0 && cur < TOTAL) runOnJS(setCurrentIndex)(cur);
    },
    [progress]
  );

  const goForward = useCallback(() => {
    const target = Math.min(Math.round(progress.value) + 1, TOTAL - 1);
    if (target === Math.round(progress.value)) return;
    progress.value = withTiming(target, { duration: 620, easing: EASE_FWD });
  }, [progress]);

  const goBack = useCallback(() => {
    const target = Math.max(Math.round(progress.value) - 1, 0);
    if (target === Math.round(progress.value)) return;
    progress.value = withTiming(target, { duration: 500, easing: EASE_BWD });
  }, [progress]);

  // Tap: left 35% = back, right 65% = forward
  const tapGesture = Gesture.Tap()
    .maxDuration(400)
    .onEnd((e) => {
      if (e.x < SCREEN_W * 0.35) runOnJS(goBack)();
      else runOnJS(goForward)();
    });

  // Swipe: left = forward, right = back
  const panGesture = Gesture.Pan()
    .activeOffsetX([-22, 22])
    .onEnd((e) => {
      if (e.velocityX < -300)     runOnJS(goForward)();
      else if (e.velocityX > 300) runOnJS(goBack)();
    });

  // Race: whichever activates first wins
  const gesture = Gesture.Race(tapGesture, panGesture);

  const canBack    = currentIndex > 0;
  const canForward = currentIndex < TOTAL - 1;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* ── Warm background ── */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: BG }]} />

      {/* ── Snake path + gesture layer ── */}
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill}>
          <PathTimeline progress={progress} />
        </View>
      </GestureDetector>

      {/* ── Top fade + HUD ── */}
      <LinearGradient
        colors={[BG, BG, BG + 'DD', BG + '88', BG + '00']}
        style={[styles.topFade, { paddingTop: insets.top + 14 }]}
        pointerEvents="none"
      >
        <TopHud currentIndex={currentIndex} />
      </LinearGradient>

      {/* ── Bottom fade + card + nav ── */}
      <LinearGradient
        colors={[BG + '00', BG + 'CC', BG, BG]}
        style={[styles.bottomShelf, { paddingBottom: insets.bottom + 16 }]}
        pointerEvents="box-none"
      >
        <View style={styles.cardWrap}>
          <MilestoneCard progress={progress} />
        </View>

        <View style={styles.navRow}>
          <NavBtn label="← Back" onPress={goBack}    disabled={!canBack}    />
          <Text style={styles.swipeHint}>tap or swipe</Text>
          <NavBtn label="Next →" onPress={goForward} disabled={!canForward} />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    paddingHorizontal: 24,
    justifyContent: 'flex-start',
  },
  topHud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  hudYear: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },

  bottomShelf: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 56,
    paddingHorizontal: 16,
    gap: 12,
  },
  cardWrap: {
    alignItems: 'center',
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  navBtn: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(60,35,10,0.18)',
    backgroundColor: 'rgba(60,35,10,0.05)',
  },
  navBtnOff: { opacity: 0.25 },
  navBtnText: {
    color: 'rgba(40,22,6,0.8)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  swipeHint: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    color: 'rgba(40,22,6,0.25)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
