/**
 * currentGrade — what year a student is actually in today.
 *
 * `profiles.grade_start_idx` is written once during onboarding and never
 * changes. Everything that dates a deadline reads it, so from a student's
 * second school year onward every deadline in the app was a year late: someone
 * who signed up as a sophomore still looked like a sophomore the following
 * September, and their college deadlines were dated to the cycle after the one
 * they were living.
 *
 * Rather than rewrite the stored value on a schedule — which needs a job, and
 * fails for anyone who does not open the app — the recorded grade is treated
 * as a reading taken at a known moment, and advanced by the school years that
 * have passed since.
 */

import { YEAR_GROUPS, yearGroupOf } from '../data/timelineData'

/**
 * US school years start in August. The number of school-year boundaries
 * between two dates is how many grades a student has moved up.
 */
function schoolYearOf(d: Date): number {
  return d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1
}

export function schoolYearsBetween(from: Date, to: Date): number {
  return Math.max(0, schoolYearOf(to) - schoolYearOf(from))
}

/**
 * The milestone index for the student's grade today.
 *
 * Capped at senior: the app does not model life after graduation, and letting
 * the index run past the end would date deadlines to a cycle that does not
 * exist. A senior who keeps using the app stays a senior.
 */
export function currentGradeStartIdx(
  storedIdx: number | null | undefined,
  gradeSetAt: string | null | undefined,
  now: Date = new Date(),
): number {
  if (storedIdx == null) return 0
  if (!gradeSetAt) return storedIdx

  const set = new Date(gradeSetAt)
  if (isNaN(set.getTime())) return storedIdx

  const elapsed = schoolYearsBetween(set, now)
  if (elapsed === 0) return storedIdx

  const group = yearGroupOf(storedIdx)
  const groupIdx = YEAR_GROUPS.findIndex((g) => g.startIndex === group.startIndex)
  if (groupIdx < 0) return storedIdx

  const target = Math.min(groupIdx + elapsed, YEAR_GROUPS.length - 1)
  return YEAR_GROUPS[target].startIndex
}
