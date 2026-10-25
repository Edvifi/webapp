/**
 * scholarshipTasks — each tracked scholarship's application to-do list, the
 * scholarship counterpart of applicationTasks.
 *
 * The list is built from what the catalogue row says to submit. Its wording is
 * free text ("Transcript", "Two letters of recommendation", "Minimum 3.0 GPA"),
 * so each line is matched against a short set of rules. A line that names
 * something else to send ("Proof of Hispanic heritage", "Original research
 * project") becomes a task in its own words. Eligibility lines match neither
 * and are left out, since there is nothing to do for them.
 *
 * Some tasks are done once for every scholarship (SHARED_SCHOLARSHIP_TASK_IDS):
 * their done state lives in one set per student, not on each item. The rest
 * are the item's own, stored on it (TrackerItem.tasks) once the student edits
 * the list, and derived from the requirements until then.
 */

import type { AppTask, TaskPhase } from './applicationsChecklist'
import type { TrackerItem, TrackerStatus } from '../lib/fafsaData'

interface Rule { id: string; test: RegExp; label: string; phase: TaskPhase }

const ESSAY = /essay|personal statement|statement of purpose|short answer/i

const RULES: Rule[] = [
  { id: 'transcript', test: /transcript/i, label: 'Get a copy of your transcript', phase: 'before' },
  { id: 'recs', test: /recommend|reference/i, label: 'Line up your recommenders', phase: 'before' },
  { id: 'resume', test: /r[ée]sum[ée]|activities list/i, label: 'Update your resume', phase: 'before' },
  { id: 'finances', test: /financial (information|documents?|statement)|tax return|income verification/i, label: 'Gather your family’s financial documents', phase: 'before' },
  { id: 'fafsa', test: /\bfafsa\b|student aid report/i, label: 'File the FAFSA', phase: 'before' },
  { id: 'css', test: /css profile/i, label: 'Submit the CSS Profile', phase: 'before' },
  { id: 'essay', test: ESSAY, label: 'Write the essay', phase: 'before' },
  { id: 'portfolio', test: /portfolio|work sample|video|audition/i, label: 'Prepare your portfolio or work sample', phase: 'before' },
  { id: 'interview', test: /interview/i, label: 'Prepare for the interview', phase: 'after' },
]

/** Something to produce or send, as opposed to who is eligible. */
const DELIVERABLE = /\b(proof|documentation|verification|scores?|project|report|paper|proposal|solution|nomination|endorsement|certificate|photo|budget|profile)\b/i

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Done once, counts for every scholarship that needs it. */
export const SHARED_SCHOLARSHIP_TASK_IDS: ReadonlySet<string> = new Set(['transcript', 'recs', 'resume', 'finances', 'fafsa', 'css'])

export const isSharedScholarshipTask = (task: AppTask): boolean => !task.custom && SHARED_SCHOLARSHIP_TASK_IDS.has(task.id)

/** Whether the scholarship asks for an essay or personal statement. */
export const needsEssay = (requirements: string[]): boolean => requirements.some((r) => ESSAY.test(r))

const task = (id: string, label: string, phase: TaskPhase): AppTask => ({ id, label, done: false, phase })

type Requirements = Pick<TrackerItem, 'requirements' | 'requiresFafsa' | 'requiresCss' | 'scholarshipId'>

/** The checklist a scholarship starts with, shared tasks included. */
export function defaultScholarshipTasks(item: Requirements): AppTask[] {
  const ids = new Set<string>()
  const own = new Map<string, string>()
  for (const req of item.requirements) {
    const rule = RULES.find((r) => r.test.test(req))
    if (rule) ids.add(rule.id)
    else if (DELIVERABLE.test(req)) own.set(`req-${slug(req)}`, req.trim())
  }
  if (item.requiresFafsa) ids.add('fafsa')
  if (item.requiresCss) ids.add('css')
  const tasks = RULES.filter((r) => ids.has(r.id)).map((r) => task(r.id, r.label, r.phase))
  for (const [id, label] of own) tasks.push(task(id, label, 'before'))
  // A student's own entry has no requirements on file; the first step is
  // finding out what it asks for.
  if (!item.scholarshipId) tasks.unshift(task('check', 'Check what the application asks for', 'before'))
  tasks.push(task('submit', 'Fill out and submit the application', 'submit'))
  return tasks
}

/** The full checklist: shared tasks (from the one set) followed by the item's own. */
export function scholarshipTasks(item: Requirements & Pick<TrackerItem, 'tasks'>, sharedDone: ReadonlySet<string>): AppTask[] {
  const defaults = defaultScholarshipTasks(item)
  const shared = defaults.filter(isSharedScholarshipTask).map((t) => ({ ...t, done: sharedDone.has(t.id) }))
  const own = item.tasks ?? defaults.filter((t) => !isSharedScholarshipTask(t))
  return [...shared, ...own]
}

/** What to store on the item: everything but the shared tasks. */
export const ownTasks = (tasks: AppTask[]): AppTask[] => tasks.filter((t) => !isSharedScholarshipTask(t))

/** Still being applied to, so its tasks still count. */
export const isOpenStatus = (status: TrackerStatus): boolean => status !== 'submitted' && status !== 'awarded'

export interface SharedScholarshipTask {
  id: string
  label: string
  done: boolean
  /** The open scholarships that need it. */
  itemIds: string[]
}

/** Each shared task needed by at least one open scholarship. */
export function sharedScholarshipSummary(items: TrackerItem[], sharedDone: ReadonlySet<string>): SharedScholarshipTask[] {
  const byId = new Map<string, SharedScholarshipTask>()
  for (const item of items) {
    if (!isOpenStatus(item.status)) continue
    for (const t of defaultScholarshipTasks(item)) {
      if (!isSharedScholarshipTask(t)) continue
      const entry = byId.get(t.id) ?? { id: t.id, label: t.label, done: sharedDone.has(t.id), itemIds: [] }
      entry.itemIds.push(item.id)
      byId.set(t.id, entry)
    }
  }
  return RULES.map((r) => byId.get(r.id)).filter((t): t is SharedScholarshipTask => !!t)
}
