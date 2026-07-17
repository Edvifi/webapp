/**
 * Name search over the full colleges table (undergrad targets only), used by the
 * College List tab's add box so it draws from the same ~6,300-school source as
 * Discover instead of the legacy 46-row static list.
 */
import { supabase } from './supabase'
import type { College } from './collegeMatch'

const SEARCH_COLS =
  'id,scorecard_id,name,slug,institution_type,city,state,region,ownership,locale,size,latitude,longitude,' +
  'admit_rate,sat_reading_25,sat_reading_75,sat_math_25,sat_math_75,act_25,act_75,' +
  'avg_net_price_cents,net_price_by_income,cost_of_attendance_cents,programs,grad_rate,' +
  'transfer_rate,median_earnings_10yr_cents,pell_pct,npc_url,url'

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
  if (error) return []
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
