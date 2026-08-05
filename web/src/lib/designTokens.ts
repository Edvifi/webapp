/**
 * Shared design tokens for module shells and dashboard surfaces.
 * Ported from the original FAFSA mockup; extracted so multiple modules
 * (Financial Aid, Testing, Essays, etc.) share the same visual language.
 */

/**
 * Theme-aware: these resolve to CSS variables defined in index.css
 * (:root for light, [data-theme="dark"] overrides). Inline styles pick
 * up the active theme automatically. Never string-concatenate alpha
 * onto these values — they are var() references, not hex literals.
 */
export const C = {
  bg: 'var(--bg)',
  surface: 'var(--surface)',
  surfaceHover: 'var(--surface-hover)',
  white: 'var(--elevated)',
  text: 'var(--text)',
  /* Reference the vars rather than restating the alphas. These previously
     carried their own numbers (0.50/0.25/0.10/0.18) that had drifted from
     index.css (0.45/0.22/0.08/0.12) — the same token rendering two different
     colors depending on whether a component used CSS or an inline style. */
  textMuted: 'var(--text-muted)',
  textFaint: 'var(--text-faint)',
  border: 'var(--border)',
  borderStrong: 'var(--border-str)',
  shadow1: 'var(--shadow-1)',
  shadow2: 'var(--shadow-2)',
  shadow3: 'var(--shadow-3)',
  /**
   * Modal overlay. Uses its own channel rather than --ink-rgb, which inverts
   * to a light tone in dark mode and would wash the overlay out to white.
   * --scrim-rgb keeps the original warm near-black in light and goes to pure
   * black in dark.
   */
  scrim: 'rgba(var(--scrim-rgb), 0.45)',
}

export interface YearStyle {
  label: string
  color: string
  tint: string
  emoji: string
}

export const YEARS: Record<number, YearStyle> = {
  9: { label: 'Freshman', color: 'var(--c-fresh)', tint: 'var(--tint-fresh)', emoji: '🌱' },
  10: { label: 'Sophomore', color: 'var(--c-soph)', tint: 'var(--tint-soph)', emoji: '📘' },
  11: { label: 'Junior', color: 'var(--c-jun)', tint: 'var(--tint-jun)', emoji: '🚀' },
  12: { label: 'Senior', color: 'var(--c-sen)', tint: 'var(--tint-sen)', emoji: '🎓' },
}

/** Channel form of each year's accent, for `rgba(var(--c-x-rgb), a)` when a
 *  call site needs the accent at partial opacity. `color` above is a var()
 *  reference and cannot take a concatenated hex alpha suffix. */
export const YEAR_RGB: Record<number, string> = {
  9: 'var(--c-fresh-rgb)',
  10: 'var(--c-soph-rgb)',
  11: 'var(--c-jun-rgb)',
  12: 'var(--c-sen-rgb)',
}

/**
 * Per-module accent color. Each module picks its own from this palette
 * (or contributes a new one) so the sidebar / progress bar / active tab
 * have consistent identity across the app.
 */
export const MODULE_COLORS = {
  financialAid: 'var(--c-fresh)',
  applications: 'var(--c-jun)',
  essays: 'var(--c-sen)',
  knowledgeLibrary: 'var(--c-lib)',
} as const

/** Channel twins of MODULE_COLORS, for partial-opacity call sites. */
export const MODULE_COLORS_RGB = {
  financialAid: 'var(--c-fresh-rgb)',
  applications: 'var(--c-jun-rgb)',
  essays: 'var(--c-sen-rgb)',
  knowledgeLibrary: 'var(--c-lib-rgb)',
} as const

export type ModuleColorKey = keyof typeof MODULE_COLORS

/**
 * Standard cubic-bezier easing for module-shell animations
 * (intro fades, accordion expands, etc.). Matches what FAFSA and the
 * generic ModuleTour use, so any module sharing this stays in sync.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const

/** Semantic "success / completed" green, shared across module checklists. */
export const SUCCESS_GREEN = 'var(--c-fresh)'
/** Channel form of SUCCESS_GREEN, for partial-opacity fills and borders. */
export const SUCCESS_GREEN_RGB = 'var(--c-fresh-rgb)'
