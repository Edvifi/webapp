export interface Demographics {
  first_name: string
  age: string
  gender: string
  nationality: string
  race: string | null
  hispanic: string | null
  native_american: string | null
  religion: string | null
  zipcode: string
  school: string
  income_level: string | null
  parent_education: string | null
  parent_immigrants: string | null
}

export interface UserSettings {
  intros_seen?: string[]
  /** Per-module checklist progress for modules other than FAFSA.
   *  FAFSA continues to use the dedicated `fafsa_user_module_state` table.
   *  Shape: `{ [moduleName]: { [itemId]: 'available' | 'in-progress' | 'completed' } }` */
  module_progress?: Record<string, Record<string, string>>
  /** Generic per-module key/value state (college list with status, prefs, etc).
   *  Shape: `{ [moduleName]: { [key]: anyJSONValue } }` */
  module_data?: Record<string, Record<string, unknown>>
}

export interface UserProfile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  grade_start_idx: number | null
  answers: Record<string, number> | null
  demographics: Demographics | null
  onboarding_complete: boolean
  settings: UserSettings | null
}
