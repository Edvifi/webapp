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
 *
 * `saveData` resolves `true` when the write reached the server and `false`
 * when it was rolled back, so a caller holding something expensive to
 * regenerate (an AI response) can tell the user instead of watching it vanish.
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
    // Sync the ref now, not after the next render: a handler that runs after
    // an await (e.g. applying an AI response) must read-modify-write against
    // the latest value, not the one from the render it was created in.
    dataRef.current = next
    setData(next)
    try {
      await setModuleData(moduleName, key, next)
      return true
    }
    // Only rollback if our optimistic value is still current — a later write
    // may have already superseded it.
    catch {
      setData((prev) => prev === next ? before : prev)
      // Same guard as the state rollback above, and it matters more here.
      // Writes fire per keystroke, so several are usually in flight; when an
      // earlier one fails after a later one succeeded, rewinding the ref past
      // the newer value would discard those keystrokes and the next save would
      // persist the truncated text.
      if (dataRef.current === next) dataRef.current = before
      return false
    }
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
    valueRef.current = next
    setValue(next)
    try {
      await setModuleData(moduleName, key, next)
      return true
    }
    catch {
      setValue((prev) => prev === next ? before : prev)
      if (valueRef.current === next) valueRef.current = before
      return false
    }
  }, [moduleName, key])

  return { value, save, loaded, valueRef }
}
