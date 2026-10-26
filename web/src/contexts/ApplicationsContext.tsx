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

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useModuleData } from '../lib/useModuleState'
import { APPLICATIONS_MODULE, APPLICATIONS_DATA_KEY } from '../data/applicationDeadlines'
import type { ApplicationEntry } from '../data/applicationsChecklist'
import { fetchAidColleges, type AidCollege } from '../lib/aidColleges'
import { syncStatusWithTasks, withSharedTasks } from '../data/applicationTasks'

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
  /** True once the list has been read, even when it came back empty. */
  loaded: boolean
  /**
   * Each school's database row, by saved id, as far as it has loaded. The
   * calendar reads a school's own dates from these; a school not in here yet
   * falls back to the static set, then to typical dates.
   */
  colleges: ReadonlyMap<string, AidCollege>
}

const Ctx = createContext<ApplicationsValue | null>(null)

type GuaranteeCopy = ApplicationEntry['aidGuarantee']

/** Field by field, so it doesn't depend on how either object was built. */
function sameGuarantee(a: GuaranteeCopy, b: GuaranteeCopy): boolean {
  if (!a || !b) return a === b
  return a.headline === b.headline && a.residents === b.residents && a.needsCss === b.needsCss
}

export function ApplicationsProvider({ children }: { children: ReactNode }) {
  // Always loading: the list feeds the dashboard, every module overview and
  // Application Tracking, so there is no point at which it is not wanted.
  const { data, saveData, dataRef, loaded, loadFailed } =
    useModuleData<ApplicationEntry>(APPLICATIONS_MODULE, APPLICATIONS_DATA_KEY, true)

  // Copy each school's aid guarantee and CSS Profile deadline onto its entry,
  // so the task list (built synchronously, in many places) can name the
  // guarantee and ask for the CSS Profile exactly where Financial Aid's
  // deadlines do. `colleges` stays the only source; this is a cached copy,
  // re-checked once per school per session so a corrected row reaches lists
  // saved before the correction. A failed lookup is retried on the next change
  // to the list rather than given up on.
  const [colleges, setColleges] = useState<ReadonlyMap<string, AidCollege>>(new Map())
  const guaranteeChecked = useRef(new Set<string>())
  const guaranteeInFlight = useRef(new Set<string>())
  useEffect(() => {
    if (loadFailed) return
    // Unchecked this session, or never filled in at all: a school removed and
    // added back is a fresh entry with nothing copied yet.
    const due = data
      .filter((a) => !guaranteeInFlight.current.has(a.collegeId) &&
        (!guaranteeChecked.current.has(a.collegeId) || a.aidGuarantee === undefined || a.cssProfile === undefined || a.aidCurated === undefined))
      .map((a) => a.collegeId)
    if (due.length === 0) return
    for (const id of due) { guaranteeChecked.current.add(id); guaranteeInFlight.current.add(id) }
    fetchAidColleges(due)
      .then(({ colleges: rows, unresolved }) => {
        // The rows are fetched for the guarantees anyway; keeping them gives
        // the calendar each school's own dates without a second lookup.
        setColleges((prev) => new Map([...prev, ...rows.map((c) => [c.id, c] as const)]))
        const found = new Map(rows.map((c) => [c.id, c]))
        const none = new Set(unresolved)
        let changed = false
        const current = dataRef.current
        const next = current.map((a) => {
          if (!found.has(a.collegeId) && !none.has(a.collegeId)) return a
          const row = found.get(a.collegeId)
          const g = row?.guarantee
          const copy = g ? { headline: g.headline, ...(g.residents ? { residents: g.residents } : {}), needsCss: g.needsCss } : null
          const css = row?.financialAidDeadlines.cssProfile ?? null
          const curated = row?.curated ?? false
          if (sameGuarantee(copy, a.aidGuarantee) && css === a.cssProfile && curated === a.aidCurated) return a
          changed = true
          // A newly needed CSS Profile picks up the tick the rest of the list already has.
          return withSharedTasks({ ...a, aidGuarantee: copy, cssProfile: css, aidCurated: curated }, current.filter((o) => o !== a))
        })
        if (changed) void saveData(next)
      })
      // Supplementary: without it the task reads generically and nothing breaks.
      .catch(() => { for (const id of due) guaranteeChecked.current.delete(id) })
      .finally(() => { for (const id of due) guaranteeInFlight.current.delete(id) })
  }, [data, loadFailed, dataRef, saveData])

  // Every writer — the module, the calendar's ticks, the deadline panels —
  // saves through here, so this is where a school's status and its submit
  // task are kept in step, once for all of them.
  const saveApps = useCallback((next: ApplicationEntry[]) => {
    const before = new Map(dataRef.current.map((a) => [a.collegeId, a]))
    return saveData(next.map((a) => syncStatusWithTasks(before.get(a.collegeId), a)))
  }, [saveData, dataRef])

  const value = useMemo(
    () => ({ apps: data, appsRef: dataRef, saveApps, loaded, loadFailed, colleges }),
    [data, dataRef, saveApps, loaded, loadFailed, colleges],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider
export function useApplications(): ApplicationsValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApplications must be used inside <ApplicationsProvider>')
  return v
}
