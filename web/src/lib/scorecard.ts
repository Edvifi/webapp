/**
 * scorecard — school student-body / diversity detail for the Discover popup.
 *
 * The data is ingested into colleges.student_body, so we read it from OUR DB
 * (fast, local) rather than the live Scorecard API. Results are cached for the
 * session; getCachedDetail lets the modal seed synchronously (no spinner on
 * re-open), and cards prefetch on hover.
 */

import { supabase } from './supabase'

export interface SchoolDetail {
  women: number | null
  retention: number | null
  firstGen: number | null
  /** Race/ethnicity share, largest first, as fractions 0–1. */
  diversity: Array<{ label: string; pct: number }>
}

interface RawStudentBody {
  women?: number | null
  retention?: number | null
  first_gen?: number | null
  race?: Record<string, number>
}

const RACE_LABELS: Record<string, string> = {
  white: 'White', black: 'Black', hispanic: 'Hispanic', asian: 'Asian',
  aian: 'Native American', nhpi: 'Pacific Islander', two_or_more: 'Two or more',
  non_resident_alien: 'International', unknown: 'Unknown',
}

function toDetail(sb: RawStudentBody | null): SchoolDetail | null {
  if (!sb) return null
  const diversity = Object.entries(sb.race ?? {})
    .map(([k, v]) => ({ label: RACE_LABELS[k] ?? k, pct: v }))
    .filter((d) => typeof d.pct === 'number' && d.pct > 0.001)
    .sort((a, b) => b.pct - a.pct)
  return { women: sb.women ?? null, retention: sb.retention ?? null, firstGen: sb.first_gen ?? null, diversity }
}

const resolved = new Map<number, SchoolDetail | null>()
const inflight = new Map<number, Promise<SchoolDetail | null>>()

/** Synchronously read a cached detail (undefined = not fetched yet). */
export function getCachedDetail(scorecardId: number): SchoolDetail | null | undefined {
  return resolved.get(scorecardId)
}

/**
 * Rejects if the lookup fails. Resolving `null` is a real answer — roughly 340
 * of the 6,273 colleges genuinely have no `student_body` row — so a failed
 * query must not masquerade as "this school has no data". Only real answers
 * are cached, which also lets a transient failure be retried on re-open
 * instead of being remembered for the rest of the session.
 */
export function fetchSchoolDetail(scorecardId: number): Promise<SchoolDetail | null> {
  if (resolved.has(scorecardId)) return Promise.resolve(resolved.get(scorecardId) ?? null)
  const existing = inflight.get(scorecardId)
  if (existing) return existing
  const p = fetchRaw(scorecardId)
    .then((r) => {
      resolved.set(scorecardId, r)
      inflight.delete(scorecardId)
      return r
    })
    .catch((e) => {
      inflight.delete(scorecardId)
      throw e
    })
  inflight.set(scorecardId, p)
  return p
}

async function fetchRaw(scorecardId: number): Promise<SchoolDetail | null> {
  const { data, error } = await supabase.from('colleges').select('student_body').eq('scorecard_id', scorecardId).maybeSingle()
  if (error) throw new Error(`Failed to load student-body data: ${error.message}`)
  if (!data) return null
  return toDetail(data.student_body as RawStudentBody | null)
}
