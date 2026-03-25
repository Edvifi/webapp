import React from 'react';
import { View, StyleSheet } from 'react-native';

// ─── Moon Landing ───────────────────────────────────────────────────────────
const MoonArt = ({ color }) => (
  <View style={styles.artRoot}>
    {/* Orbit rings */}
    {[260, 200, 148].map((size, i) => (
      <View
        key={i}
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
            opacity: 0.08 + i * 0.06,
          },
        ]}
      />
    ))}
    {/* Moon body */}
    <View
      style={[
        styles.moonBody,
        {
          backgroundColor: color,
          shadowColor: color,
        },
      ]}
    />
    {/* Crater details */}
    <View style={[styles.crater, { top: 38, left: 58, width: 12, height: 12, opacity: 0.35 }]} />
    <View style={[styles.crater, { top: 54, left: 45, width: 7, height: 7, opacity: 0.25 }]} />
    <View style={[styles.crater, { top: 46, left: 70, width: 9, height: 9, opacity: 0.3 }]} />
    {/* Stars */}
    {[
      [10, 30], [30, 10], [50, 25], [70, 8], [85, 40],
      [15, 65], [60, 70], [80, 60], [40, 80],
    ].map(([x, y], i) => (
      <View
        key={`s-${i}`}
        style={[
          styles.star,
          {
            top: `${y}%`,
            left: `${x}%`,
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            opacity: 0.25 + (i % 4) * 0.12,
          },
        ]}
      />
    ))}
  </View>
);

// ─── World Wide Web ─────────────────────────────────────────────────────────
const WebArt = ({ color }) => {
  const nodes = [
    { cx: 50, cy: 50, r: 10, primary: true },
    { cx: 22, cy: 30, r: 6 },
    { cx: 78, cy: 25, r: 7 },
    { cx: 20, cy: 68, r: 5 },
    { cx: 75, cy: 72, r: 6 },
    { cx: 50, cy: 20, r: 5 },
    { cx: 50, cy: 80, r: 5 },
    { cx: 85, cy: 50, r: 4 },
    { cx: 15, cy: 50, r: 4 },
  ];

  const edges = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8],
    [1, 5], [2, 5], [1, 3], [2, 4], [3, 6], [4, 6],
  ];

  const SIZE = 260;

  return (
    <View style={[styles.artRoot, { width: SIZE, height: SIZE }]}>
      {/* Edges */}
      {edges.map(([a, b], i) => {
        const n1 = nodes[a];
        const n2 = nodes[b];
        const x1 = (n1.cx / 100) * SIZE;
        const y1 = (n1.cy / 100) * SIZE;
        const x2 = (n2.cx / 100) * SIZE;
        const y2 = (n2.cy / 100) * SIZE;
        const len = Math.hypot(x2 - x1, y2 - y1);
        const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
        return (
          <View
            key={`e-${i}`}
            style={{
              position: 'absolute',
              // Position the left edge at (x1, y1); rotate around left edge
              // via the translate-rotate-translate trick (RN has no transformOrigin)
              left: x1,
              top: y1 - 0.5,
              width: len,
              height: 1,
              backgroundColor: color,
              opacity: 0.15,
              transform: [
                { translateX: -(len / 2) },
                { rotate: `${angle}deg` },
                { translateX: len / 2 },
              ],
            }}
          />
        );
      })}
      {/* Nodes */}
      {nodes.map((n, i) => (
        <View
          key={`n-${i}`}
          style={{
            position: 'absolute',
            left: (n.cx / 100) * SIZE - n.r,
            top: (n.cy / 100) * SIZE - n.r,
            width: n.r * 2,
            height: n.r * 2,
            borderRadius: n.r,
            backgroundColor: n.primary ? color : 'transparent',
            borderWidth: n.primary ? 0 : 1.5,
            borderColor: color,
            opacity: n.primary ? 0.9 : 0.5,
            shadowColor: color,
            shadowOpacity: n.primary ? 0.8 : 0,
            shadowRadius: n.primary ? 12 : 0,
          }}
        />
      ))}
    </View>
  );
};

