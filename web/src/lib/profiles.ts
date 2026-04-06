import { supabase } from './supabase'
import type { UserProfile, Demographics } from '../types/user'

const PROFILE_COLUMNS = 'id, email, display_name, avatar_url, grade_start_idx, answers, demographics, onboarding_complete'

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
      demographics,
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
    .update(fields)
    .eq('id', uid)

  if (error) throw error
}
