import { supabase } from './supabase'
import type { Database, Json } from '../types/database'
import type { AppTask } from '../data/applicationsChecklist'

export type FederalProgram = Database['public']['Tables']['fafsa_federal_programs']['Row']
export type StateProgram = Database['public']['Tables']['fafsa_state_programs']['Row']
export type Scholarship = Database['public']['Tables']['fafsa_scholarships']['Row']
export type GenerousAidSchool = Database['public']['Tables']['fafsa_generous_aid_schools']['Row']
/** The row plus the embedded catalogue fields the tracker select asks for. */
export type TrackerItemRow = Database['public']['Tables']['fafsa_tracker_items']['Row'] & {
  fafsa_scholarships?: Pick<Scholarship, 'url' | 'provider' | 'application_requirements' | 'requires_fafsa' | 'requires_css_profile'> | null
}
export type UserModuleStateRow = Database['public']['Tables']['fafsa_user_module_state']['Row']

export type TrackerStatus = 'researching' | 'planning' | 'ready' | 'submitted' | 'awarded'
export type TrackerType = 'Merit' | 'Need' | 'Local' | 'Identity'
export type ChecklistItemStatus = 'completed' | 'in-progress' | 'available'
export type ChecklistProgressMap = Record<string, ChecklistItemStatus>

export interface TrackerItem {
  id: string
  scholarshipId: string | null
  name: string
  amount: string
  /** What the student reads, e.g. "May 1 (annual)" or "Varies - check official
   *  site". Always present; this is the authoritative human answer. */
  deadline: string
  /** Real calendar date (ISO `YYYY-MM-DD`) when the source knew one, else null.
   *  Only ~1 in 10 catalogue rows has one — the rest are recurring or vague —
   *  so treat null as "no fixed date", never as an error. Exists so date-based
   *  views (calendar, timeline) have something to pin. */
  deadlineDate: string | null
  status: TrackerStatus
  type: TrackerType | null
  source: string | null
  /** From the catalogue row this was saved from, where there is one. A
   *  student's own entry has neither. `source` is not a substitute: it says
   *  how the row reached us ("curated"), not who is behind the money. */
  provider: string | null
  url: string | null
  /** What the catalogue row says to submit; empty for a student's own entry.
   *  The checklist is built from these (see data/scholarshipTasks). */
  requirements: string[]
  requiresFafsa: boolean
  requiresCss: boolean
  /** The student's own checklist, once they have changed it; null until then. */
  tasks: AppTask[] | null
}

export interface ScholarshipMatchScore {
  total: number
  demographicMatch: number
  eligibilityFit: number
  awardValue: number
  deadlineUrgency: number
  requirementFit: number
  matchedTags: string[]
  /** Its deadline has passed. */
  closed: boolean
  /** Something we know about the student rules it out: a cap they miss, or an
   *  award for someone past high school. Unlike a "Fair" fit, not a cap we
   *  merely can't check because a GPA or income was left blank. */
  ruledOut: boolean
}

export interface ScoredScholarship {
  scholarship: Scholarship
  score: ScholarshipMatchScore
}

function rowToTracker(r: TrackerItemRow): TrackerItem {
  return {
    id: r.id,
    scholarshipId: r.scholarship_id,
    name: r.name,
    amount: formatTrackerAmount(r.amount_display ?? 'Varies'),
    deadline: r.deadline_display ?? 'TBD',
    deadlineDate: r.deadline,
    status: (r.status as TrackerStatus) ?? 'researching',
    type: (r.tracker_type as TrackerType | null) ?? null,
    source: r.source,
    provider: r.fafsa_scholarships?.provider ?? null,
    url: r.fafsa_scholarships?.url ?? null,
    requirements: r.fafsa_scholarships?.application_requirements ?? [],
    requiresFafsa: r.fafsa_scholarships?.requires_fafsa ?? false,
    requiresCss: r.fafsa_scholarships?.requires_css_profile ?? false,
    tasks: Array.isArray(r.tasks) ? (r.tasks as unknown as AppTask[]) : null,
  }
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Not authenticated')
  return data.user.id
}

