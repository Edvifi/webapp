/**
 * Shared design tokens for module shells and dashboard surfaces.
 * Ported from the original FAFSA mockup; extracted so multiple modules
 * (Financial Aid, Testing, Essays, etc.) share the same visual language.
 */

export const C = {
  bg: '#F2EBE0',
  surface: '#FAF6EE',
  surfaceHover: '#F7F2E8',
  white: '#FFFFFF',
  text: '#1C1207',
  textMuted: 'rgba(28,18,7,0.50)',
  textFaint: 'rgba(28,18,7,0.25)',
  border: 'rgba(60,35,10,0.10)',
  borderStrong: 'rgba(60,35,10,0.18)',
  shadow1: '0 1px 3px rgba(60,35,10,0.06)',
  shadow2: '0 2px 8px rgba(60,35,10,0.08)',
  shadow3: '0 4px 16px rgba(60,35,10,0.10)',
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
  testing: '#1D7FC4',
  applications: '#7048C8',
  essays: '#C47A12',
  extracurriculars: '#B83C8B',
  coursePlanning: '#3F5BA9',
} as const

export type ModuleColorKey = keyof typeof MODULE_COLORS

/**
 * Standard cubic-bezier easing for module-shell animations
 * (intro fades, accordion expands, etc.). Matches what FAFSA and the
 * generic ModuleTour use, so any module sharing this stays in sync.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const
