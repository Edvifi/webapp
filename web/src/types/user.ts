export interface UserProfile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  grade_start_idx: number | null
  answers: Record<string, number>
  onboarding_complete: boolean
}
