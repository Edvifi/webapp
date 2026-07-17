/**
 * College Match onboarding prefs, persisted to
 * settings.module_data.applications.collegePrefs, plus the derived engine input
 * (StudentCollegeProfile) built from the student's existing demographics + prefs.
 */
import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useModuleValue } from './useModuleState'
import { buildStudentProfile, DEFAULT_COLLEGE_PREFS, type CollegePrefs } from './collegeMatch'

const MODULE_NAME = 'applications'
const PREFS_KEY = 'collegePrefs'

export function useCollegePrefs(open: boolean) {
  const { profile } = useAuth()
  const { value: prefs, save: savePrefs, loaded } = useModuleValue<CollegePrefs>(
    MODULE_NAME,
    PREFS_KEY,
    open,
    DEFAULT_COLLEGE_PREFS,
  )
  const demographics = profile?.demographics ?? null
  const studentProfile = useMemo(() => buildStudentProfile(demographics, prefs), [demographics, prefs])
  return { prefs, savePrefs, loaded, studentProfile }
}
