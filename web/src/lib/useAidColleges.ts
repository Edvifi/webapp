/**
 * Resolves the student's saved college ids for the Financial Aid tabs.
 *
 * Both tabs need the same thing, so the fetch, its failure state, and the list
 * of ids that matched nothing live here once rather than twice.
 */

import { useEffect, useState } from 'react'
import { fetchAidColleges, type AidCollege } from './aidColleges'

export interface AidCollegesState {
  colleges: AidCollege[]
  loading: boolean
  /** The lookup failed. Distinct from "you have no colleges saved". */
  failed: boolean
  /** Saved ids no row matched — surfaced rather than silently dropped. */
  unresolved: string[]
}

interface Resolved {
  /** The id list this result is for, so a stale result is never shown as current. */
  key: string
  colleges: AidCollege[]
  failed: boolean
  unresolved: string[]
}

const NOTHING: AidCollegesState = { colleges: [], loading: false, failed: false, unresolved: [] }

export function useAidColleges(collegeIds: string[]): AidCollegesState {
  // Joined, so a re-render with an equal-but-new array does not refetch while an
  // actual add or remove does.
  const key = collegeIds.join(',')
  const [resolved, setResolved] = useState<Resolved | null>(null)

  useEffect(() => {
    if (key === '') return
    let cancelled = false
    fetchAidColleges(key.split(','))
      .then(({ colleges, unresolved }) => {
        if (!cancelled) setResolved({ key, colleges, failed: false, unresolved })
      })
      .catch(() => {
        // Rendering an empty list on failure would look like the student's own
        // saved colleges had been thrown away.
        if (!cancelled) setResolved({ key, colleges: [], failed: true, unresolved: [] })
      })
    return () => { cancelled = true }
  }, [key])

  if (key === '') return NOTHING
  // Loading is derived rather than assigned: any state where the newest result
  // is not for the current id list is, by definition, still in flight. That also
  // means a result for a previous list is never briefly shown as this one's.
  if (resolved === null || resolved.key !== key) {
    return { colleges: [], loading: true, failed: false, unresolved: [] }
  }
  return { colleges: resolved.colleges, loading: false, failed: resolved.failed, unresolved: resolved.unresolved }
}
