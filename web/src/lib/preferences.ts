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
}

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
