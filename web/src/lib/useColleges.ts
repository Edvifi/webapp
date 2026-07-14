/**
 * Loads a candidate pool of colleges for the Discover tab. Hard preferences
 * (pathway types, location, ownership) are applied server-side to keep the
 * payload reasonable; soft fit (major, size, setting, affordability) is scored
 * client-side by the match engine. Capped at 2000 rows — plenty for ranking a
 * top-N list; noted so the cap isn't mistaken for "everything".
 */
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { regionOf, type College, type StudentCollegeProfile } from './collegeMatch'

const COLLEGE_COLS =
  'id,scorecard_id,name,slug,institution_type,city,state,region,ownership,locale,size,' +
  'admit_rate,sat_reading_25,sat_reading_75,sat_math_25,sat_math_75,act_25,act_75,' +
  'avg_net_price_cents,net_price_by_income,cost_of_attendance_cents,programs,grad_rate,' +
  'transfer_rate,median_earnings_10yr_cents,pell_pct,npc_url,url'

export function useColleges(open: boolean, profile: StudentCollegeProfile) {
  const [rows, setRows] = useState<College[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Always fetch 2yr so the affordable-CC nudge + transfer pairing can appear even
  // when the student didn't opt into transfer paths (the display layer filters).
  const types = ['4yr', '2yr', ...(profile.openToTrade ? ['trade'] : [])]
  const typeKey = types.join(',')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      let q = supabase.from('colleges').select(COLLEGE_COLS).eq('status', 'published').in('institution_type', types)
      if (profile.prefMaxDistance === 'in_state' && profile.homeState) {
        q = q.eq('state', profile.homeState)
      } else if (profile.prefMaxDistance === 'in_region' && profile.homeState) {
        const region = regionOf(profile.homeState)
        if (region) q = q.eq('region', region)
      }
      if (profile.prefOwnership === 'public') q = q.eq('ownership', 'public')
      else if (profile.prefOwnership === 'private') q = q.in('ownership', ['private_nonprofit', 'private_forprofit'])
      q = q.order('size', { ascending: false, nullsFirst: false }).limit(2000)

      const { data, error: err } = await q
      if (cancelled) return
      if (err) {
        setError(err.message)
        setRows([])
      } else {
        setRows((data ?? []) as unknown as College[])
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
