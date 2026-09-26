/**
 * The student's college list, owned in one place.
 *
 * Two views write this record: Application Tracking (add, remove, edit, tick a
 * task) and the deadline panel (ticking an application marks it submitted).
 * It persists as one whole array, so two independent copies meant the second
 * writer replaced whatever the first had just saved — a college added inside
 * the module vanished when a deadline was ticked on the dashboard.
 *
 * The dashboard hook used to dodge that by pausing while a module was open,
 * which also ruled out showing the panel inside a module at all. One owner
 * removes both problems: every writer reads and writes the same array, and a
 * change made in either place is visible in the other immediately, with no
 * refetch to wait for.
 *
 * Deliberately not a store for anything else. Scholarship tracker items look
 * like the same problem but are not: they are rows in their own table written
 * one at a time, so concurrent writers cannot overwrite each other.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useModuleData } from '../lib/useModuleState'
import { APPLICATIONS_MODULE, APPLICATIONS_DATA_KEY } from '../data/applicationDeadlines'
import type { ApplicationEntry } from '../data/applicationsChecklist'

export interface ApplicationsValue {
  /** As stored. Views that only understand some categories map over this. */
  apps: ApplicationEntry[]
  /** Latest value, for handlers that read-modify-write. */
  appsRef: React.RefObject<ApplicationEntry[]>
  /**
   * Replace the list. Resolves false when the write was refused (no completed
   * read yet) or rolled back — never partially applied.
   */
  saveApps: (next: ApplicationEntry[]) => Promise<boolean>
  loadFailed: boolean
}

const Ctx = createContext<ApplicationsValue | null>(null)

export function ApplicationsProvider({ children }: { children: ReactNode }) {
  // Always loading: the list feeds the dashboard, every module overview and
  // Application Tracking, so there is no point at which it is not wanted.
  const { data, saveData, dataRef, loadFailed } =
    useModuleData<ApplicationEntry>(APPLICATIONS_MODULE, APPLICATIONS_DATA_KEY, true)
  const value = useMemo(
    () => ({ apps: data, appsRef: dataRef, saveApps: saveData, loadFailed }),
    [data, dataRef, saveData, loadFailed],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider
export function useApplications(): ApplicationsValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApplications must be used inside <ApplicationsProvider>')
  return v
}
