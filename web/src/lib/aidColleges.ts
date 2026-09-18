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
import { collegeGlyph } from './collegeSearch'
import { domainOf } from './collegeLogo'

export interface AidCollege {
  /** `sc-<scorecard_id>`, the same identity Application Tracking uses. */
  id: string
  name: string
  /** Curated glyph where there is one, else the institution-type fallback. */
  emoji: string
  domain: string | null
  /** Display label: "4-year" / "Community college" / "Trade/career". */
  type: string
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

export function aidCollegeFromRow(c: College): AidCollege {
  return {
    id: collegeAppId(c),
    name: c.name,
    emoji: c.emoji ?? collegeGlyph(c),
    domain: domainOf(c.url),
    type: c.institution_type === '2yr' ? 'Community college' : c.institution_type === 'trade' ? 'Trade/career' : '4-year',
    city: c.city,
    state: c.state,
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

const SELECT =
  'id,scorecard_id,name,slug,institution_type,city,state,region,ownership,locale,size,latitude,longitude,' +
  'admit_rate,sat_reading_25,sat_reading_75,sat_math_25,sat_math_75,act_25,act_75,' +
  'avg_net_price_cents,net_price_by_income,cost_of_attendance_cents,cost_out_of_state_cents,programs,' +
  'grad_rate,transfer_rate,median_earnings_10yr_cents,pell_pct,npc_url,url,' +
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
    if (row) colleges.push(aidCollegeFromRow(row))
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
  return ((data ?? []) as unknown as College[]).map(aidCollegeFromRow)
}