/* ─────────────  Read caching  ─────────────
 * Reference data (federal/state programs, scholarships, schools) never changes
 * within a session, so it's cached for the page lifetime and concurrent reads
 * are de-duplicated. User-scoped reads (module state, tracker) are cached too —
 * so re-opening the module is instant instead of re-fetching — but invalidated
 * whenever we write. Rejections are never cached. All state is module-level, so
 * a full page reload clears everything. */
const refCache = new Map<string, Promise<unknown>>()
function refCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = refCache.get(key) as Promise<T> | undefined
  if (hit) return hit
  const p = fetcher()
  p.catch(() => refCache.delete(key))
  refCache.set(key, p)
  return p
}

let moduleStateCache: Promise<UserModuleStateRow | null> | null = null
function invalidateModuleState() { moduleStateCache = null }

let trackerCache: Promise<TrackerItem[]> | null = null
function invalidateTracker() { trackerCache = null }

/**
 * Drop every per-user cache. These live at module scope, so without this the
 * next person to sign in on the same tab would be served the previous
 * student's tracked scholarships and college list.
 */
export function clearFafsaCaches() {
  trackerCache = null
  moduleStateCache = null
}

export async function getFederalPrograms(): Promise<FederalProgram[]> {
  return refCached('federal_programs', async () => {
    const { data, error } = await supabase
      .from('fafsa_federal_programs')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) throw error
    return data ?? []
  })
}

export async function getStatePrograms(stateCode: string): Promise<StateProgram[]> {
  const code = stateCode.toUpperCase()
  return refCached(`state_programs:${code}`, async () => {
    const { data, error } = await supabase
      .from('fafsa_state_programs')
      .select('*')
      .eq('state_code', code)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return data ?? []
  })
}

export async function getScholarships(tags?: string[]): Promise<Scholarship[]> {
  return refCached(`scholarships:${(tags ?? []).join(',')}`, async () => {
    // Only show published rows. RLS already enforces this, but filtering here
    // keeps the intent explicit and independent of the policy. Ingested rows
    // (source='careeronestop') land as published and appear automatically.
    let query = supabase.from('fafsa_scholarships').select('*').eq('status', 'published')
    if (tags && tags.length > 0) {
      query = query.overlaps('demographic_tags', tags)
    }
    const { data, error } = await query.order('sort_order', { ascending: true })
    if (error) throw error
    return data ?? []
  })
}

export async function getScholarship(id: string): Promise<Scholarship | null> {
  return refCached(`scholarship:${id}`, async () => {
    const { data, error } = await supabase
      .from('fafsa_scholarships')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  })
}

export async function getGenerousAidSchools(): Promise<GenerousAidSchool[]> {
  return refCached('generous_aid_schools', async () => {
    const { data, error } = await supabase
      .from('fafsa_generous_aid_schools')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) throw error
    return data ?? []
  })
}

export const US_STATES: Array<{ code: string; name: string }> = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
]

/** The tracker's four kinds, read off a catalogue row's tags. */
export function inferScholarshipType(tags: string[]): TrackerType {
  const t = new Set(tags)
  const identity = ['hispanic', 'latino', 'black', 'asian_pacific_islander', 'native_american', 'lgbtq', 'muslim', 'catholic', 'jewish', 'minority', 'immigrant', 'undocumented', 'daca', 'foster_youth', 'military_family']
  if (identity.some((x) => t.has(x))) return 'Identity'
  const need = ['financial_need', 'pell_eligible', 'low_income', 'single_parent', 'adversity']
  if (need.some((x) => t.has(x))) return 'Need'
  // Local means limited to a place, which is what the catalogue's 'regional'
  // tag marks. It used to come from 'rural' and 'military_family', which put
  // national awards (4-H, FFA, Folds of Honor) under Local.
  if (t.has('regional')) return 'Local'
  return 'Merit'
}

export function demographicTagsForProfile(d: {
  hispanic?: string | null
  native_american?: string | null
  race?: string | null
  income_level?: string | null
  parent_education?: string | null
  parent_immigrants?: string | null
}): string[] {
  const tags: string[] = []
  if (d.hispanic === 'yes') {
    tags.push('hispanic', 'latino')
  }
  if (d.native_american === 'yes') {
    tags.push('native_american')
  }
  const race = (d.race ?? '').toLowerCase()
  if (race.includes('black') || race.includes('african')) tags.push('black')
  if (race.includes('asian') || race.includes('pacific')) tags.push('asian_pacific_islander')
  if (d.income_level && /^(<|under|less)/i.test(d.income_level)) {
    tags.push('low_income', 'pell_eligible', 'financial_need')
  }
  if (d.parent_education && /no high school|none|grade school/i.test(d.parent_education)) {
    tags.push('first_gen', 'financial_need')
  }
  if (d.parent_immigrants === 'yes') {
    tags.push('immigrant')
  }
  return tags
}

