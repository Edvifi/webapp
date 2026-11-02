/**
 * College Match onboarding prefs, persisted to
 * settings.module_data.applications.collegePrefs, plus the derived engine input
 * (StudentCollegeProfile) built from the student's existing demographics + prefs.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useModuleValue } from './useModuleState'
import { buildStudentProfile, DEFAULT_COLLEGE_PREFS, type CollegePrefs, type GeoPoint, type StudentCollegeProfile } from './collegeMatch'
import { geocodeZip } from './geoZip'

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
  return { prefs, savePrefs, loaded, studentProfile }
}

/** The match profile placed where the student lives: their ZIP geocoded, for
 *  distances, and its state standing in for a home state they haven't picked,
 *  so local community colleges load without one. */
export function useLocatedProfile(studentProfile: StudentCollegeProfile) {
  const zip = useAuth().profile?.demographics?.zipcode
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
  const profile = useMemo(
    () => ({ ...studentProfile, homeState: studentProfile.homeState ?? geoState }),
    [studentProfile, geoState],
  )
  return { profile, origin }
}
