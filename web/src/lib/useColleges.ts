/**
 * Loads the candidate pool for the Discover tab via the server-side match_colleges
 * RPC: it hard-filters across ALL institutions, pre-ranks by a dominant-terms proxy
 * (affordability at the income bracket, major overlap, outcomes, proximity), and
 * returns a shortlist (~300 + every local public community college). The client
 * then re-scores this shortlist with the authoritative engine for display, so the
 * ranking is global while the payload stays small.
 *
 * Location rules baked into the RPC: 4-year/trade honor the distance preference;
 * community colleges are always PUBLIC 2-year, local to the home state (a CC in
 * another state isn't a real option). Falls back to direct queries if the RPC errors.
 */
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { regionOf, incomeBracketFromCents, type College, type StudentCollegeProfile, type GeoPoint } from './collegeMatch'

const COLLEGE_COLS =
  'id,scorecard_id,name,slug,institution_type,city,state,region,ownership,locale,size,latitude,longitude,' +
  'admit_rate,sat_reading_25,sat_reading_75,sat_math_25,sat_math_75,act_25,act_75,' +
  'avg_net_price_cents,net_price_by_income,cost_of_attendance_cents,programs,grad_rate,' +
  'transfer_rate,median_earnings_10yr_cents,pell_pct,npc_url,url'

export function useColleges(open: boolean, profile: StudentCollegeProfile, origin: GeoPoint | null = null) {
  const [rows, setRows] = useState<College[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const params = {
    income_bracket: incomeBracketFromCents(profile.familyIncomeCents),
    intended_fields: profile.intendedFields ?? [],
    home_state: profile.homeState ?? null,
    region: profile.homeState ? regionOf(profile.homeState) : null,
    pref_distance: profile.prefMaxDistance ?? 'anywhere',
    pref_ownership: profile.prefOwnership ?? 'either',
    origin: origin ? { lat: origin.lat, lng: origin.lng } : null,
    open_to_trade: !!profile.openToTrade,
  }
  const paramsKey = JSON.stringify(params)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const p = JSON.parse(paramsKey)
      // Preferred path: server-side ranked shortlist.
      const rpc = await supabase.rpc('match_colleges', { p, p_limit: 300 })
      if (cancelled) return
      if (!rpc.error && rpc.data) {
        setRows(rpc.data as unknown as College[])
        setLoading(false)
        return
      }
      // Fallback: direct queries (4-year/trade by distance; local public CCs separately).
      const relocateTypes = ['4yr', ...(p.open_to_trade ? ['trade'] : [])]
      let q = supabase.from('colleges').select(COLLEGE_COLS).eq('status', 'published').in('institution_type', relocateTypes)
      if (p.pref_distance === 'in_state' && p.home_state) q = q.eq('state', p.home_state)
      else if (p.pref_distance === 'in_region' && p.region) q = q.eq('region', p.region)
      if (p.pref_ownership === 'public') q = q.eq('ownership', 'public')
      else if (p.pref_ownership === 'private') q = q.in('ownership', ['private_nonprofit', 'private_forprofit'])
      q = q.order('grad_rate', { ascending: false, nullsFirst: false }).limit(2500)

      const ccReq = p.home_state
        ? supabase.from('colleges').select(COLLEGE_COLS).eq('status', 'published').eq('institution_type', '2yr')
            .eq('ownership', 'public').eq('state', p.home_state).order('size', { ascending: false, nullsFirst: false }).limit(200)
        : null

      const [main, cc] = await Promise.all([q, ccReq])
      if (cancelled) return
      if (main.error || (cc && cc.error)) {
        setError((main.error || cc?.error)?.message ?? 'load failed')
        setRows([])
      } else {
        setRows([...(main.data ?? []), ...(cc?.data ?? [])] as unknown as College[])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
    // paramsKey encodes every input that changes the ranked pool.
  }, [open, paramsKey])

  return { rows, loading, error }
}
