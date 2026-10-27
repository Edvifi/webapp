/**
 * College Match onboarding prefs, persisted to
 * settings.module_data.applications.collegePrefs, plus the derived engine input
 * (StudentCollegeProfile) built from the student's existing demographics + prefs.
 */
import { useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useModuleValue } from './useModuleState'
import { buildStudentProfile, DEFAULT_COLLEGE_PREFS, type CollegePrefs } from './collegeMatch'

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
