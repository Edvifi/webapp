import { supabase } from './supabase'
import type { Json } from '../types/database'
import type { UserProfile, Demographics } from '../types/user'

const PROFILE_COLUMNS = 'id, email, display_name, avatar_url, grade_start_idx, answers, demographics, onboarding_complete, settings'

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', uid)
    .single()

  if (error) {
    // PGRST116 = row not found, which is expected for brand new users
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as UserProfile
}

export async function saveOnboardingData(
  uid: string,
  gradeStartIdx: number,
  answers: Record<string, number>,
  demographics: Demographics,
) {
  const { error } = await supabase
    .from('profiles')
    .update({
      grade_start_idx: gradeStartIdx,
      answers,
      demographics: demographics as unknown as Json,
      display_name: demographics.first_name,
      onboarding_complete: true,
    })
    .eq('id', uid)

  if (error) throw error
}

/** Update specific profile fields (display_name, demographics, etc.) */
export async function updateProfile(
  uid: string,
  fields: Partial<Pick<UserProfile, 'display_name' | 'avatar_url' | 'demographics'>>,
) {
  const { error } = await supabase
    .from('profiles')
    .update(fields as Record<string, unknown>)
    .eq('id', uid)

  if (error) throw error
}

/**
 * Mark an intro/tour as seen for the current user.
 *
 * Delegates to the `mark_intro_seen` RPC, which appends the key to
 * `settings->intros_seen` atomically and idempotently server-side. This avoids
 * the lost-update race of a client-side read-modify-write: marking tour A then
 * tour B in quick succession would otherwise clobber A (each write is based on
 * a stale client snapshot), causing A's tour to reappear.
 */
export async function markIntroSeen(introKey: string) {
  const { error } = await supabase.rpc('mark_intro_seen', { intro_key: introKey })
  if (error) throw error
}
