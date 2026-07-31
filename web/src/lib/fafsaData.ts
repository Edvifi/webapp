import { supabase } from './supabase'
import type { Database, Json } from '../types/database'

export type FederalProgram = Database['public']['Tables']['fafsa_federal_programs']['Row']
export type StateProgram = Database['public']['Tables']['fafsa_state_programs']['Row']
export type Scholarship = Database['public']['Tables']['fafsa_scholarships']['Row']
export type GenerousAidSchool = Database['public']['Tables']['fafsa_generous_aid_schools']['Row']
export type TrackerItemRow = Database['public']['Tables']['fafsa_tracker_items']['Row']
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
  deadline: string
  status: TrackerStatus
  type: TrackerType | null
  source: string | null
}

export interface ScholarshipMatchScore {
  total: number
  demographicMatch: number
  eligibilityFit: number
  awardValue: number
  deadlineUrgency: number
  requirementFit: number
  matchedTags: string[]
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
    amount: r.amount_display ?? 'Varies',
    deadline: r.deadline_display ?? 'TBD',
    status: (r.status as TrackerStatus) ?? 'researching',
    type: (r.tracker_type as TrackerType | null) ?? null,
    source: r.source,
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
const FULL_RIDE_RE = /full[- ]?(ride|tuition|cost|need|scholarship|four[- ]?year)|cost of attendance|last[- ]?dollar|room,?\s*board/i

/**
 * A numeric award value in cents for SCORING and SORTING only — never for
 * display. Prefers the real award_amount_cents; otherwise parses the largest
 * dollar figure out of the descriptive note ("range from $1,500 to $6,500" →
 * 650000); recognizes full-ride language and ranks it at the top. Returns null
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
    const matches = note.replace(/,/g, '').match(/\$\s?(\d+(?:\.\d+)?)/g)
    if (matches && matches.length) {
      const max = Math.max(...matches.map((m) => parseFloat(m.replace(/[^0-9.]/g, ''))))
      if (max > 0) return Math.round(max * 100)
    }
    if (FULL_RIDE_RE.test(note)) return 9_000_000 // ~$90k — rank full rides at the top
  }
  return null
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
  } else {
    dollars = nums[0] // "$150,000+" → $150,000
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

export function scoreScholarshipForProfile(
  scholarship: Scholarship,
  userTags: string[],
  userProfile?: { gpa?: number | null; familyIncomeCents?: number | null },
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
  if (scholarship.max_family_income_cents == null) {
    eligibilityFit += 15
  } else if (userProfile?.familyIncomeCents == null) {
    eligibilityFit += 8
  } else if (userProfile.familyIncomeCents <= scholarship.max_family_income_cents) {
    eligibilityFit += 15
  }

  if (scholarship.min_gpa == null) {
    eligibilityFit += 10
  } else if (userProfile?.gpa == null) {
    eligibilityFit += 5
  } else if (userProfile.gpa >= scholarship.min_gpa) {
    eligibilityFit += 10
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

  return { total, demographicMatch, eligibilityFit, awardValue, deadlineUrgency, requirementFit, matchedTags }
}

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
  userProfile?: { gpa?: number | null; familyIncomeCents?: number | null },
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

export async function getTrackerItems(): Promise<TrackerItem[]> {
  if (trackerCache) return trackerCache
  trackerCache = (async () => {
    const userId = await currentUserId()
    const { data, error } = await supabase
      .from('fafsa_tracker_items')
      .select('*')
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
  deadline?: string | null
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
      status: input.status ?? 'researching',
      tracker_type: input.type ?? null,
      source: input.source ?? null,
      scholarship_id: input.scholarshipId ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  invalidateTracker()
  return rowToTracker(data)
}

export interface TrackerEdit {
  name?: string
  amount?: string | null
  deadline?: string | null
  type?: TrackerType | null
}

/** Edit an existing tracker item's details (name / amount / deadline / type). */
export async function updateTrackerItem(id: string, fields: TrackerEdit): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (fields.name !== undefined) patch.name = fields.name
  if (fields.amount !== undefined) patch.amount_display = fields.amount
  if (fields.deadline !== undefined) patch.deadline_display = fields.deadline
  if (fields.type !== undefined) patch.tracker_type = fields.type
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
