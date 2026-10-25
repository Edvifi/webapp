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

/** Down-caret for selects drawn with `appearance: none`, so they match the app's own dropdowns. */
export const SELECT_CARET =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%238a7a68' stroke-width='1.5'/%3E%3C/svg%3E\")"

/** Spread into a <select>'s style to draw SELECT_CARET in place of the
 *  browser's own arrow. Use backgroundColor, not background, beside it: the
 *  shorthand would wipe the caret. Leave ~26px of right padding for it. */
export const CARET_SELECT = {
  appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
  backgroundImage: SELECT_CARET, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
} as const

/** Semantic "success / completed" green, shared across module checklists. */
export const SUCCESS_GREEN = '#2D9E72'

/**
 * Color and word for a college fit score (0–100), shared by every place fit
 * shows: green for a strong fit, the Applications purple for a good one, warm
 * grey below that. Never red: red means "reach" on the college list, and a low
 * fit is not a prediction about getting in. Students see the word, not the
 * number — a bare "68%" read as a precision the score doesn't have.
 */
const FIT_STRONG = 80
const FIT_GOOD = 65
export function fitScoreColor(score: number): string {
  return score >= FIT_STRONG ? SUCCESS_GREEN : score >= FIT_GOOD ? '#7048C8' : '#9A8B74'
}
export function fitScoreLabel(score: number): string {
  return score >= FIT_STRONG ? 'Great fit' : score >= FIT_GOOD ? 'Good fit' : 'Fair fit'
}
