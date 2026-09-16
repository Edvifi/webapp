/**
 * Shared constants for content-block rendering — kept in their own file
 * so contentBlocks.tsx can stay component-only (Vite Fast Refresh).
 */

/**
 * `color` is a var() reference, so it can never take a concatenated hex alpha
 * suffix (`${color}18` yields `var(--c-soph)18`, which the browser drops).
 * `rgb` is the channel twin for call sites that need partial opacity:
 * `rgba(${v.rgb}, 0.09)`.
 */
export const CALLOUT_VARIANT: Record<string, { color: string; rgb: string; bg: string; icon: string }> = {
  info: { color: 'var(--c-soph)', rgb: 'var(--c-soph-rgb)', bg: '#E8F0F8', icon: 'i' },
  tip: { color: 'var(--c-fresh)', rgb: 'var(--c-fresh-rgb)', bg: '#ECF6F0', icon: '*' },
  warning: { color: 'var(--c-sen)', rgb: 'var(--c-sen-rgb)', bg: '#FFF3E0', icon: '!' },
}

export const TYPE_BADGE_META: Record<string, { label: string; color: string; rgb: string; bg: string }> = {
  article: { label: 'Article', color: 'var(--c-soph)', rgb: 'var(--c-soph-rgb)', bg: 'var(--tint-soph)' },
  quiz: { label: 'Quiz', color: 'var(--c-jun)', rgb: 'var(--c-jun-rgb)', bg: 'var(--tint-jun)' },
  assignment: { label: 'Assignment', color: 'var(--c-sen)', rgb: 'var(--c-sen-rgb)', bg: 'var(--tint-sen)' },
  task: { label: 'Task', color: 'var(--c-fresh)', rgb: 'var(--c-fresh-rgb)', bg: 'var(--tint-fresh)' },
  resource: { label: 'Resource', color: 'var(--c-danger)', rgb: 'var(--c-danger-rgb)', bg: 'var(--tint-danger)' },
}