export function parseDeadlineDaysFromNow(
  deadlineDisplay: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!deadlineDisplay) return null
  const trimmed = deadlineDisplay.trim().toLowerCase()
  if (['rolling', 'varies', 'tbd', 'n/a', 'ongoing'].includes(trimmed)) return null
  const parsed = new Date(deadlineDisplay)
  if (isNaN(parsed.getTime())) return null
  return Math.ceil((parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Whole days until a scholarship's deadline (negative = past, null = no fixed
 * date). Prefers the real `deadline` date column — populated for ingested rows
 * and for curated rows with an unambiguous date — and falls back to parsing the
 * free-text `deadline_display` for everything else.
 */
export function scholarshipDaysLeft(
  scholarship: Pick<Scholarship, 'deadline' | 'deadline_display'>,
  now: Date = new Date(),
): number | null {
  if (scholarship.deadline) {
    // Interpret the date-only value in local time to avoid an off-by-one at
    // timezone boundaries.
    const d = new Date(`${scholarship.deadline}T00:00:00`)
    if (!isNaN(d.getTime())) {
      return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }
  }
  return parseDeadlineDaysFromNow(scholarship.deadline_display, now)
}

// Notes that describe a full-ride / full-need award with no explicit dollar
// figure. These are among the most valuable awards, so they must not score as
// "unknown" — we give them a high representative value for ranking only.
// A figure that is the program's total, not one award.
const POOL_BEFORE = /totall?ing\s*$/i
const POOL_AFTER = /^(?:\s*(?:million|m)\b)?\+?\s*(?:total\s+(?:annually|in)\b|in\s+(?:total\s+|cash\s+)?(?:scholarships|awards|prizes|grants|funding))/i

const FULL_RIDE_RE = /full[- ]?(ride|tuition|cost|need|scholarship|four[- ]?year)|cost of attendance|last[- ]?dollar|room,?\s*board/i

/**
 * A numeric award value in cents for SCORING and SORTING only — never for
 * display. Prefers the real award_amount_cents; otherwise parses the largest
 * dollar figure out of the descriptive note ("range from $1,500 to $6,500" →
 * 650000), skipping a program's whole pot ("$400,000 in scholarships", "150
 * prizes totaling $100,000"), which no one student wins; recognizes full-ride
 * language and ranks it at the top. Returns null
 * for genuinely non-monetary entries ("recognition only"). Display keeps using
 * the descriptive note via formatScholarshipAmount, so no fabricated single
 * figure is ever shown to students.
 */
export function scholarshipAwardValueCents(
  s: Pick<Scholarship, 'award_amount_cents' | 'award_amount_note'>,
): number | null {
  if (s.award_amount_cents && s.award_amount_cents > 0) return s.award_amount_cents
  const note = s.award_amount_note
  if (note) {
    const text = note.replace(/,/g, '')
    const amounts = [...text.matchAll(/\$\s?(\d+(?:\.\d+)?)/g)]
      .filter((m) => !POOL_BEFORE.test(text.slice(0, m.index)) && !POOL_AFTER.test(text.slice(m.index + m[0].length)))
      .map((m) => parseFloat(m[1]))
    const max = Math.max(0, ...amounts)
    if (max > 0) return Math.round(max * 100)
    if (FULL_RIDE_RE.test(note)) return 9_000_000 // ~$90k — rank full rides at the top
  }
  return null
}

/**
 * The first dollar amount in a tracker item's free-text amount, in dollars:
 * "$2,500" → 2500, "$5K" → 5000, "Awards range from $5,000 to $25,000" → 5000
 * (a range counts at its low end), "Varies" → null.
 */
export function parseTrackerAmount(display: string): number | null {
  const m = display?.trim().match(/(?:^|\$)\s*(\d[\d,]*(?:\.\d+)?)\s*([kK])?/)
  if (!m) return null
  const n = parseFloat(m[1].replace(/,/g, ''))
  return m[2] ? n * 1000 : n
}

/**
 * A tracker amount as the student reads it. A bare figure, as a student types
 * it into their own entry ("1000", "$500", "2,500"), shows as dollars
 * ("$1,000"); anything else ("$5K", "Varies", a provider's sentence) as written.
 */
export function formatTrackerAmount(text: string): string {
  const m = /^\s*\$?\s*(\d[\d,]*(?:\.\d+)?)\s*$/.exec(text)
  return m ? `$${Number(m[1].replace(/,/g, '')).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : text
}

/** Minimum-award filter steps, in dollars. 0 = any amount. */
export const AWARD_MINIMUMS = [0, 1000, 5000, 10000] as const

/**
 * Whether a scholarship clears a minimum award. Judged on the same value the
 * amount sort uses, so a range ("$1,500 to $6,500") counts at its top and a
 * full ride clears every step. An award with no stated amount cannot be shown
 * to clear a minimum, so it drops out once one is set.
 */
export function meetsMinAward(
  s: Pick<Scholarship, 'award_amount_cents' | 'award_amount_note'>,
  minDollars: number,
): boolean {
  if (minDollars <= 0) return true
  const cents = scholarshipAwardValueCents(s)
  return cents != null && cents >= minDollars * 100
}

export function parseIncomeToRange(incomeLevel: string | null | undefined): number | null {
  if (!incomeLevel) return null
  const nums = (incomeLevel.match(/[\d,]+/g) ?? [])
    .map((n) => parseInt(n.replace(/,/g, ''), 10))
    .filter((n) => !isNaN(n))
  if (nums.length === 0) return null
  let dollars: number
  if (nums.length >= 2) {
    dollars = (nums[0] + nums[1]) / 2 // midpoint of a band, e.g. "$30k–$60k" → $45k
  } else if (/^\s*(under|less|below|<)/i.test(incomeLevel)) {
    dollars = nums[0] / 2 // "Under $30,000" → ~$15,000
  } else if (/\+\s*$/.test(incomeLevel.trim())) {
    // An open top band ("$110,000+") is above its floor, not at it; read at
    // the floor, every top-band family passed a $110k scholarship income cap.
    // Mirrors parseIncomeCents in collegeMatch.ts.
    dollars = nums[0] * 1.25
  } else {
    dollars = nums[0]
  }
  return Math.round(dollars * 100)
}

/** Parse a user-entered GPA string (e.g. "3.7", "3.7/4.0") to a number, or null. */
export function parseGpa(gpa: string | null | undefined): number | null {
  if (!gpa) return null
  const m = gpa.match(/\d+(\.\d+)?/)
  if (!m) return null
  const val = parseFloat(m[0])
  if (isNaN(val) || val < 0 || val > 6) return null
  return val
}

/**
 * Tags for awards meant for people past high school: parents supporting a
 * household, adults going back to school, students transferring between
 * colleges. Unlike a topic tag ("stem"), each one limits who may apply, and
 * nothing in a high-school student's profile gives them one.
 */
const PAST_HIGH_SCHOOL_TAGS = ['single_parent', 'adult_learner', 'returning_student', 'transfer']

const GRADE_WORDS: Record<string, number> = { freshman: 9, freshmen: 9, sophomore: 10, sophomores: 10, junior: 11, juniors: 11, senior: 12, seniors: 12 }
const GRADE_WORD = '(?:freshm[ae]n|sophomores?|juniors?|seniors?)'
const GRADE_LIST = new RegExp(`\\b(?:high school|graduating)\\s+(${GRADE_WORD}(?:\\s*(?:,|/|&|\\band\\b|\\bor\\b)\\s*${GRADE_WORD})*)`, 'gi')
const GRADE_RANGE = /\bgrades?\s+(K|\d{1,2})\s*[-–]\s*(\d{1,2})\b/i

/**
 * The high-school grades (9–12) an award is open to, read from its
 * eligibility text, or null when the text names none. The catalogue keeps no
 * grade field, so a sophomore-and-junior contest was a senior's "Closes soon"
 * pick. Only plain high-school wording counts ("High school juniors and
 * seniors", "graduating seniors", "grades 10-12"); "rising college juniors",
 * a passing "including high school seniors", and "seniors … not eligible" say
 * nothing about who in high school may apply, so they are left alone.
 * ponytail: phrase matching over free text; a grade column in
 * fafsa_scholarships would replace it.
 */
export function highSchoolGrades(summary: string | null | undefined): Set<number> | null {
  if (!summary) return null
  const range = summary.match(GRADE_RANGE)
  if (range) {
    const from = range[1].toUpperCase() === 'K' ? 0 : Number(range[1])
    const to = Number(range[2])
    if (to >= 9 && to <= 12) return new Set([9, 10, 11, 12].filter((g) => g >= from && g <= to))
  }
  const grades = new Set<number>()
  for (const m of summary.matchAll(GRADE_LIST)) {
    const before = summary.slice(Math.max(0, m.index - 25), m.index)
    const after = summary.slice(m.index + m[0].length, m.index + m[0].length + 40)
    if (/\b(including|some)\b/i.test(before) || /not eligible/i.test(after)) continue
    for (const w of m[1].match(new RegExp(GRADE_WORD, 'gi')) ?? []) grades.add(GRADE_WORDS[w.toLowerCase()])
  }
  return grades.size > 0 ? grades : null
}

export function scoreScholarshipForProfile(
  scholarship: Scholarship,
  userTags: string[],
  userProfile?: { gpa?: number | null; familyIncomeCents?: number | null; grade?: number | null },
  now?: Date,
): ScholarshipMatchScore {
  const currentDate = now ?? new Date()
  const userTagSet = new Set(userTags)

  let demographicMatch: number
  let matchedTags: string[]
  if (scholarship.demographic_tags.length === 0) {
    demographicMatch = 20
    matchedTags = []
  } else {
    matchedTags = scholarship.demographic_tags.filter((t) => userTagSet.has(t))
    const ratio = matchedTags.length / scholarship.demographic_tags.length
    demographicMatch = Math.round(ratio * 40)
  }

  let eligibilityFit = 0
  let ruledOut = false
  if (scholarship.max_family_income_cents == null) {
    eligibilityFit += 15
  } else if (userProfile?.familyIncomeCents == null) {
    eligibilityFit += 8
  } else if (userProfile.familyIncomeCents <= scholarship.max_family_income_cents) {
    eligibilityFit += 15
  } else {
    ruledOut = true
  }

  if (scholarship.min_gpa == null) {
    eligibilityFit += 10
  } else if (userProfile?.gpa == null) {
    eligibilityFit += 5
  } else if (userProfile.gpa >= scholarship.min_gpa) {
    eligibilityFit += 10
  } else {
    ruledOut = true
  }
  // Ruled out, as when both caps are missed: a single mother's award was the
  // Scholarship Engine's "Closes soon" pick for a 17-year-old.
  const grades = userProfile?.grade != null ? highSchoolGrades(scholarship.eligibility_summary) : null
  if (scholarship.demographic_tags.some((t) => PAST_HIGH_SCHOOL_TAGS.includes(t) && !userTagSet.has(t))
    || (grades && !grades.has(userProfile!.grade!))) {
    eligibilityFit = 0
    ruledOut = true
  }

  let awardValue: number
  const cents = scholarshipAwardValueCents(scholarship)
  if (cents == null) awardValue = 4
  else if (cents >= 1_000_000) awardValue = 15
  else if (cents >= 500_000) awardValue = 12
  else if (cents >= 200_000) awardValue = 9
  else if (cents >= 50_000) awardValue = 6
  else awardValue = 3

  let deadlineUrgency: number
  const days = scholarshipDaysLeft(scholarship, currentDate)
  if (days == null) {
    deadlineUrgency = 3
  } else if (days < 0) {
    deadlineUrgency = 0
  } else if (days <= 30) {
    deadlineUrgency = 10
  } else if (days <= 60) {
    deadlineUrgency = 8
  } else if (days <= 90) {
    deadlineUrgency = 6
  } else if (days <= 180) {
    deadlineUrgency = 4
  } else {
    deadlineUrgency = 2
  }

  let requirementFit = 0
  const needTags = ['financial_need', 'pell_eligible', 'low_income']
  if (scholarship.requires_fafsa && needTags.some((t) => userTagSet.has(t))) {
    requirementFit += 5
  }
  if (scholarship.application_requirements.length <= 2) {
    requirementFit += 5
  } else if (scholarship.application_requirements.length <= 4) {
    requirementFit += 3
  }

  const total = Math.min(100, demographicMatch + eligibilityFit + awardValue + deadlineUrgency + requirementFit)

  return { total, demographicMatch, eligibilityFit, awardValue, deadlineUrgency, requirementFit, matchedTags, closed: days != null && days < 0, ruledOut }
}

export type MatchStrength = 'strong' | 'good' | 'fair'
/** Best first, for sorting. */
export const MATCH_STRENGTH_RANK: Record<MatchStrength, number> = { strong: 0, good: 1, fair: 2 }

/**
 * How well a scholarship fits the student, judged only on what is about them.
 * Strong: it matches something they told us (their background or an
 * interest) and nothing known rules them out. Fair: an income or GPA cap
 * stands in the way, one they miss or we can't check, or the award is for
 * someone past high school. Good: everything else.
 *
 * The total score also counts award size and how soon it closes, which say
 * nothing about fit; banded on the total, nearly every award came out "Good".
 * An unmatched tag is no mark against an award: most are topics ("stem",
 * "leadership", "merit") open to anyone, not limits on who may apply.
 */
export function matchStrength(score: Pick<ScholarshipMatchScore, 'eligibilityFit' | 'matchedTags'>): MatchStrength {
  if (score.eligibilityFit < 25) return 'fair'
  return score.matchedTags.length > 0 ? 'strong' : 'good'
}

/**
 * "Best match" order: open awards first, then the better fit, then the higher
 * score. On fit alone a closed award aimed at the student's interests ranked
 * third, under its own "Closed" badge.
 */
export const compareMatches = (a: ScoredScholarship, b: ScoredScholarship): number =>
  Number(a.score.closed) - Number(b.score.closed)
  || MATCH_STRENGTH_RANK[matchStrength(a.score)] - MATCH_STRENGTH_RANK[matchStrength(b.score)]
  || b.score.total - a.score.total

const TAG_LABELS: Record<string, string> = {
  first_gen: 'first-generation students',
  financial_need: 'financial need',
  low_income: 'lower-income families',
  pell_eligible: 'Pell-eligible students',
  military_family: 'military families',
  asian_pacific_islander: 'Asian & Pacific Islander students',
  lgbtq: 'LGBTQ+ students',
  stem: 'STEM',
  computer_science: 'computer science',
  first_generation: 'first-generation students',
}
function humanizeTag(tag: string): string {
  return TAG_LABELS[tag] ?? tag.replace(/_/g, ' ')
}

/**
 * Plain-language reasons this scholarship is a good fit for the student, built
 * from the same signals the score uses. Ordered most-compelling first. Empty
 * when nothing specific matches (a generic scholarship for an unknown profile).
 */
export function scholarshipMatchReasons(
  scholarship: Scholarship,
  score: ScholarshipMatchScore,
  userProfile?: { gpa?: number | null; familyIncomeCents?: number | null },
  now?: Date,
): string[] {
  const reasons: string[] = []

  if (score.matchedTags.length > 0) {
    const labels = score.matchedTags.slice(0, 4).map(humanizeTag)
    reasons.push(`Aimed at ${labels.join(', ')}`)
  }
  if (scholarship.min_gpa != null && userProfile?.gpa != null && userProfile.gpa >= scholarship.min_gpa) {
    reasons.push(`You meet the ${scholarship.min_gpa.toFixed(1)} GPA minimum`)
  }
  if (
    scholarship.max_family_income_cents != null &&
    userProfile?.familyIncomeCents != null &&
    userProfile.familyIncomeCents <= scholarship.max_family_income_cents
  ) {
    reasons.push('Your family income is within its limit')
  }

  const days = scholarshipDaysLeft(scholarship, now)
  if (days != null && days >= 0 && days <= 30) {
    reasons.push(days === 0 ? 'Deadline is today' : `Deadline in ${days} day${days === 1 ? '' : 's'}`)
  }

  const value = scholarshipAwardValueCents(scholarship)
  if (value != null && value >= 2_000_000) reasons.push('High-value award')

  const reqs = scholarship.application_requirements.length
  if (reqs > 0 && reqs <= 2) reasons.push('Only a couple of requirements to apply')

  return reasons
}

export async function getAllScholarshipsScored(
  userTags: string[],
  userProfile?: { gpa?: number | null; familyIncomeCents?: number | null; grade?: number | null },
): Promise<ScoredScholarship[]> {
  const scholarships = await getScholarships()
  return scholarships
    .map((scholarship) => ({
      scholarship,
      score: scoreScholarshipForProfile(scholarship, userTags, userProfile),
    }))
    .sort((a, b) => b.score.total - a.score.total)
}

export function formatAmount(cents: number | null, note: string | null): string {
  if (note) return note
  if (cents == null) return 'Varies'
  const dollars = cents / 100
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(dollars % 1000 === 0 ? 0 : 1)}K`
  return `$${dollars.toFixed(0)}`
}

/* ─────────────  Ingestion health (admin-only) ───────────── */

export type IngestRun = Database['public']['Tables']['fafsa_scholarship_ingest_runs']['Row']

export interface IngestHealth {
  last_run_at: string | null
  last_run_status: string | null
  last_success_at: string | null
  runs_total: number
  ingested_published: number
  ingested_archived: number
}

/** Ingestion health summary. Returns null for non-admins (RPC denies them). */
export async function getIngestHealth(): Promise<IngestHealth | null> {
  const { data, error } = await supabase.rpc('get_scholarship_ingest_health')
  if (error || !data) return null
  return data as unknown as IngestHealth
}

/** Recent ingestion runs, newest first. Returns [] for non-admins. */
export async function getIngestRuns(limit = 20): Promise<IngestRun[]> {
  const { data, error } = await supabase.rpc('get_scholarship_ingest_runs', { p_limit: limit })
  if (error || !data) return []
  return data as IngestRun[]
}

/* ─────────────  Tracker CRUD  ───────────── */

const TRACKER_SELECT = '*, fafsa_scholarships(url, provider, application_requirements, requires_fafsa, requires_css_profile)'

export async function getTrackerItems(): Promise<TrackerItem[]> {
  if (trackerCache) return trackerCache
  trackerCache = (async () => {
    const userId = await currentUserId()
    const { data, error } = await supabase
      .from('fafsa_tracker_items')
      // The catalogue holds where to apply and who funds it; the tracker row
      // holds neither. Embedded rather than fetched separately so opening a
      // scholarship costs nothing.
      .select(TRACKER_SELECT)
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(rowToTracker)
  })()
  trackerCache.catch(() => { trackerCache = null })
  return trackerCache
}

export interface NewTrackerInput {
  name: string
  amount?: string | null
  /** Display text shown to the student. */
  deadline?: string | null
  /** Real date (ISO `YYYY-MM-DD`) when the catalogue row has one. Pass it
   *  through — dropping it is what previously kept scholarships off the
   *  calendar, and it cannot be recovered later for custom entries. */
  deadlineDate?: string | null
  status?: TrackerStatus
  type?: TrackerType | null
  source?: string | null
  scholarshipId?: string | null
}

export async function addTrackerItem(input: NewTrackerInput): Promise<TrackerItem> {
  const userId = await currentUserId()
  const { data, error } = await supabase
    .from('fafsa_tracker_items')
    .insert({
      user_id: userId,
      name: input.name,
      amount_display: input.amount ?? null,
      deadline_display: input.deadline ?? null,
      deadline: input.deadlineDate ?? null,
      status: input.status ?? 'researching',
      tracker_type: input.type ?? null,
      source: input.source ?? null,
      scholarship_id: input.scholarshipId ?? null,
    })
    // With the catalogue fields, so a just-added item has its link and checklist.
    .select(TRACKER_SELECT)
    .single()
  if (error) throw error
  invalidateTracker()
  return rowToTracker(data)
}

export interface TrackerEdit {
  name?: string
  amount?: string | null
  deadline?: string | null
  deadlineDate?: string | null
  type?: TrackerType | null
  tasks?: AppTask[] | null
}

/** Edit an existing tracker item's details (name / amount / deadline / type / checklist). */
export async function updateTrackerItem(id: string, fields: TrackerEdit): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (fields.name !== undefined) patch.name = fields.name
  if (fields.amount !== undefined) patch.amount_display = fields.amount
  if (fields.deadline !== undefined) patch.deadline_display = fields.deadline
  if (fields.deadlineDate !== undefined) patch.deadline = fields.deadlineDate
  if (fields.type !== undefined) patch.tracker_type = fields.type
  if (fields.tasks !== undefined) patch.tasks = fields.tasks
  const { error } = await supabase.from('fafsa_tracker_items').update(patch).eq('id', id)
  if (error) throw error
  invalidateTracker()
}

