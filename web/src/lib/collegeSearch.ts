/**
 * Queries over the full colleges table: name search (undergrad targets only),
 * saved-list lookups, and locations for the list map. Draws from the same
 * ~6,300-school source as Discover instead of the legacy 46-row static list.
 */
import { supabase } from './supabase'
import type { College } from './collegeMatch'

/**
 * Shared so the two query sites cannot drift. Both cast the result to `College`,
 * and a column missing from one list is `undefined` at runtime while the type
 * still claims `string | null` — a divergence nothing would catch.
 */
export const SEARCH_COLS =
  'id,scorecard_id,name,slug,institution_type,city,state,region,ownership,locale,size,latitude,longitude,' +
  'admit_rate,sat_reading_25,sat_reading_75,sat_math_25,sat_math_75,act_25,act_75,' +
  'avg_net_price_cents,net_price_by_income,cost_of_attendance_cents,programs,grad_rate,' +
  'transfer_rate,median_earnings_10yr_cents,pell_pct,npc_url,url'

/**
 * These reject rather than returning [] on failure. An empty array is a real
 * answer ("no school matches that name"), so collapsing errors into it would
 * render a database outage as a confident "no results". Callers decide how to
 * surface the difference.
 */

/** Fetch full College rows for a set of scorecard_ids (for scoring the saved list). */
export async function fetchCollegesByScorecardIds(ids: number[]): Promise<College[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('colleges')
    .select(SEARCH_COLS)
    .in('scorecard_id', ids)
  if (error) throw new Error(`Failed to load colleges: ${error.message}`)
  return (data ?? []) as unknown as College[]
}

/**
 * Full rows for saved list ids, in both shapes they come in: `sc-<scorecard_id>`
 * from the DB, and bare slugs like 'uc-santa-cruz' saved from the old static
 * set (matched through legacy_slug). Keyed by the id passed in; ids with no
 * row are simply absent. Feeds the list strip's costs, each school page's net
 * price, and the map-pin backfill for entries saved before the map stored
 * coordinates. Cached for the session, so those share one lookup per school.
 */
// Session cache for fetchSavedColleges: the strip, the map backfill and each
// school page all ask for the same rows. null = looked up, no such row.
const savedCache = new Map<string, College | null>()

/** Test hook: forget cached rows. */
export function clearSavedCollegesCache() { savedCache.clear() }

export async function fetchSavedColleges(ids: string[]): Promise<Map<string, College>> {
  const out = new Map<string, College>()
  const missing = ids.filter((id) => !savedCache.has(id))
  if (missing.length > 0) await loadSavedColleges(missing)
  for (const id of ids) {
    const row = savedCache.get(id)
    if (row) out.set(id, row)
  }
  return out
}

async function loadSavedColleges(ids: string[]): Promise<void> {
  const scorecardIds = ids.flatMap((id) => {
    const n = id.startsWith('sc-') ? Number(id.slice(3)) : NaN
    return Number.isFinite(n) ? [n] : []
  })
  const slugs = ids.filter((id) => !id.startsWith('sc-'))
  const filters = [
    scorecardIds.length ? `scorecard_id.in.(${scorecardIds.join(',')})` : null,
    slugs.length ? `legacy_slug.in.(${slugs.join(',')})` : null,
  ].filter(Boolean) as string[]
  if (filters.length === 0) { for (const id of ids) savedCache.set(id, null); return }
  const { data, error } = await supabase
    .from('colleges')
    .select(`${SEARCH_COLS},legacy_slug`)
    .or(filters.join(','))
  // Errors aren't cached, so the next call retries.
  if (error) throw new Error(`Failed to load your colleges: ${error.message}`)
  for (const id of ids) savedCache.set(id, null)
  for (const r of (data ?? []) as unknown as College[]) {
    savedCache.set(`sc-${r.scorecard_id}`, r)
    if (r.legacy_slug) savedCache.set(r.legacy_slug, r)
  }
}

export async function searchCollegesDb(query: string, limit = 8): Promise<College[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const { data, error } = await supabase
    .from('colleges')
    .select(SEARCH_COLS)
    .eq('status', 'published')
    .in('institution_type', ['4yr', '2yr', 'trade'])
    .ilike('name', `%${q}%`)
    .order('size', { ascending: false, nullsFirst: false })
    .limit(limit)
  if (error) throw new Error(`College search failed: ${error.message}`)
  return (data ?? []) as unknown as College[]
}

/** Emoji + one-line subtitle for a DB college (the search dropdown & list snapshot). */
export function collegeGlyph(c: Pick<College, 'institution_type'>): string {
  return c.institution_type === '2yr' ? '🏫' : c.institution_type === 'trade' ? '🔧' : '🎓'
}
export function collegeSubtitle(c: Pick<College, 'institution_type' | 'city' | 'state'>): string {
  const type = c.institution_type === '2yr' ? 'Community college' : c.institution_type === 'trade' ? 'Trade/career' : '4-year'
  return [type, [c.city, c.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
}
