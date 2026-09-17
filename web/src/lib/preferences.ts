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

export const DEFAULT_PREFERENCES: Required<UserPreferences> = {
  email_reminders: true,
  weekly_summary: true,
  push_notifications: false,
  theme: 'light',
  timeline_show_completed: true,
  timeline_auto_advance: true,
  deadline_urgent_window: 3,
  deadline_show_estimated: true,
  deadline_modules: [],
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
  const modules = Array.isArray(prefs.deadline_modules)
    ? prefs.deadline_modules.filter((m): m is string => typeof m === 'string')
    : []
  return {
    urgentWindow: (URGENT_WINDOWS as readonly number[]).includes(stored)
      ? stored
      : DEFAULT_PREFERENCES.deadline_urgent_window,
    showEstimated: prefs.deadline_show_estimated !== false,
    modules,
  }
}