export async function updateTrackerStatus(id: string, status: TrackerStatus): Promise<void> {
  const { error } = await supabase
    .from('fafsa_tracker_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  invalidateTracker()
}

export async function removeTrackerItem(id: string): Promise<void> {
  const { error } = await supabase.from('fafsa_tracker_items').delete().eq('id', id)
  if (error) throw error
  invalidateTracker()
}

export async function updateTrackerNotes(id: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from('fafsa_tracker_items')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  invalidateTracker()
}

export async function getTrackerNotes(id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('fafsa_tracker_items')
    .select('notes')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data?.notes ?? null
}

/* ─────────────  Module state (checklist, etc.)  ───────────── */

export async function getModuleState(): Promise<UserModuleStateRow | null> {
  if (moduleStateCache) return moduleStateCache
  moduleStateCache = (async () => {
    const userId = await currentUserId()
    const { data, error } = await supabase
      .from('fafsa_user_module_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data
  })()
  moduleStateCache.catch(() => { moduleStateCache = null })
  return moduleStateCache
}

export async function getChecklistProgress(): Promise<ChecklistProgressMap> {
  const row = await getModuleState()
  if (!row) return {}
  return (row.checklist_progress as ChecklistProgressMap) ?? {}
}

export async function setChecklistItem(
  itemId: string,
  status: ChecklistItemStatus,
): Promise<ChecklistProgressMap> {
  const userId = await currentUserId()
  const existing = await getModuleState()
  const currentProgress = ((existing?.checklist_progress as ChecklistProgressMap) ?? {}) as ChecklistProgressMap
  const nextProgress: ChecklistProgressMap = { ...currentProgress, [itemId]: status }

  const { error } = await supabase
    .from('fafsa_user_module_state')
    .upsert({
      user_id: userId,
      checklist_progress: nextProgress as unknown as Json,
      updated_at: new Date().toISOString(),
    })
  if (error) throw error
  invalidateModuleState()
  return nextProgress
}

/* ─────────────  College list & NPC runs  ───────────── */

export interface NpcRun {
  estimatedAid: number
  dateRun: string
  status: 'estimated' | 'verified'
}

export async function getCollegeList(): Promise<string[]> {
  const row = await getModuleState()
  if (!row) return []
  return (row.college_list as string[] | null) ?? []
}

export async function setCollegeList(collegeIds: string[]): Promise<void> {
  const userId = await currentUserId()
  const { error } = await supabase
    .from('fafsa_user_module_state')
    .upsert({
      user_id: userId,
      college_list: collegeIds as unknown as Json,
      updated_at: new Date().toISOString(),
    })
  if (error) throw error
  invalidateModuleState()
}

export async function getNpcRuns(): Promise<Record<string, NpcRun>> {
  const row = await getModuleState()
  if (!row) return {}
  return (row.npc_runs as Record<string, NpcRun> | null) ?? {}
}

export async function saveNpcRun(collegeId: string, run: NpcRun): Promise<void> {
  const userId = await currentUserId()
  const existing = await getModuleState()
  const currentRuns = ((existing?.npc_runs as unknown as Record<string, NpcRun>) ?? {}) as Record<string, NpcRun>
  const nextRuns: Record<string, NpcRun> = { ...currentRuns, [collegeId]: run }

  const { error } = await supabase
    .from('fafsa_user_module_state')
    .upsert({
      user_id: userId,
      npc_runs: nextRuns as unknown as Json,
      updated_at: new Date().toISOString(),
    })
  if (error) throw error
  invalidateModuleState()
}
