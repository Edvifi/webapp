/**
 * NetPriceFact — "Net price for you" on a school's application page: what a
 * year costs after typical aid at the student's household income, from the
 * same match engine Discover uses. Falls back to the all-students average when
 * there's no figure for the student's income (none on file, or the school
 * doesn't report that bracket), and says so. Resolves legacy slug entries too.
 *
 * Mount with key={collegeId}; it fetches once per school.
 */

import { useEffect, useState } from 'react'
import { C } from '../lib/designTokens'
import { SecLabel } from './moduleUI'
import { useCollegePrefs } from '../lib/useCollegePrefs'
import { fetchSavedColleges } from '../lib/collegeSearch'
import { hasIncomeNetPrice, netPriceForYouCents, type College } from '../lib/collegeMatch'

const font = "'Outfit',sans-serif"

export default function NetPriceFact({ collegeId }: { collegeId: string }) {
  const { studentProfile } = useCollegePrefs(true)
  // undefined = still loading, null = nothing to show
  const [college, setCollege] = useState<College | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    fetchSavedColleges([collegeId])
      .then((rows) => { if (!cancelled) setCollege(rows.get(collegeId) ?? null) })
      // Supplementary: a failed lookup shows "no data" rather than an error.
      .catch(() => { if (!cancelled) setCollege(null) })
    return () => { cancelled = true }
  }, [collegeId])

  const cents = college ? netPriceForYouCents(college, studentProfile) : null
  const isPersonal = college ? hasIncomeNetPrice(college, studentProfile) : false

  return (
    <>
      <SecLabel style={{ marginBottom: 6 }}>Net price for you</SecLabel>
      <div style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: cents != null && cents <= 0 ? '#2D9E72' : cents == null ? C.textMuted : C.text }}>
        {college === undefined ? '…' : cents == null ? 'No cost data' : cents <= 0 ? 'Free after aid' : `$${Math.round(cents / 100).toLocaleString()}/yr`}
      </div>
      {college !== undefined && cents != null && (
        <div style={{ fontFamily: font, fontSize: 12, color: C.textMuted, marginTop: 3 }}>
          {isPersonal ? 'After typical aid at your income'
            : studentProfile.familyIncomeCents != null ? 'Average for all students · not reported for your income'
            : 'Average for all students · add income to personalize'}
        </div>
      )}
    </>
  )
}
