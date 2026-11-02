/**
 * College Match onboarding prefs, persisted to
 * settings.module_data.applications.collegePrefs, plus the derived engine input
 * (StudentCollegeProfile) built from the student's existing demographics + prefs.
 *
 * The ZIP geocode lives here rather than in Discover because the college list
 * is now shown in two places (Discover's feed and the Overview strip) and both
 * need the same home state and origin. geocodeZip caches in memory and
 * localStorage, so the second caller costs nothing.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useModuleValue } from './useModuleState'
import { geocodeZip } from './geoZip'
import { buildStudentProfile, DEFAULT_COLLEGE_PREFS, type CollegePrefs, type GeoPoint, type StudentCollegeProfile } from './collegeMatch'

const MODULE_NAME = 'applications'
const PREFS_KEY = 'collegePrefs'

export function useCollegePrefs(open: boolean) {
  const { profile } = useAuth()
  const toast = useToast()
  const { value: prefs, save, loaded } = useModuleValue<CollegePrefs>(
    MODULE_NAME,
    PREFS_KEY,
    open,
    DEFAULT_COLLEGE_PREFS,
  )
  const savePrefs = useCallback(async (p: CollegePrefs) => {
    const ok = await save(p)
    if (!ok) toast.error('Could not save your answers — check your connection and try again')
    return ok
  }, [save, toast])
  const demographics = profile?.demographics ?? null
  const studentProfile = useMemo(() => buildStudentProfile(demographics, prefs), [demographics, prefs])

  // Geocode the student's ZIP for community-college proximity; derive home state from it.
  const zip = demographics?.zipcode
  const [origin, setOrigin] = useState<GeoPoint | null>(null)
  const [geoState, setGeoState] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    geocodeZip(zip).then((loc) => {
      if (cancelled || !loc) return
      setOrigin({ lat: loc.lat, lng: loc.lng })
      setGeoState(loc.state || null)
    })
    return () => { cancelled = true }
  }, [zip])

  // Fall back to the ZIP-derived state so local CCs load without an explicit pick.
  const effectiveProfile: StudentCollegeProfile = useMemo(
    () => ({ ...studentProfile, homeState: studentProfile.homeState ?? geoState }),
    [studentProfile, geoState],
  )

  return { prefs, savePrefs, loaded, studentProfile, zip, origin, geoState, effectiveProfile }
}
