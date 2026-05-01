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

const FAFSA_MODULE = 'fafsa'

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
}