// ─── iPhone ─────────────────────────────────────────────────────────────────
const PhoneArt = ({ color }) => (
  <View style={styles.artRoot}>
    {/* Glow backdrop */}
    <View
      style={[
        styles.phoneGlow,
        { backgroundColor: color, shadowColor: color },
      ]}
    />
    {/* Device shell */}
    <View style={[styles.phoneShell, { borderColor: color }]}>
      {/* Notch */}
      <View style={[styles.phoneSpeaker, { backgroundColor: color }]} />
      {/* Screen content lines */}
      {[0.18, 0.30, 0.42, 0.54, 0.66, 0.76].map((top, i) => (
        <View
          key={i}
          style={[
            styles.screenLine,
            {
              top: `${top * 100}%`,
              width: i % 2 === 0 ? '72%' : '55%',
              backgroundColor: color,
              opacity: 0.18 + (i === 0 ? 0.2 : 0),
            },
          ]}
        />
      ))}
      {/* Home indicator */}
      <View style={[styles.homeIndicator, { backgroundColor: color }]} />
    </View>
  </View>
);

// ─── Reset / Pause ──────────────────────────────────────────────────────────
const ResetArt = ({ color }) => (
  <View style={styles.artRoot}>
    {/* Expanding rings */}
    {[220, 170, 120, 70].map((size, i) => (
      <View
        key={i}
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
            opacity: 0.05 + i * 0.07,
          },
        ]}
      />
    ))}
    {/* Pause icon */}
    <View style={styles.pauseContainer}>
      <View style={[styles.pauseBar, { backgroundColor: color }]} />
      <View style={[styles.pauseBar, { backgroundColor: color }]} />
    </View>
  </View>
);

// ─── Future / Horizon ───────────────────────────────────────────────────────
const FutureArt = ({ color }) => (
  <View style={styles.artRoot}>
    {/* Horizon line */}
    <View style={[styles.horizon, { backgroundColor: color }]} />
    {/* Radiating arcs above horizon */}
    {[60, 100, 140, 180, 220].map((size, i) => (
      <View
        key={i}
        style={[
          styles.arc,
          {
            width: size,
            height: size / 2,
            borderTopLeftRadius: size / 2,
            borderTopRightRadius: size / 2,
            borderColor: color,
            borderBottomWidth: 0,
            opacity: 0.06 + i * 0.05,
          },
        ]}
      />
    ))}
    {/* Sun / source */}
    <View style={[styles.sunDot, { backgroundColor: color, shadowColor: color }]} />
    {/* Particles */}
    {[...Array(6)].map((_, i) => (
      <View
        key={`p-${i}`}
        style={[
          styles.particle,
          {
            top: `${15 + i * 8}%`,
            left: `${20 + i * 11}%`,
            backgroundColor: color,
            opacity: 0.2 + (i % 3) * 0.1,
          },
        ]}
      />
    ))}
  </View>
);

// ─── Router ──────────────────────────────────────────────────────────────────
export const SceneArt = ({ artType, color }) => {
  switch (artType) {
    case 'moon':   return <MoonArt color={color} />;
    case 'web':    return <WebArt color={color} />;
    case 'phone':  return <PhoneArt color={color} />;
    case 'reset':  return <ResetArt color={color} />;
    case 'future': return <FutureArt color={color} />;
    default:       return null;
  }
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  artRoot: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Shared
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  star: {
    position: 'absolute',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },

  // Moon
  moonBody: {
    width: 82,
    height: 82,
    borderRadius: 41,
    shadowOpacity: 0.7,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  crater: {
    position: 'absolute',
    borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  // Phone
  phoneGlow: {
    position: 'absolute',
    width: 80,
    height: 140,
    borderRadius: 40,
    opacity: 0.15,
    shadowOpacity: 0.9,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  phoneShell: {
    width: 100,
    height: 180,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  phoneSpeaker: {
    width: 36,
    height: 5,
    borderRadius: 3,
    marginTop: 14,
    opacity: 0.6,
  },
  screenLine: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    left: '14%',
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 10,
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },

  // Pause
  pauseContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  pauseBar: {
    width: 14,
    height: 52,
    borderRadius: 7,
    opacity: 0.85,
  },

  // Future
  horizon: {
    position: 'absolute',
    top: '52%',
    left: '8%',
    right: '8%',
    height: 1.5,
    opacity: 0.5,
  },
  arc: {
    position: 'absolute',
    top: '28%',
    borderWidth: 1,
  },
  sunDot: {
    position: 'absolute',
    top: '44%',
    width: 16,
    height: 16,
    borderRadius: 8,
    opacity: 0.9,
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
