/**
 * applicationTasks — the per-school application to-do list.
 *
 * Each college on the list gets a checklist of concrete steps to finish its
 * application, seeded from a smart default tailored to the school (deadline
 * type, public/private, 4-year vs community/trade) and then editable by the
 * student. Persisted on the ApplicationEntry (entry.tasks).
 */

import type { ApplicationEntry, AppTask, TaskPhase } from './applicationsChecklist'

export const TASK_PHASES: Array<{ id: TaskPhase; title: string }> = [
  { id: 'before', title: 'Before you apply' },
  { id: 'submit', title: 'Submit' },
  { id: 'after', title: 'After you submit' },
]

const isTwoYearOrTrade = (app: ApplicationEntry) =>
  app.institutionType === '2yr' || app.institutionType === 'trade'
const isPrivate = (app: ApplicationEntry) =>
  (app.ownership ?? '').toLowerCase().includes('private')
const isEarlyBinding = (app: ApplicationEntry) =>
  app.deadlineType === 'ED' || app.deadlineType === 'REA'

const t = (id: string, label: string, phase: TaskPhase): AppTask => ({ id, label, done: false, phase })

/** The default checklist for a school, tailored to its type and deadline plan. */
export function defaultTasksFor(app: ApplicationEntry): AppTask[] {
  const fourYear = !isTwoYearOrTrade(app)
  const tasks: AppTask[] = []

  // ── Before you apply ──
  tasks.push(t('account', 'Create the application account', 'before'))
  if (fourYear) {
    tasks.push(t('commonapp', 'Add to Common App “My Colleges”', 'before'))
    tasks.push(t('essays', 'Draft the supplemental essay(s)', 'before'))
    tasks.push(t('recs', 'Request teacher recommendations', 'before'))
  }
  if (isEarlyBinding(app)) {
    tasks.push(t('agreement', `Review & sign the ${app.deadlineType} agreement`, 'before'))
  }

  // ── Submit ──
  tasks.push(t('fee', 'Pay the application fee (or apply for a waiver)', 'submit'))
  tasks.push(t('transcript', 'Send your official transcript (via counselor)', 'submit'))
  if (fourYear) {
    tasks.push(t('scores', 'Send test scores (or confirm test-optional)', 'submit'))
    if (isPrivate(app)) tasks.push(t('css', 'Complete the CSS Profile', 'submit'))
  }
  tasks.push(t('submit', 'Submit the application', 'submit'))

  // ── After you submit ──
  tasks.push(t('portal', 'Set up the applicant portal', 'after'))
  tasks.push(t('confirm', 'Confirm all materials received (no “missing” items)', 'after'))

  return tasks
}

/**
 * A saved checklist brought in line with a new application round. Only the
 * binding-agreement task depends on the round: it's added (unchecked) when the
 * school moves to ED/REA, relabelled when it moves between them, and dropped
 * when it leaves them. Returns undefined when the entry has no saved tasks,
 * since the default list is already derived from the round.
 */
export function tasksForRound(app: ApplicationEntry, deadlineType: ApplicationEntry['deadlineType']): AppTask[] | undefined {
  if (!app.tasks) return undefined
  const next = { ...app, deadlineType }
  const wanted = defaultTasksFor(next).find((t) => t.id === 'agreement')
  const has = app.tasks.some((t) => t.id === 'agreement' && !t.custom)
  if (wanted && has) return app.tasks.map((t) => (t.id === 'agreement' && !t.custom ? { ...t, label: wanted.label } : t))
  if (wanted) {
    // Keep it with the other "before" tasks, after the last one.
    const lastBefore = app.tasks.map((t) => t.phase).lastIndexOf('before')
    const out = [...app.tasks]
    out.splice(lastBefore + 1, 0, wanted)
    return out
  }
  return app.tasks.filter((t) => !(t.id === 'agreement' && !t.custom))
}

/** The current task list for an entry — its saved tasks, or the seeded default. */
export function tasksForEntry(app: ApplicationEntry): AppTask[] {
  return app.tasks ?? defaultTasksFor(app)
}

/** { done, total } progress for an entry. */
export function taskProgress(app: ApplicationEntry): { done: number; total: number } {
  const list = tasksForEntry(app)
  return { done: list.filter((x) => x.done).length, total: list.length }
}

/**
 * Tasks that are done once for the whole list rather than once per school.
 * Teacher recommendations are requested once through the Common App, the
 * counselor sends one transcript that every school receives, and a single CSS
 * Profile goes to all the schools that need it. Test scores, fees and essays
 * are deliberately not here: each school needs its own.
 */
export const SHARED_TASK_IDS: ReadonlySet<string> = new Set(['recs', 'transcript', 'css'])

export const isSharedTask = (task: AppTask): boolean => !task.custom && SHARED_TASK_IDS.has(task.id)

export interface SharedTaskSummary {
  id: string
  label: string
  /** Schools on the list that need this task. */
  total: number
  /** How many of those have it checked. */
  done: number
  /** The schools that need it, in list order. */
  collegeIds: string[]
}

/**
 * The shared tasks that apply to at least one active school, in default
 * checklist order. Withdrawn schools don't count toward what's still needed.
 */
export function sharedTaskSummary(apps: ApplicationEntry[]): SharedTaskSummary[] {
  const byId = new Map<string, SharedTaskSummary>()
  for (const a of apps) {
    if (a.status === 'withdrawn') continue
    for (const t of tasksForEntry(a)) {
      if (!isSharedTask(t)) continue
      const s = byId.get(t.id) ?? { id: t.id, label: t.label, total: 0, done: 0, collegeIds: [] }
      s.total += 1
      s.collegeIds.push(a.collegeId)
      if (t.done) s.done += 1
      byId.set(t.id, s)
    }
  }
  return [...byId.values()]
}

/** Check (or uncheck) a shared task on every school that has it. */
export function setSharedTask(apps: ApplicationEntry[], taskId: string, done: boolean): ApplicationEntry[] {
  return apps.map((a) => {
    const tasks = tasksForEntry(a)
    if (!tasks.some((t) => t.id === taskId && isSharedTask(t))) return a
    return { ...a, tasks: tasks.map((t) => (t.id === taskId && isSharedTask(t) ? { ...t, done } : t)) }
  })
}

/**
 * Starting checklist for a school joining the list: the default, with any
 * shared task the student has already finished carried over, so adding a
 * school doesn't make them redo a transcript request they already made.
 */
export function initialTasksFor(app: ApplicationEntry, existing: ApplicationEntry[]): AppTask[] {
  const finished = new Set(
    existing.flatMap((a) => tasksForEntry(a)).filter((t) => isSharedTask(t) && t.done).map((t) => t.id),
  )
  return defaultTasksFor(app).map((t) => (isSharedTask(t) && finished.has(t.id) ? { ...t, done: true } : t))
}
