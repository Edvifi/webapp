/**
 * Per-node card layout offsets — seeded so they're deterministic
 * but feel hand-placed rather than mechanical.
 */

function seededRand(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

export interface CardLayout {
  /** Vertical offset from center in vh units (e.g. -6 means 6vh above center) */
  yOffset: number
  /** Horizontal nudge in px (positive = further from center, negative = closer) */
  xNudge: number
  /** Entry rotation in degrees */
  entryRotate: number
  /** Entry direction bias: extra Y shift on entrance */
  entryY: number
}

const r = seededRand(314)

export const CARD_LAYOUTS: CardLayout[] = Array.from({ length: 14 }, (_, i) => ({
  yOffset:     (r() - 0.5) * 14,          // ±7vh from center
  xNudge:      (r() - 0.5) * 40,          // ±20px horizontal nudge
  entryRotate: (r() - 0.5) * 4,           // ±2° subtle tilt on entry
  entryY:      (r() - 0.5) * 24,          // ±12px vertical entry shift
}))
