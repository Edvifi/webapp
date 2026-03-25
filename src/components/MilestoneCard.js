/**
 * MilestoneCard
 *
 * The card fades out as the camera travels between nodes, snaps its content
 * to the new node at the midpoint, then fades back in with a short delay —
 * giving the feeling that the text "arrives" after you land at the new stop.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { milestones, YEAR_GROUPS, TOTAL } from '../data/timelineData';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Year group → friendly color (readable on warm light bg) ──────────────────
const YEAR_COLORS = ['#2D9E72', '#1D7FC4', '#7048C8', '#C47A12'];

function accentForIndex(idx) {
  for (let i = YEAR_GROUPS.length - 1; i >= 0; i--) {
    if (idx >= YEAR_GROUPS[i].startIndex) return YEAR_COLORS[i];
  }
  return YEAR_COLORS[0];
}

// ── Task row ──────────────────────────────────────────────────────────────────
const Task = ({ text, accent }) => (
  <View style={styles.taskRow}>
    <View style={[styles.taskDot, { backgroundColor: accent }]} />
    <Text style={styles.taskText}>{text}</Text>
  </View>
);

// ── MilestoneCard ─────────────────────────────────────────────────────────────
export default function MilestoneCard({ progress }) {
  const [displayIndex, setDisplayIndex] = useState(0);
  const fadeAnim = useSharedValue(1);

  // When progress crosses a node midpoint: fade out → swap content → fade in (with delay)
  useAnimatedReaction(
    () => Math.round(progress.value),
    (current, previous) => {
      if (current !== previous && current >= 0 && current < TOTAL) {
        fadeAnim.value = withSequence(
          withTiming(0, { duration: 160 }),
          withDelay(120, withTiming(1, { duration: 380 }))
        );
        runOnJS(setDisplayIndex)(current);
      }
    },
    [progress]
  );

  // Subtle scale + opacity during travel
  const cardStyle = useAnimatedStyle(() => {
    'worklet';
    const dist    = Math.abs(progress.value - Math.round(progress.value));
    const travelOpacity = interpolate(dist, [0, 0.4], [1, 0.6], Extrapolation.CLAMP);
    return {
      opacity:   fadeAnim.value * travelOpacity,
      transform: [{ scale: interpolate(fadeAnim.value, [0, 1], [0.97, 1]) }],
    };
  });

  const m      = milestones[displayIndex];
  const accent = accentForIndex(displayIndex);

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      {/* Left accent stripe */}
      <View style={[styles.stripe, { backgroundColor: accent }]} />

      <View style={styles.body}>
        {/* Year badge + phase */}
        <View style={styles.metaRow}>
          <View style={[styles.badge, { borderColor: accent + '55' }]}>
            <Text style={[styles.badgeText, { color: accent }]}>{m.grade} Grade</Text>
          </View>
          <Text style={styles.phase} numberOfLines={1}>{m.phase}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{m.title}</Text>

        {/* Description */}
        <Text style={styles.desc}>{m.description}</Text>

        {/* Tasks */}
        <View style={styles.tasks}>
          {m.tasks.map((t, i) => (
            <Task key={i} text={t} accent={accent} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    width: SCREEN_W - 32,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: 'rgba(60,35,10,0.09)',
    shadowColor: '#3C2206',
    shadowOpacity: 0.10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  stripe: {
    width: 4,
  },

  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    gap: 11,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  phase: {
    fontSize: 11,
    color: 'rgba(28,18,7,0.42)',
    fontWeight: '400',
    letterSpacing: 0.3,
    flexShrink: 1,
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1207',
    letterSpacing: -0.5,
    lineHeight: 36,
  },

  desc: {
    fontSize: 13.5,
    color: 'rgba(28,18,7,0.55)',
    lineHeight: 21,
    fontWeight: '400',
  },

  tasks: {
    gap: 9,
    marginTop: 2,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  taskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    opacity: 0.9,
  },
  taskText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(28,18,7,0.72)',
    lineHeight: 19,
    fontWeight: '400',
  },
});
