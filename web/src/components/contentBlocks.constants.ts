/**
 * Shared constants for content-block rendering — kept in their own file
 * so contentBlocks.tsx can stay component-only (Vite Fast Refresh).
 */

export const CALLOUT_VARIANT: Record<string, { color: string; bg: string; icon: string }> = {
  info: { color: '#1D7FC4', bg: '#E8F0F8', icon: 'i' },
  tip: { color: '#2D9E72', bg: '#ECF6F0', icon: '*' },
  warning: { color: '#C47A12', bg: '#FFF3E0', icon: '!' },
}

export const TYPE_BADGE_META: Record<string, { label: string; color: string; bg: string }> = {
  article: { label: 'Article', color: '#1D7FC4', bg: '#E8EEF5' },
  quiz: { label: 'Quiz', color: '#7048C8', bg: '#EDEAF7' },
  assignment: { label: 'Assignment', color: '#C47A12', bg: '#F5EDE5' },
  task: { label: 'Task', color: '#2D9E72', bg: '#EBF5F0' },
  resource: { label: 'Resource', color: '#B93A3A', bg: '#FAEAEA' },
}
