/**
 * Hooks for the per-module checklist + data state that every module shell
 * shares. Each owns its load-on-open, optimistic writes, and rollback.
 *
 * The two loaders both read `profiles.settings` on open; `moduleProgress`
 * coalesces concurrent reads so a module open is a single round trip.
 *
 * Both failure paths are told to the student. A failed *load* used to leave a
 * checklist looking freshly empty, which reads as "none of my work saved" and
 * invites redoing it. A failed *write* rolled the tick back silently, so the
 * box just refused to stay ticked with no reason given.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from '../contexts/ToastContext'
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
  // Held in a ref, not read as a dependency: this effect should re-run when
  // the module opens or changes, and for no other reason. Depending on the
  // toast object's identity would tie a data load to a context re-render —
  // stable today only because ToastProvider memoises its value, which is not
  // a promise this hook should be relying on.
  const toast = useToast()
  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])
  const [progress, setProgress] = useState<ChecklistProgressMap>({})
  // Ref mirrors state so persist callbacks read the latest value for
  // rollback / read-modify even under rapid concurrent calls.
  const progressRef = useRef(progress)
  useEffect(() => { progressRef.current = progress }, [progress])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    getModuleChecklistProgress(moduleName)
      .then((p) => { if (!cancelled) setProgress(p) })
      .catch(() => {
        if (!cancelled) {
          toastRef.current.error("Couldn't load your progress here — it is saved, but this list may look empty until you reload.")
        }
      })
    return () => { cancelled = true }
  }, [open, moduleName])

  const persistStatus = useCallback(async (itemId: string, next: ChecklistItemStatus) => {
    const before = progressRef.current[itemId] ?? 'available'
    setProgress((prev) => ({ ...prev, [itemId]: next }))
    try { await setModuleChecklistItem(moduleName, itemId, next) }
    catch {
      setProgress((prev) => prev[itemId] === next ? { ...prev, [itemId]: before } : prev)
      toastRef.current.error("Couldn't save that — check your connection and try again.")
    }
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

  // True only once a read has actually come back. Every write is a whole-array
  // replace built from `dataRef`, so saving before the first read completes —
  // or after one failed — would persist an empty list over the student's saved
  // drafts. Read in the save path via a ref so it is current, not captured.
  const loadedRef = useRef(false)
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    // The ref is what gates writes, so reset it synchronously; the matching
    // state is only for display and is set from the callbacks, which keeps
    // this effect body free of synchronous setState.
    loadedRef.current = false
    getModuleData<D[]>(moduleName, key)
      .then((d) => {
        if (cancelled) return
        if (Array.isArray(d)) { setData(d); dataRef.current = d }
        // A new account legitimately reads back nothing; that is still a
        // completed read, so writing is safe from here.
        loadedRef.current = true
        setLoaded(true)
        setLoadFailed(false)
      })
      .catch(() => { if (!cancelled) setLoadFailed(true) })
    return () => { cancelled = true }
  }, [open, moduleName, key])

  const saveData = useCallback(async (next: D[]) => {
    // Refuse rather than destroy. Without a completed read this write would
    // replace everything stored with a list built from nothing.
    if (!loadedRef.current) return false
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

  return { data, saveData, dataRef, loaded, loadFailed }
}

/**
 * Single-object (non-array) module-data state with optimistic writes.
 * Loads on open, merges the stored value over `initial`, and persists a whole
 * object. `loaded` flips true after the first read so callers can gate first-run UI.
 */
export function useModuleValue<V extends object>(moduleName: string, key: string, open: boolean, initial: V) {
  const [value, setValue] = useState<V>(initial)
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const valueRef = useRef(value)
  useEffect(() => { valueRef.current = value }, [value])
  // `loaded` stays true after a failed read so callers keep their first-run UI
  // gate; this tracks whether the read actually succeeded, which is what
  // decides if a whole-object write is safe.
  const readOkRef = useRef(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    readOkRef.current = false
    getModuleData<Partial<V>>(moduleName, key)
      .then((d) => {
        if (cancelled) return
        if (d && typeof d === 'object') setValue((prev) => ({ ...prev, ...d }))
        readOkRef.current = true
        setLoaded(true)
        setLoadFailed(false)
      })
      .catch(() => { if (!cancelled) { setLoadFailed(true); setLoaded(true) } })
    return () => { cancelled = true }
  }, [open, moduleName, key])

  const save = useCallback(async (next: V) => {
    // Same reasoning as useModuleData: a whole-object write built on defaults
    // would overwrite whatever the failed read could not show us.
    if (!readOkRef.current) return false
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

  return { value, save, loaded, loadFailed, valueRef }
}
