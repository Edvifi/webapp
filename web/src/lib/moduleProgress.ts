/**
 * Generic per-module checklist persistence.
 *
 * - For `'fafsa'`, routes through the legacy `fafsa_user_module_state` table
 *   so existing data keeps working.
 * - For any other module name, stores progress under
 *   `profiles.settings.module_progress[moduleName]`.
 *
 * New modules (Testing, Applications, Essays, etc.) should call this API
 * with their own module name. If/when we migrate to a unified
 * `module_state` table, only this file needs to change.
 *
 * **Concurrency:** all non-FAFSA writes go through `serializeWrite`, a
 * single per-tab promise chain. The whole `read → modify → write`
 * sequence runs sequentially so rapid clicks (or simultaneous writes
 * from different modules sharing `profiles.settings`) land in order
 * instead of clobbering each other. Cross-tab races still possible —
 * a server-side jsonb_set RPC would close that gap.
 */

import { supabase } from './supabase'
import type { Json } from '../types/database'
import type { UserSettings } from '../types/user'
import {
  getChecklistProgress as fafsaGetChecklistProgress,
  setChecklistItem as fafsaSetChecklistItem,
  type ChecklistProgressMap,
  type ChecklistItemStatus,
} from './fafsaData'

export type { ChecklistProgressMap, ChecklistItemStatus }

const FAFSA_MODULE = 'fafsa'

// Single chain that serializes writes within a tab.
let writeChain: Promise<unknown> = Promise.resolve()

function serializeWrite<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.then(fn, fn)
  // Don't break the chain if a write rejects — subsequent writes should still run.
  writeChain = next.catch(() => undefined)
  return next
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Not signed in')
  return data.user.id
}

async function getSettings(uid: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', uid)
    .maybeSingle()
  if (error) throw error
  return (data?.settings as UserSettings | null) ?? null
}

export async function getModuleChecklistProgress(
  moduleName: string,
): Promise<ChecklistProgressMap> {
  if (moduleName === FAFSA_MODULE) {
    return fafsaGetChecklistProgress()
  }
  const uid = await currentUserId()
  const settings = await getSettings(uid)
  const all = settings?.module_progress ?? {}
  return (all[moduleName] as ChecklistProgressMap | undefined) ?? {}
}

export async function setModuleChecklistItem(
  moduleName: string,
  itemId: string,
  status: ChecklistItemStatus,
): Promise<ChecklistProgressMap> {
  if (moduleName === FAFSA_MODULE) {
    return fafsaSetChecklistItem(itemId, status)
  }
  return serializeWrite(async () => {
    const uid = await currentUserId()
    const settings = await getSettings(uid)
    const allProgress = settings?.module_progress ?? {}
    const moduleProgress: ChecklistProgressMap = {
      ...((allProgress[moduleName] as ChecklistProgressMap | undefined) ?? {}),
      [itemId]: status,
    }
    const nextSettings: UserSettings = {
      ...(settings ?? {}),
      module_progress: { ...allProgress, [moduleName]: moduleProgress },
    }
    const { error } = await supabase
      .from('profiles')
      .update({ settings: nextSettings as unknown as Json })
      .eq('id', uid)
    if (error) throw error
    return moduleProgress
  })
}

/* ─── Generic module key/value state ─── */

/**
 * Read an arbitrary value from a module's persisted state.
 * Stored at `profiles.settings.module_data[moduleName][key]`.
 */
export async function getModuleData<T = unknown>(
  moduleName: string,
  key: string,
): Promise<T | null> {
  const uid = await currentUserId()
  const settings = await getSettings(uid)
  const moduleSlice = settings?.module_data?.[moduleName]
  return ((moduleSlice?.[key] as T | undefined) ?? null)
}

/**
 * Write an arbitrary value to a module's persisted state.
 * Replaces the value at `module_data[moduleName][key]`.
 */
export async function setModuleData(
  moduleName: string,
  key: string,
  value: unknown,
): Promise<void> {
  return serializeWrite(async () => {
    const uid = await currentUserId()
    const settings = await getSettings(uid)
    const allData = settings?.module_data ?? {}
    const moduleSlice = allData[moduleName] ?? {}
    const nextSettings: UserSettings = {
      ...(settings ?? {}),
      module_data: {
        ...allData,
        [moduleName]: { ...moduleSlice, [key]: value },
      },
    }
    const { error } = await supabase
      .from('profiles')
      .update({ settings: nextSettings as unknown as Json })
      .eq('id', uid)
    if (error) throw error
  })
}
