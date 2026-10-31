/**
 * Scholarship Engine preferences, asked once before the first matches (like Discover's
 * college preferences) and persisted to settings.module_data.fafsa.aidPrefs.
 *
 * Interests add to the profile's tags, so they raise the score of awards for
 * that field. The rest narrow which awards are shown at all.
 */
import { inferScholarshipType, meetsMinAward, type Scholarship, type TrackerType } from './fafsaData'
import { needsEssay } from '../data/scholarshipTasks'

export interface AidPrefs {
  completed: boolean
  /** Keys of INTEREST_OPTIONS. */
  interests: string[]
  /** Empty means every type. */
  types: TrackerType[]
  /** Dollars; one of AWARD_MINIMUMS. */
  minAward: number
  /** False hides awards that ask for an essay or personal statement. */
  essays: boolean
  /** False hides awards limited to certain states or regions. The catalogue
   *  tags them but doesn't say which, so they can't be matched to home. */
  regional: boolean
}

export const DEFAULT_AID_PREFS: AidPrefs = { completed: false, interests: [], types: [], minAward: 0, essays: true, regional: true }

/** What a student is into, and the catalogue tags each one covers. */
export const INTEREST_OPTIONS: Array<{ key: string; label: string; tags: string[] }> = [
  { key: 'stem', label: 'STEM', tags: ['stem', 'science', 'engineering', 'computer_science', 'math', 'research'] },
  { key: 'health', label: 'Health & nursing', tags: ['healthcare', 'nursing'] },
  { key: 'business', label: 'Business', tags: ['business', 'finance', 'entrepreneurship'] },
  { key: 'arts', label: 'Arts', tags: ['arts'] },
  { key: 'writing', label: 'Writing & journalism', tags: ['writing', 'journalism'] },
  { key: 'trades', label: 'Trades', tags: ['trades', 'skilled_trades', 'career_technical', 'construction'] },
  { key: 'environment', label: 'Environment & agriculture', tags: ['environmental', 'environment', 'agriculture'] },
  { key: 'service', label: 'Community service', tags: ['service'] },
  { key: 'leadership', label: 'Leadership', tags: ['leadership'] },
  { key: 'athletics', label: 'Athletics', tags: ['athletics'] },
]

/** The catalogue tags the student's interests stand for. */
export const interestTags = (prefs: AidPrefs): string[] =>
  INTEREST_OPTIONS.filter((o) => prefs.interests.includes(o.key)).flatMap((o) => o.tags)

/** Whether an award is one the student said they want to see. */
export function fitsAidPrefs(
  s: Pick<Scholarship, 'demographic_tags' | 'application_requirements' | 'award_amount_cents' | 'award_amount_note'>,
  prefs: AidPrefs,
): boolean {
  if (prefs.types.length > 0 && !prefs.types.includes(inferScholarshipType(s.demographic_tags))) return false
  if (!meetsMinAward(s, prefs.minAward)) return false
  if (!prefs.essays && needsEssay(s.application_requirements)) return false
  if (!prefs.regional && s.demographic_tags.includes('regional')) return false
  return true
}
