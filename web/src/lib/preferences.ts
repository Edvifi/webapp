/**
 * Settings-page preferences — read/write helpers.
 *
 * Stored under `profiles.settings.preferences` and written through the
 * `merge_settings` RPC. The RPC shallow-merges *top-level* keys, so we
 * always write the full `preferences` object (current + patch) to avoid
 * dropping sibling preference keys.
 */

import { supabase } from './supabase'
import type { Json } from '../types/database'
import type { UserPreferences, UserSettings } from '../types/user'
import { DEADLINE_MODULES } from '../data/applicationDeadlines'

/** The modules on offer before 'Custom' was added. */
const LEGACY_KNOWN_MODULES = ['Application Tracking', 'Financial Aid']

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((m): m is string => typeof m === 'string') : [])

/**
 * The modules whose dates show, with empty meaning "all". The stored list is
 * the ones switched on, so a module added after it was saved would otherwise
 * be silently off: anyone who had turned Financial Aid off would never see
 * the Custom dates they file. Modules the student never had a say in count as on.
 */
export function enabledDeadlineModules(prefs: UserPreferences): string[] {
  const stored = strings(prefs.deadline_modules)
  if (stored.length === 0) return []
  const known = strings(prefs.deadline_modules_known)
  // Saved without a record of what existed: if it names Custom, or has both
  // legacy modules on (before Custom, all-on was stored as []), it was saved
  // with Custom on offer, so its choice about Custom stands. Otherwise it
  // predates Custom, and Custom was never a choice.
  const savedWithCustom = stored.includes('Custom') || LEGACY_KNOWN_MODULES.every((m) => stored.includes(m))
  const knewOf = known.length > 0 ? known : savedWithCustom ? DEADLINE_MODULES : LEGACY_KNOWN_MODULES
  const added = DEADLINE_MODULES.filter((m) => !knewOf.includes(m) && !stored.includes(m))
  return [...stored, ...added]
}

export const DEFAULT_PREFERENCES: Required<UserPreferences> = {
  email_reminders: true,
  theme: 'light',
  timeline_show_completed: true,
  timeline_auto_advance: true,
  deadline_urgent_window: 3,
  deadline_show_estimated: true,
  deadline_modules: [],
  deadline_modules_known: [],
}

/** The windows the settings page offers, and the only values it will store. */
export const URGENT_WINDOWS = [1, 3, 5, 7] as const

/** Effective preferences: stored values over defaults. */
export function resolvePreferences(
  settings: UserSettings | null | undefined,
): Required<UserPreferences> {
  return { ...DEFAULT_PREFERENCES, ...(settings?.preferences ?? {}) }
}

/** Persist a partial preferences patch merged over the current stored values. */
export async function savePreferences(
  settings: UserSettings | null | undefined,
  patch: Partial<UserPreferences>,
): Promise<void> {
  const preferences = { ...(settings?.preferences ?? {}), ...patch }
  const { error } = await supabase.rpc('merge_settings', {
    patch: { preferences } as unknown as Json,
  })
  if (error) throw error
}

/**
 * The deadline preferences, in the shape the views want rather than the shape
 * they are stored in: a validated window, and a module list where empty has
 * already been resolved to "all".
 *
 * Stored values are user-writable JSON, so the window is checked against the
 * offered set instead of trusted — a stray 0 would mark nothing urgent, and a
 * stray 400 would mark everything.
 */
export function resolveDeadlinePreferences(
  settings: UserSettings | null | undefined,
): { urgentWindow: number; showEstimated: boolean; modules: string[] } {
  const prefs = resolvePreferences(settings)
  const stored = prefs.deadline_urgent_window
  const modules = enabledDeadlineModules(prefs)
  return {
    urgentWindow: (URGENT_WINDOWS as readonly number[]).includes(stored)
      ? stored
      : DEFAULT_PREFERENCES.deadline_urgent_window,
    showEstimated: prefs.deadline_show_estimated !== false,
    modules,
  }
}
