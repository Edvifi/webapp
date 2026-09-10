/**
 * Build-time feature flags, read from Vite env vars (`VITE_FEATURE_*`).
 *
 * Vite inlines `import.meta.env.VITE_*` at build time, so a flag is fixed per
 * deploy: set it in the hosting provider's env (or `.env.local` for dev) and
 * rebuild. Values are strings — "true", "1", "yes" or "on" (any case) turn a
 * flag on; anything else, including unset, leaves it OFF. New features ship
 * dark until the deploy opts in.
 */

const TRUTHY = new Set(['1', 'true', 'yes', 'on'])

export function parseFlag(raw: string | undefined, defaultValue = false): boolean {
  if (raw == null) return defaultValue
  const v = raw.trim().toLowerCase()
  if (v === '') return defaultValue
  return TRUTHY.has(v)
}

export const FEATURES = {
  /** AI essay feedback in the Essays module (calls the `essay-feedback` edge function). */
  essayFeedback: parseFlag(import.meta.env.VITE_FEATURE_ESSAY_FEEDBACK),
} as const
