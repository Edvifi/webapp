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
      // Records when this reading was taken, so the grade can advance with the
      // school year instead of pinning the student to the year they signed up.
      grade_set_at: new Date().toISOString(),
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

/**
 * What a sign-in provider knows that the profile is missing.
 *
 * `handle_new_user` copies the name and picture off the identity, but it fires
 * on user *creation* only. Someone who signed up by email and later signed in
 * with Google links a new identity to the account they already had, so the
 * trigger never runs for them and their profile keeps whatever gaps it had —
 * in practice no picture, and for anyone who skipped it, no name either.
 *
 * Only ever fills a blank. `display_name` is the first name from the intro
 * survey, chosen by the student; Google's idea of their name does not get to
 * overwrite it.
 */
export function identityGaps(
  profile: Pick<UserProfile, 'display_name' | 'avatar_url'>,
  meta: Record<string, unknown> | undefined,
): Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>> | null {
  if (!meta) return null
  const str = (k: string) => (typeof meta[k] === 'string' ? (meta[k] as string).trim() : '')
  const patch: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>> = {}

  if (!profile.display_name) {
    // Google sends one full name and no given_name, and the app greets people
    // by first name ("Hey, Danial"), so take the leading word.
    const first = (str('full_name') || str('name')).split(/\s+/)[0]
    if (first) patch.display_name = first
  }
  if (!profile.avatar_url) {
    const url = str('avatar_url') || str('picture')
    // Only somewhere a browser will actually fetch from.
    if (/^https:\/\//.test(url)) patch.avatar_url = url
  }
  return Object.keys(patch).length > 0 ? patch : null
}
