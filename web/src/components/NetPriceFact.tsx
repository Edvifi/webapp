/**
 * NetPriceFact — "Net price for you" on a school's application page: what a
 * year costs after typical aid at the student's household income, from the
 * same match engine Discover uses. Falls back to the all-students average when
 * no income is on file, and says so.
 *
 * Mount with key={collegeId}; it fetches once per school.
 */

import { useEffect, useState } from 'react'
import { C } from '../lib/designTokens'
import { SecLabel } from './moduleUI'
import { useCollegePrefs } from '../lib/useCollegePrefs'
import { fetchCollegesByScorecardIds } from '../lib/collegeSearch'
import { scoreCollegeForProfile, type College } from '../lib/collegeMatch'

const font = "'Outfit',sans-serif"

export default function NetPriceFact({ collegeId }: { collegeId: string }) {
  const { studentProfile } = useCollegePrefs(true)
  const scid = collegeId.startsWith('sc-') ? Number(collegeId.slice(3)) : NaN
  // undefined = still loading, null = nothing to show
  const [college, setCollege] = useState<College | null | undefined>(Number.isFinite(scid) ? undefined : null)

  useEffect(() => {
    if (!Number.isFinite(scid)) return
    let cancelled = false
    fetchCollegesByScorecardIds([scid])
      .then(([c]) => { if (!cancelled) setCollege(c ?? null) })
      // Supplementary: a failed lookup shows "no data" rather than an error.
      .catch(() => { if (!cancelled) setCollege(null) })
    return () => { cancelled = true }
  }, [scid])

  const personal = college ? scoreCollegeForProfile(college, studentProfile, null).netPriceForYouCents : null
  const cents = personal ?? college?.avg_net_price_cents ?? null
  const isPersonal = personal != null && studentProfile.familyIncomeCents != null

  return (
    <>
      <SecLabel style={{ marginBottom: 6 }}>Net price for you</SecLabel>
      <div style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: cents != null && cents <= 0 ? '#2D9E72' : cents == null ? C.textMuted : C.text }}>
        {college === undefined ? '…' : cents == null ? 'No cost data' : cents <= 0 ? 'Free after aid' : `$${Math.round(cents / 100).toLocaleString()}/yr`}
      </div>
      {college !== undefined && cents != null && (
        <div style={{ fontFamily: font, fontSize: 12, color: C.textMuted, marginTop: 3 }}>
          {isPersonal ? 'After typical aid at your income' : 'Average for all students · add income to personalize'}
        </div>
      )}
    </>
  )
}
