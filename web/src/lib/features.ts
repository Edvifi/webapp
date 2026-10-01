/**
 * Feature flags.
 *
 * Off unless the environment explicitly turns them on, so a missing variable
 * hides a feature rather than shipping one nobody meant to ship. Set these in
 * `.env.local` for a dev machine, and in the host's environment per
 * deployment.
 *
 * Knowledge Library and College Essays are built and working; they are hidden
 * while the product focuses on applications and aid. The modules themselves
 * are untouched — only whether the dashboard offers a way into them.
 */
export const FEATURES = {
  knowledgeLibrary: import.meta.env.VITE_FEATURE_KNOWLEDGE_LIBRARY === 'true',
  essays: import.meta.env.VITE_FEATURE_ESSAYS === 'true',
} as const

/** Whether a dashboard module key is currently offered. */
export function moduleEnabled(key: string): boolean {
  if (key === 'Knowledge Library') return FEATURES.knowledgeLibrary
  if (key === 'College Essays') return FEATURES.essays
  return true
}
