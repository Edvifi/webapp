/**
 * personalDeadlines — the dates a student sets for themselves, and the ones
 * they have ticked off.
 *
 * Every other DeadlineEvent is *derived*: a college's Early Action date, a
 * scholarship's closing date, the FAFSA priority date. Those are facts about
 * the world and the student cannot edit them. These two are the opposite —
 * they are the student's own record, so they persist rather than derive.
 *
 * Both live under `profiles.settings.module_data.deadlines`, through
 * moduleProgress's `merge_settings` path: the server shallow-merges only the
 * key being written, so saving a new date can't clobber a tick made in another
 * tab a moment earlier. No new table, because a handful of rows per student
 * doesn't earn one.
 */

import { getModuleData, setModuleData } from './moduleProgress'
import { formatCollegeDate, type DeadlineEvent, type DeadlineModule } from '../data/applicationDeadlines'

export const DEADLINES_MODULE = 'deadlines'
const OWN_KEY = 'own'
const DONE_KEY = 'done'

/** A date the student typed in themselves. */
export interface PersonalDeadline {
  id: string
  title: string
  /** ISO `YYYY-MM-DD`, stored as written — this is a local calendar day, not
   *  an instant, so it never carries a timezone. */
  date: string
  /** Which part of the app it belongs beside. */
  module: DeadlineModule
}

/** `own-…`, distinct from the `app-` / `scholarship-` / `fafsa-` ids that
 *  derivation produces, so the two can never collide in a done set. */
const newId = (): string =>
  `own-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/** Colour for a self-set date. Deliberately one colour rather than the
 *  module's: the dashed outline is what marks these as the student's own, and
 *  a second signal per module would compete with it. */
const OWN_COLOR = '#6E6757'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Parse an ISO day as local midnight. `new Date('2026-11-01')` is UTC, which
 *  lands on 31 October for every timezone west of Greenwich. */
function parseIsoDay(iso: string): Date | null {
  if (!ISO_DATE.test(iso)) return null
  const d = new Date(`${iso}T00:00:00`)
  return isNaN(d.getTime()) ? null : d
}

/** Inverse of parseIsoDay, for writing a Date back to storage. */
export function toIsoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Anything that survived a round trip through storage, narrowed to the rows we
 * can actually render. Settings are user-writable JSON, so a row with no title
 * or an unparseable date is dropped rather than trusted into the UI.
 */
function readOwn(raw: unknown): PersonalDeadline[] {
  if (!Array.isArray(raw)) return []
  const out: PersonalDeadline[] = []
  for (const row of raw) {
    if (typeof row !== 'object' || row === null) continue
    const { id, title, date, module } = row as Record<string, unknown>
    if (typeof id !== 'string' || typeof title !== 'string' || typeof date !== 'string') continue
    if (!title.trim() || !ISO_DATE.test(date)) continue
    out.push({
      id,
      title: title.trim(),
      date,
      module: module === 'Financial Aid' ? 'Financial Aid' : 'Application Tracking',
    })
  }
  return out
}

export async function getPersonalDeadlines(): Promise<PersonalDeadline[]> {
  return readOwn(await getModuleData(DEADLINES_MODULE, OWN_KEY))
}

export async function savePersonalDeadlines(items: PersonalDeadline[]): Promise<void> {
  await setModuleData(DEADLINES_MODULE, OWN_KEY, items)
}

/** Ids of events the student has ticked off — derived ones included, which is
 *  why this is a flat id list rather than a flag on the personal rows. */
export async function getDoneIds(): Promise<string[]> {
  const raw = await getModuleData(DEADLINES_MODULE, DONE_KEY)
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []
}

export async function saveDoneIds(ids: string[]): Promise<void> {
  await setModuleData(DEADLINES_MODULE, DONE_KEY, ids)
}

/** Build a row from what the add-a-date form collected. */
export function makePersonalDeadline(
  title: string,
  date: string,
  module: DeadlineModule,
): PersonalDeadline {
  return { id: newId(), title: title.trim(), date, module }
}

/**
 * Turn self-set dates into the same DeadlineEvent shape everything else uses,
 * so the panel, the week strip and the calendar need no special case — only
 * `source` tells them apart, and only where the design says it should.
 *
 * Unlike derived events these are never estimated and never re-based into the
 * application cycle: the student named an exact day and meant it.
 */
export function deriveOwnEvents(items: PersonalDeadline[]): DeadlineEvent[] {
  const events: DeadlineEvent[] = []
  for (const item of items) {
    const date = parseIsoDay(item.date)
    if (!date) continue
    events.push({
      id: item.id,
      collegeId: null,
      collegeName: null,
      typeLabel: 'Your own date',
      title: item.title,
      shortTitle: item.title.length <= 26 ? item.title : `${item.title.slice(0, 25)}…`,
      emoji: '📌',
      module: item.module,
      category: 'own',
      source: 'self',
      date,
      dateDisplay: formatCollegeDate(date),
      color: OWN_COLOR,
      estimated: false,
    })
  }
  return events.sort((a, b) => a.date.getTime() - b.date.getTime())
}
