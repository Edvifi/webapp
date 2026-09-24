/**
 * applicationTasks — the per-school application to-do list.
 *
 * Each college on the list gets a checklist of concrete steps to finish its
 * application, seeded from a smart default tailored to the school (deadline
 * type, public/private, 4-year vs community/trade) and then editable by the
 * student. Persisted on the ApplicationEntry (entry.tasks).
 */

import type { ApplicationEntry, AppTask, TaskPhase } from './applicationsChecklist'
import { getCollegeById } from './collegeData'
import { formatCollegeDate, parseIsoDay, type DeadlineEvent } from './applicationDeadlines'

/** Self-set task dates, distinct from the module's derived deadlines. */
const TASK_COLOR = '#6E6757'

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

/**
 * Apply a change to a shared task on every school that has it, withdrawn ones
 * included: it's the same piece of work, so a school brought back from
 * withdrawn is already in step, and ticking it on a withdrawn school's own
 * page works. Withdrawn schools still don't reach the calendar or the counts.
 */
export function updateSharedTask(apps: ApplicationEntry[], taskId: string, patch: Partial<Pick<AppTask, 'done' | 'due'>>): ApplicationEntry[] {
  return apps.map((a) => {
    const tasks = tasksForEntry(a)
    if (!tasks.some((t) => t.id === taskId && isSharedTask(t))) return a
    return { ...a, tasks: tasks.map((t) => (t.id === taskId && isSharedTask(t) ? { ...t, ...patch } : t)) }
  })
}

/** Check (or uncheck) a shared task on every school that has it. */
export function setSharedTask(apps: ApplicationEntry[], taskId: string, done: boolean): ApplicationEntry[] {
  return updateSharedTask(apps, taskId, { done })
}

/**
 * Starting checklist for a school joining the list: the default, with any
 * shared task the student has already finished carried over, so adding a
 * school doesn't make them redo a transcript request they already made.
 */
export function initialTasksFor(app: ApplicationEntry, existing: ApplicationEntry[]): AppTask[] {
  // Shared tasks carry over their tick and their date, so a new school joins
  // the same "one transcript, one date" as the rest of the list.
  // Withdrawn schools count too (a transcript already sent is still sent), but
  // active schools go first, so their date wins over an old one on a withdrawn school.
  const shared = new Map<string, { done: boolean; due?: string }>()
  const ordered = [...existing.filter((a) => a.status !== 'withdrawn'), ...existing.filter((a) => a.status === 'withdrawn')]
  for (const a of ordered) {
    for (const t of tasksForEntry(a)) {
      if (!isSharedTask(t)) continue
      const cur = shared.get(t.id) ?? { done: false }
      shared.set(t.id, { done: cur.done || t.done, due: cur.due ?? t.due })
    }
  }
  return defaultTasksFor(app).map((t) => {
    const s = isSharedTask(t) ? shared.get(t.id) : undefined
    return s ? { ...t, done: s.done, ...(s.due ? { due: s.due } : {}) } : t
  })
}

/**
 * Tasks the student has put their own date on, as DeadlineEvents.
 *
 * A college's application deadline is derived and fixed; these are the dates
 * the student set for the work leading up to it — have the essay drafted by
 * the 12th, ask for recommendations by the 15th. Those are usually the dates
 * that actually need remembering, and until now they lived only inside one
 * college's checklist where nothing else could see them.
 *
 * Marked `source: 'self'` because the student chose the date, and kept in the
 * Application Tracking module because the task belongs to a college. The id
 * encodes both halves so a tick on the calendar can find its way back to the
 * task it came from.
 */
export function deriveTaskEvents(apps: ApplicationEntry[]): DeadlineEvent[] {
  const events: DeadlineEvent[] = []
  // A shared task (one transcript, one set of recommendations) is one piece of
  // work however many schools need it, so schools sharing a date become one
  // event, not one per school. Dates normally agree (updateSharedTask keeps
  // them in step), but lists dated per school before that still can differ:
  // each distinct date stays on the calendar rather than being dropped.
  const sharedSeen = new Set<string>()
  const sharedGroup = new Map<string, number>() // `${taskId}|${due}` → schools
  const sharedNeed = new Map<string, number>() // taskId → active schools with it
  for (const app of apps) {
    if (app.status === 'withdrawn') continue
    for (const t of tasksForEntry(app)) {
      if (!isSharedTask(t)) continue
      sharedNeed.set(t.id, (sharedNeed.get(t.id) ?? 0) + 1)
      if (t.due) sharedGroup.set(`${t.id}|${t.due}`, (sharedGroup.get(`${t.id}|${t.due}`) ?? 0) + 1)
    }
  }
  for (const app of apps) {
    // A withdrawn application's tasks are not work any more.
    if (app.status === 'withdrawn') continue
    const college = getCollegeById(app.collegeId)
    const collegeName = college?.name ?? app.name ?? 'College'
    for (const task of tasksForEntry(app)) {
      if (!task.due) continue
      const date = parseIsoDay(task.due)
      if (!date) continue
      const group = isSharedTask(task) ? sharedGroup.get(`${task.id}|${task.due}`) ?? 1 : 1
      if (group > 1) {
        const key = `${task.id}|${task.due}`
        if (sharedSeen.has(key)) continue
        sharedSeen.add(key)
      }
      const forWhom = group <= 1 ? collegeName
        : group === sharedNeed.get(task.id) ? 'all your schools'
        : `${group} schools`
      events.push({
        id: taskEventId(app.collegeId, task.id),
        collegeId: app.collegeId,
        collegeName,
        typeLabel: 'Your own date',
        title: `${task.label} — ${forWhom}`,
        shortTitle: task.label.length <= 26 ? task.label : `${task.label.slice(0, 25)}…`,
        emoji: college?.emoji ?? '🎓',
        module: 'Application Tracking',
        category: 'own',
        source: 'self',
        sourceRef: app.collegeId,
        done: task.done,
        date,
        dateDisplay: formatCollegeDate(date),
        color: TASK_COLOR,
        estimated: false,
        isTask: true,
      })
    }
  }
  return events.sort((a, b) => a.date.getTime() - b.date.getTime())
}

/**
 * `task-<collegeId>::<taskId>`.
 *
 * Delimited by `::` because both halves can contain hyphens — college ids like
 * `cal-poly`, and every task the student adds themselves, which are `c-1`,
 * `c-2` and so on. A hyphen delimiter split those in the wrong place.
 */
export function taskEventId(collegeId: string, taskId: string): string {
  return `task-${collegeId}::${taskId}`
}

/** The college and task an event id refers to, or null if it is not one. */
export function parseTaskEventId(id: string): { collegeId: string; taskId: string } | null {
  const m = /^task-(.+)::(.+)$/.exec(id)
  return m ? { collegeId: m[1], taskId: m[2] } : null
}
