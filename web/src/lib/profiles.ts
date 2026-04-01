import { supabase } from './supabase'
import type { UserProfile } from '../types/user'

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single()

  if (error || !data) return null
  return data as UserProfile
}

export async function saveOnboardingData(
  uid: string,
  gradeStartIdx: number,
  answers: Record<string, number>,
) {
  const { error } = await supabase
    .from('profiles')
    .update({
      grade_start_idx: gradeStartIdx,
      answers,
      onboarding_complete: true,
      last_login_at: new Date().toISOString(),
    })
    .eq('id', uid)

  if (error) throw error
}
