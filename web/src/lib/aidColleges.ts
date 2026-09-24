/**
 * The Financial Aid module's view of a college.
 *
 * Aid previously searched a 46-school static array, so a student outside that
 * list could not add their own school to the deadline or aid comparison at all.
 * It now draws from the same `colleges` table as Discover (~6,300 schools), and
 * the hand-curated editorial fields — real EA/ED/RD dates, FAFSA and CSS
 * deadlines, the full-need and no-loan flags — are whatever the row happens to
 * carry. Only 46 rows carry them, so every curated field here is nullable and
 * the UI has to render without them.
 */

import { supabase } from './supabase'
import { collegeAppId, type College } from './collegeMatch'
import { collegeGlyph, SEARCH_COLS } from './collegeSearch'
import { domainOf } from './collegeLogo'

export interface AidCollege {
  /**
   * The id exactly as it appears in the student's saved list. Anything the UI
   * hands back to a mutation — remove, an NPC run, the out-of-state toggle —
   * must use this, or it will not match what is stored. Lists saved before
   * curation moved into the table hold slugs like 'ucla'.
   */
  id: string
  /** `sc-<scorecard_id>`: the same identity Application Tracking uses, and the
   *  only safe way to tell whether two differently-saved ids are one school. */
  canonicalId: string
  name: string
  /** Curated glyph where there is one, else the institution-type fallback. */
  emoji: string
  domain: string | null
  /** Display label: "4-year" / "Community college" / "Trade/career". */
  type: string
  /**
   * "Public" / "Private" / "For-profit". Separate from `type`, which describes
   * the programme length. Out-of-state cost only means anything for a public
   * school, so this — not `type` — decides whether that toggle appears.
   */
  control: string
  isPublic: boolean
  city: string | null
  state: string | null
  npcUrl: string | null
  costOfAttendance: number | null
  costOutOfState: number | null
  /** Curated. Every field is null for a school nobody has curated. */
  applicationDeadlines: {
    earlyAction: string | null
    earlyDecision: string | null
    regularDecision: string | null
  }
  financialAidDeadlines: {
    fafsaPriority: string | null
    cssProfile: string | null
    aidNotification: string | null
  }
  meetsFullNeed: boolean
  noLoanPolicy: boolean
  /** True when this row has hand-checked deadlines, so the UI can say so. */
  curated: boolean
}

const centsToDollars = (v: number | null): number | null => (v === null ? null : Math.round(v / 100))

export function aidCollegeFromRow(c: College, savedId?: string): AidCollege {
  const canonicalId = collegeAppId(c)
  return {
    id: savedId ?? canonicalId,
    canonicalId,
    name: c.name,
    emoji: c.emoji ?? collegeGlyph(c),
    domain: domainOf(c.url),
    type: c.institution_type === '2yr' ? 'Community college' : c.institution_type === 'trade' ? 'Trade/career' : '4-year',
    city: c.city,
    state: c.state,
    control: c.ownership === 'public' ? 'Public' : c.ownership === 'private_forprofit' ? 'For-profit' : 'Private',
    isPublic: c.ownership === 'public',
    npcUrl: c.npc_url,
    costOfAttendance: centsToDollars(c.cost_of_attendance_cents),
    costOutOfState: centsToDollars(c.cost_out_of_state_cents),
    applicationDeadlines: {
      earlyAction: c.early_action,
      earlyDecision: c.early_decision,
      regularDecision: c.regular_decision,
    },
    financialAidDeadlines: {
      fafsaPriority: c.fafsa_priority,
      cssProfile: c.css_profile,
      aidNotification: c.aid_notification,
    },
    // A missing flag is not a claim that the school fails to meet need — it is
    // that nobody has checked. Both render as "no badge", never as a negative.
    meetsFullNeed: c.meets_full_need === true,
    noLoanPolicy: c.no_loan_policy === true,
    curated: c.curated_at !== null,
  }
}

// Base columns from the shared college search, plus the curated fields only this
// module reads. Extending the shared constant rather than restating it keeps the
// two from drifting.
const SELECT = `${SEARCH_COLS},cost_out_of_state_cents,` +
  'legacy_slug,emoji,early_action,early_decision,regular_decision,' +
  'fafsa_priority,css_profile,aid_notification,meets_full_need,no_loan_policy,curated_at'

export interface AidCollegeResolution {
  colleges: AidCollege[]
  /**
   * Saved ids that matched no row. The previous implementation did
   * `ids.map(getCollegeById).filter(Boolean)`, so an unknown id vanished and the
   * student's school silently disappeared from their own list. Returning them
   * lets the caller say so instead.
   */
  unresolved: string[]
}

/**
 * Resolve saved ids, which come in two shapes: `sc-<scorecard_id>` from the DB,
 * and bare slugs like 'harvard' saved before curation moved into the table.
 * Both are looked up in one round trip; order follows `ids`.
 */
export async function fetchAidColleges(ids: string[]): Promise<AidCollegeResolution> {
  if (ids.length === 0) return { colleges: [], unresolved: [] }

  const scorecardIds = ids.flatMap((id) => {
    if (!id.startsWith('sc-')) return []
    const n = Number(id.slice(3))
    return Number.isFinite(n) ? [n] : []
  })
  const slugs = ids.filter((id) => !id.startsWith('sc-'))

  const filters = [
    scorecardIds.length ? `scorecard_id.in.(${scorecardIds.join(',')})` : null,
    slugs.length ? `legacy_slug.in.(${slugs.join(',')})` : null,
  ].filter(Boolean) as string[]

  const { data, error } = await supabase.from('colleges').select(SELECT).or(filters.join(','))
  // Rejecting rather than returning [] keeps an outage from rendering as "your
  // list is empty", which would look like data loss to a student.
  if (error) throw new Error(`Failed to load your colleges: ${error.message}`)

  const rows = (data ?? []) as unknown as College[]
  const bySc = new Map(rows.map((r) => [collegeAppId(r), r]))
  const bySlug = new Map(rows.flatMap((r) => (r.legacy_slug ? [[r.legacy_slug, r] as const] : [])))

  const colleges: AidCollege[] = []
  const unresolved: string[] = []
  for (const id of ids) {
    const row = id.startsWith('sc-') ? bySc.get(id) : bySlug.get(id)
    if (row) colleges.push(aidCollegeFromRow(row, id))
    else unresolved.push(id)
  }
  return { colleges, unresolved }
}

/** Name search across the whole table, shaped for the aid module. */
export async function searchAidColleges(query: string, limit = 8): Promise<AidCollege[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const { data, error } = await supabase
    .from('colleges')
    .select(SELECT)
    .eq('status', 'published')
    .in('institution_type', ['4yr', '2yr', 'trade'])
    .ilike('name', `%${q}%`)
    .order('size', { ascending: false, nullsFirst: false })
    .limit(limit)
  if (error) throw new Error(`College search failed: ${error.message}`)
  // Not point-free: `.map(aidCollegeFromRow)` would feed the array index into
  // `savedId`. Search results have no saved id — the canonical one is used,
  // and becomes the saved id if the student adds the school.
  return ((data ?? []) as unknown as College[]).map((r) => aidCollegeFromRow(r))
}
