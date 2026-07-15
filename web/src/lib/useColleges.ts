/**
 * Loads a candidate pool of colleges for the Discover tab.
 *
 * Location handling differs by type, on purpose:
 *   • 4-year (and trade) schools honor the student's distance preference
 *     (in-state / in-region / anywhere) — students relocate for these.
 *   • Community colleges are ALWAYS scoped to the student's home state — you
 *     attend the CC near you (in-state tuition + state transfer agreements),
 *     so a CC in another state isn't a real option. Skipped entirely if the
 *     student hasn't given a home state.
 *
 * Hard filters run server-side; soft fit (major, size, setting, affordability)
 * is scored client-side by the match engine. Capped per query — plenty for a
 * top-N list, and noted so the cap isn't mistaken for "everything".
 */
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { regionOf, type College, type StudentCollegeProfile } from './collegeMatch'

const COLLEGE_COLS =
  'id,scorecard_id,name,slug,institution_type,city,state,region,ownership,locale,size,latitude,longitude,' +
  'admit_rate,sat_reading_25,sat_reading_75,sat_math_25,sat_math_75,act_25,act_75,' +
  'avg_net_price_cents,net_price_by_income,cost_of_attendance_cents,programs,grad_rate,' +
  'transfer_rate,median_earnings_10yr_cents,pell_pct,npc_url,url'

export function useColleges(open: boolean, profile: StudentCollegeProfile) {
  const [rows, setRows] = useState<College[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 4-year always; trade only if opted in. (Community colleges are fetched separately, by home state.)
  const relocateTypes = ['4yr', ...(profile.openToTrade ? ['trade'] : [])]
  const typeKey = relocateTypes.join(',')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      // 4-year (+ trade): respect the distance preference.
      let q = supabase.from('colleges').select(COLLEGE_COLS).eq('status', 'published').in('institution_type', relocateTypes)
      if (profile.prefMaxDistance === 'in_state' && profile.homeState) {
        q = q.eq('state', profile.homeState)
      } else if (profile.prefMaxDistance === 'in_region' && profile.homeState) {
        const region = regionOf(profile.homeState)
        if (region) q = q.eq('region', region)
      }
      if (profile.prefOwnership === 'public') q = q.eq('ownership', 'public')
      else if (profile.prefOwnership === 'private') q = q.in('ownership', ['private_nonprofit', 'private_forprofit'])
      // Cap covers all ~1,947 four-year schools (order by outcome quality so any residual
      // cap on a trade-heavy pool keeps the stronger schools). A server-side scoring RPC
      // is the real fix once the pool needs to exceed this.
      q = q.order('grad_rate', { ascending: false, nullsFirst: false }).limit(2500)

      // Community colleges: PUBLIC 2-year only (real CCs, not for-profit career schools),
      // always local to the student's home state (or none if unknown).
      const ccReq = profile.homeState
        ? supabase.from('colleges').select(COLLEGE_COLS).eq('status', 'published').eq('institution_type', '2yr')
            .eq('ownership', 'public').eq('state', profile.homeState).order('size', { ascending: false, nullsFirst: false }).limit(200)
        : null

      const [main, cc] = await Promise.all([q, ccReq])
      if (cancelled) return
      const err = main.error || (cc && cc.error)
      if (err) {
        setError(err.message)
        setRows([])
      } else {
        setRows([...(main.data ?? []), ...(cc?.data ?? [])] as unknown as College[])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
    // Only the hard (server-side) filters trigger a refetch; soft fit re-scores in the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, typeKey, profile.prefMaxDistance, profile.homeState, profile.prefOwnership])

  return { rows, loading, error }
}
