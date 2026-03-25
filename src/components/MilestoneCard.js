/**
 * MilestoneCard
 *
 * Collapsed by default. Tap to expand description + tasks.
 * Auto-collapses when navigating to a new node.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
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
import { milestones, YEAR_GROUPS, YEAR_COLORS, TOTAL } from '../data/timelineData';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_W } = Dimensions.get('window');

function accentForIndex(idx) {
  for (let i = YEAR_GROUPS.length - 1; i >= 0; i--) {
    if (idx >= YEAR_GROUPS[i].startIndex) return YEAR_COLORS[i];
  }
  return YEAR_COLORS[0];
}

const Task = ({ text, accent }) => (
  <View style={styles.taskRow}>
    <View style={[styles.taskDot, { backgroundColor: accent }]} />
    <Text style={styles.taskText}>{text}</Text>
  </View>
);

export default function MilestoneCard({ progress }) {
  const [displayIndex, setDisplayIndex] = useState(0);
  const [expanded, setExpanded]         = useState(false);
  const fadeAnim = useSharedValue(1);

  const collapseCard = () => setExpanded(false);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (current, previous) => {
      if (current !== previous && current >= 0 && current < TOTAL) {
        fadeAnim.value = withSequence(
          withTiming(0, { duration: 160 }),
          withDelay(120, withTiming(1, { duration: 380 }))
        );
        runOnJS(setDisplayIndex)(current);
        runOnJS(collapseCard)();
      }
    },
    [progress]
  );

  const cardStyle = useAnimatedStyle(() => {
    'worklet';
    const dist = Math.abs(progress.value - Math.round(progress.value));
    const travelOpacity = interpolate(dist, [0, 0.4], [1, 0.6], Extrapolation.CLAMP);
    return {
      opacity:   fadeAnim.value * travelOpacity,
      transform: [{ scale: interpolate(fadeAnim.value, [0, 1], [0.97, 1]) }],
    };
  });

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(e => !e);
  };

  const m      = milestones[displayIndex];
  const accent = accentForIndex(displayIndex);
  const dimBg  = accent + '12';

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <View style={[styles.stripe, { backgroundColor: accent }]} />

      <TouchableOpacity style={styles.body} onPress={toggle} activeOpacity={0.85}>

        {/* Top row: meta left, emoji right */}
        <View style={styles.topRow}>
          <View style={styles.metaCol}>
            <View style={styles.metaRow}>
              <View style={[styles.badge, { backgroundColor: dimBg, borderColor: accent + '40' }]}>
                <Text style={[styles.badgeText, { color: accent }]}>{m.grade} Grade</Text>
              </View>
              <Text style={styles.phase} numberOfLines={1}>{m.phase}</Text>
            </View>
            <Text style={styles.title}>{m.title}</Text>
          </View>

          <View style={[styles.emojiBox, { backgroundColor: dimBg }]}>
            <Text style={styles.emoji}>{m.emoji}</Text>
          </View>
        </View>

        {/* Expanded detail */}
        {expanded ? (
          <View style={styles.detail}>
            <Text style={styles.desc}>{m.description}</Text>
            <View style={styles.tasks}>
              {m.tasks.map((t, i) => (
                <Task key={i} text={t} accent={accent} />
              ))}
            </View>
            <Text style={[styles.collapseHint, { color: accent }]}>↑ collapse</Text>
          </View>
        ) : (
          <View style={styles.expandRow}>
            <Text style={[styles.expandHint, { color: accent }]}>See tasks  ↓</Text>
          </View>
        )}

      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    width: SCREEN_W - 32,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: 'rgba(60,35,10,0.08)',
    shadowColor: '#3C2206',
    shadowOpacity: 0.10,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  stripe: {
    width: 4,
  },

  body: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  metaCol: {
    flex: 1,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  phase: {
    fontSize: 11,
    color: 'rgba(28,18,7,0.40)',
    fontWeight: '400',
    letterSpacing: 0.2,
    flexShrink: 1,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1207',
    letterSpacing: -0.5,
    lineHeight: 30,
  },

  emojiBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  emoji: {
    fontSize: 26,
  },

  expandRow: {
    flexDirection: 'row',
  },
  expandHint: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    opacity: 0.7,
  },

  detail: {
    gap: 10,
  },
  desc: {
    fontSize: 13,
    color: 'rgba(28,18,7,0.55)',
    lineHeight: 20,
    fontWeight: '400',
  },
  tasks: {
    gap: 7,
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
    color: 'rgba(28,18,7,0.70)',
    lineHeight: 19,
    fontWeight: '400',
  },
  collapseHint: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.6,
    letterSpacing: 0.3,
  },
});
