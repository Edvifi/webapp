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
  textMuted: 'rgba(var(--ink-rgb), 0.50)',
  textFaint: 'rgba(var(--ink-rgb), 0.25)',
  border: 'rgba(var(--line-rgb), 0.10)',
  borderStrong: 'rgba(var(--line-rgb), 0.18)',
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
  9: { label: 'Freshman', color: '#2D9E72', tint: '#EBF5F0', emoji: '🌱' },
  10: { label: 'Sophomore', color: '#1D7FC4', tint: '#E8EEF5', emoji: '📘' },
  11: { label: 'Junior', color: '#7048C8', tint: '#EDEAF7', emoji: '🚀' },
  12: { label: 'Senior', color: '#C47A12', tint: '#F5EDE5', emoji: '🎓' },
}

/**
 * Per-module accent color. Each module picks its own from this palette
 * (or contributes a new one) so the sidebar / progress bar / active tab
 * have consistent identity across the app.
 */
export const MODULE_COLORS = {
  financialAid: '#2D9E72',
  applications: '#7048C8',
  essays: '#C47A12',
  knowledgeLibrary: '#3F5BA9',
} as const

export type ModuleColorKey = keyof typeof MODULE_COLORS

/**
 * Standard cubic-bezier easing for module-shell animations
 * (intro fades, accordion expands, etc.). Matches what FAFSA and the
 * generic ModuleTour use, so any module sharing this stays in sync.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const

/** Semantic "success / completed" green, shared across module checklists. */
export const SUCCESS_GREEN = '#2D9E72'

/**
 * Color for a college fit score (0–100), shared by every place a fit % shows:
 * green for a strong fit, the Applications purple for a good one, warm grey
 * below that. Never red: red means "reach" on the college list, and a low fit
 * is not a prediction about getting in.
 */
export const FIT_STRONG = 80
export const FIT_GOOD = 65
export function fitScoreColor(score: number): string {
  return score >= FIT_STRONG ? SUCCESS_GREEN : score >= FIT_GOOD ? '#7048C8' : '#9A8B74'
}
