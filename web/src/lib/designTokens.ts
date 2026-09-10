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

/**
 * Apply alpha to a color that may be either a themed `var(--c-x)` token or a
 * raw hex literal.
 *
 * The pattern this replaces is hex-alpha concatenation — `` `${color}18` `` or
 * `color + '18'`. That works only while `color` is a 6-digit hex; the moment it
 * becomes a var() reference it yields `var(--c-jun)18`, which is not a valid
 * color, so the browser drops the whole declaration and the border or wash
 * silently disappears. Nothing throws and nothing logs.
 *
 * Every themed accent has a `-rgb` channel twin (`--c-jun` / `--c-jun-rgb`),
 * which is what makes the token branch below possible.
 */
export const withAlpha = (color: string, alpha: number): string => {
  const token = /^var\((--[\w-]+)\)$/.exec(color)
  if (token) return `rgba(var(${token[1]}-rgb), ${alpha})`
  const hex = /^#([0-9a-f]{6})$/i.exec(color)
  if (!hex) return color
  const n = parseInt(hex[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/**
 * Force monochrome ("text") presentation on emoji so they render through the
 * 'Noto Emoji' face in the font stack as single-colour glyphs that inherit the
 * themed text colour — instead of the glossy system colour emoji.
 *
 * Font choice alone is not enough: browsers keep colour presentation for any
 * codepoint carrying U+FE0F, and `font-variant-emoji: text` doesn't override
 * it reliably across engines. The deterministic fix is to rewrite the string:
 * drop the colour selector (U+FE0F) and append the text selector (U+FE0E)
 * after each pictographic codepoint. The ZWJ (U+200D) guard leaves joined
 * sequences (e.g. 🐻‍❄️) intact by not injecting a selector mid-sequence.
 */
export const mono = (s: string): string =>
  s
    .replace(/\uFE0F/g, '')
    .replace(/(\p{Extended_Pictographic})(?!\u200D|\uFE0E)/gu, '$1\uFE0E')

/**
 * Map a themed accent var to its vivid "fill" twin. The accents are darkened
 * for AA *text* contrast on the light parchment, which reads muddy on non-text
 * surfaces (progress bars, meters, dots, status pills that carry no text). Use
 * this for those fills only \u2014 NOT for accent-coloured text or white-on-accent
 * buttons, where the darker accent is required for contrast.
 */
const FILL_MAP: Record<string, string> = {
  '--c-fresh': '--c-fresh-fill',
  '--c-soph': '--c-soph-fill',
  '--c-jun': '--c-jun-fill',
  '--c-sen': '--c-sen-fill',
  '--c-lib': '--c-lib-fill',
}
export const fillOf = (color: string): string => {
  const m = /^var\((--c-[a-z]+)\)$/.exec(color)
  return m && FILL_MAP[m[1]] ? `var(${FILL_MAP[m[1]]})` : color
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
