/**
 * Application fee-waiver eligibility, derived from the household-income
 * bracket collected in the demographic survey.
 *
 * The major waivers a student meets at application time — Common App, NACAC,
 * SAT/ACT — key off income at roughly 185% of the federal poverty line, about
 * $60k for a family of four. The survey only collects coarse brackets, so we
 * compare the TOP of the student's bracket against that line: a bracket
 * qualifies only when every income inside it would. That is deliberately
 * conservative about telling someone they qualify, and it stays correct if the
 * bracket labels are ever re-cut — which midpoint arithmetic would not.
 *
 * Note this is NOT `parseIncomeToRange` (fafsaData). That returns a single
 * representative point for scholarship matching and would read "Under $30,000"
 * as $15k; here the boundary is what matters, not a representative value.
 *
 * Eligibility is always phrased to the student as "likely" — the real
 * determination is made by the counselor or the application platform, and
 * family size and circumstances shift the line.
 */

/**
 * `likely`   — every income in their bracket clears the waiver line.
 * `unknown`  — no usable income on file ("Prefer not to say", or unanswered).
 *              These students get the prompt to fill it in.
 * `unlikely` — their bracket sits above the line; show nothing.
 */
export type FeeWaiverEligibility = 'likely' | 'unknown' | 'unlikely'

/** ~185% of the federal poverty line for a family of four, rounded to the survey's bracket edge. */
export const QUALIFYING_CEILING_DOLLARS = 60_000

export function feeWaiverEligibility(
  incomeLevel: string | null | undefined,
): FeeWaiverEligibility {
  if (!incomeLevel) return 'unknown'

  const nums = (incomeLevel.match(/[\d,]+/g) ?? [])
    .map((n) => parseInt(n.replace(/,/g, ''), 10))
    .filter((n) => !Number.isNaN(n))

  // No figure at all — "Prefer not to say" and anything else unparseable.
  if (nums.length === 0) return 'unknown'

  // An open-ended top bracket ("$150,000+") has no ceiling, so it can never be
  // wholly below the line no matter how low its floor reads.
  if (/\+\s*$/.test(incomeLevel.trim())) return 'unlikely'

  return Math.max(...nums) <= QUALIFYING_CEILING_DOLLARS ? 'likely' : 'unlikely'
}

/** Whether this student should see the notice at all (either variant). */
export function shouldShowFeeWaiverNotice(
  incomeLevel: string | null | undefined,
  introsSeen: string[] | null | undefined,
): boolean {
  if (introsSeen?.includes(FEE_WAIVER_NOTICE_KEY)) return false
  return feeWaiverEligibility(incomeLevel) !== 'unlikely'
}

/**
 * Dismissal key. One key across both surfaces, so dismissing on the dashboard
 * also clears the banner inside the Applications module — written through
 * `mark_intro_seen`, which appends server-side and is safe against the
 * lost-update race a client-side read-modify-write would have.
 */
export const FEE_WAIVER_NOTICE_KEY = 'fee-waiver-notice'
