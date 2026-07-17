/**
 * Hooks for the per-module checklist + data state that every module shell
 * shares. Each owns its load-on-open, optimistic writes, and rollback.
 *
 * The two loaders both read `profiles.settings` on open; `moduleProgress`
 * coalesces concurrent reads so a module open is a single round trip.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getModuleChecklistProgress,
  setModuleChecklistItem,
  getModuleData,
  setModuleData,
  type ChecklistProgressMap,
  type ChecklistItemStatus,
} from './moduleProgress'

const nextStatus = (s: ChecklistItemStatus): ChecklistItemStatus =>
  s === 'available' ? 'in-progress' : s === 'in-progress' ? 'completed' : 'available'

/**
 * Checklist progress with optimistic status writes.
 * `handleToggle` cycles available → in-progress → completed → available;
 * `handleMarkComplete` toggles completed ⇄ available.
 */
export function useModuleChecklist(moduleName: string, open: boolean) {
  const [progress, setProgress] = useState<ChecklistProgressMap>({})
  // Ref mirrors state so persist callbacks read the latest value for
  // rollback / read-modify even under rapid concurrent calls.
  const progressRef = useRef(progress)
  useEffect(() => { progressRef.current = progress }, [progress])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    getModuleChecklistProgress(moduleName).then((p) => { if (!cancelled) setProgress(p) }).catch(() => {})
    return () => { cancelled = true }
  }, [open, moduleName])

  const persistStatus = useCallback(async (itemId: string, next: ChecklistItemStatus) => {
    const before = progressRef.current[itemId] ?? 'available'
    setProgress((prev) => ({ ...prev, [itemId]: next }))
    try { await setModuleChecklistItem(moduleName, itemId, next) }
    catch { setProgress((prev) => prev[itemId] === next ? { ...prev, [itemId]: before } : prev) }
  }, [moduleName])

  const handleToggle = useCallback((itemId: string) => {
    persistStatus(itemId, nextStatus(progressRef.current[itemId] ?? 'available'))
  }, [persistStatus])

  const handleMarkComplete = useCallback((itemId: string) => {
    const current = progressRef.current[itemId] ?? 'available'
    persistStatus(itemId, current === 'completed' ? 'available' : 'completed')
  }, [persistStatus])

  return { progress, handleToggle, handleMarkComplete }
}

/**
 * A module's array-valued data slice (drafts, applications, …) with an
 * optimistic `saveData`. `dataRef` exposes the latest value for handlers that
 * read-modify-write (e.g. "add if not present").
 */
export function useModuleData<D>(moduleName: string, key: string, open: boolean) {
  const [data, setData] = useState<D[]>([])
  const dataRef = useRef(data)
  useEffect(() => { dataRef.current = data }, [data])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    getModuleData<D[]>(moduleName, key).then((d) => { if (!cancelled && Array.isArray(d)) setData(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [open, moduleName, key])

  const saveData = useCallback(async (next: D[]) => {
    const before = dataRef.current
    setData(next)
    try { await setModuleData(moduleName, key, next) }
    // Only rollback if our optimistic value is still current — a later write
    // may have already superseded it.
    catch { setData((prev) => prev === next ? before : prev) }
  }, [moduleName, key])

  return { data, saveData, dataRef }
}

/**
 * Single-object (non-array) module-data state with optimistic writes.
 * Loads on open, merges the stored value over `initial`, and persists a whole
 * object. `loaded` flips true after the first read so callers can gate first-run UI.
 */
export function useModuleValue<V extends object>(moduleName: string, key: string, open: boolean, initial: V) {
  const [value, setValue] = useState<V>(initial)
  const [loaded, setLoaded] = useState(false)
  const valueRef = useRef(value)
  useEffect(() => { valueRef.current = value }, [value])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    getModuleData<Partial<V>>(moduleName, key)
      .then((d) => { if (!cancelled) { if (d && typeof d === 'object') setValue((prev) => ({ ...prev, ...d })); setLoaded(true) } })
      .catch(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [open, moduleName, key])

  const save = useCallback(async (next: V) => {
    const before = valueRef.current
    setValue(next)
    try { await setModuleData(moduleName, key, next) }
    catch { setValue((prev) => prev === next ? before : prev) }
  }, [moduleName, key])

  return { value, save, loaded, valueRef }
}
