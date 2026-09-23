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
import { formatCollegeDate, type DeadlineEvent } from './applicationDeadlines'

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

/** The current task list for an entry — its saved tasks, or the seeded default. */
export function tasksForEntry(app: ApplicationEntry): AppTask[] {
  return app.tasks ?? defaultTasksFor(app)
}

/** { done, total } progress for an entry. */
export function taskProgress(app: ApplicationEntry): { done: number; total: number } {
  const list = tasksForEntry(app)
  return { done: list.filter((x) => x.done).length, total: list.length }
}

/** Undone tasks aggregated by label across the whole list (how many schools still need each). */
export function remainingByLabel(apps: ApplicationEntry[]): Array<{ label: string; count: number }> {
  const m = new Map<string, number>()
  for (const a of apps) {
    for (const t of tasksForEntry(a)) {
      if (!t.done) m.set(t.label, (m.get(t.label) ?? 0) + 1)
    }
  }
  return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
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
  for (const app of apps) {
    // A withdrawn application's tasks are not work any more.
    if (app.status === 'withdrawn') continue
    const college = getCollegeById(app.collegeId)
    const collegeName = college?.name ?? app.name ?? 'College'
    for (const task of tasksForEntry(app)) {
      if (!task.due) continue
      const date = parseIsoDay(task.due)
      if (!date) continue
      events.push({
        id: taskEventId(app.collegeId, task.id),
        collegeId: app.collegeId,
        collegeName,
        typeLabel: 'Your own date',
        title: `${task.label} — ${collegeName}`,
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

/** Parse an ISO day as local midnight; `new Date(iso)` would read it as UTC. */
function parseIsoDay(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const d = new Date(`${iso}T00:00:00`)
  return isNaN(d.getTime()) ? null : d
}
