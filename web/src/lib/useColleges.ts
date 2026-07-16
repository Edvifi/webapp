import { useEffect, useState } from 'react'
import { loadColleges, collegesLoaded } from '../data/collegeData'

/**
 * Triggers the one-time college load and re-renders when the DB data replaces
 * the offline seed cache. Returns true once the DB rows are in the cache.
 * Components that read colleges (search, recommendations, deadline derivation)
 * call this so their synchronous getCollegeById/searchColleges pick up the
 * richer DB data (logos, full school list) as soon as it arrives.
 */
export function useCollegesReady(): boolean {
  const [ready, setReady] = useState(collegesLoaded())
  useEffect(() => {
    if (collegesLoaded()) return
    let cancelled = false
    loadColleges()
      .then(() => { if (!cancelled) setReady(true) })
      .catch(() => {}) // keep the seed cache on failure
    return () => { cancelled = true }
  }, [])
  return ready
}
