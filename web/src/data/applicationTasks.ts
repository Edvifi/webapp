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

/** The current task list for an entry — its saved tasks, or the seeded default. */
export function tasksForEntry(app: ApplicationEntry): AppTask[] {
  return app.tasks ?? defaultTasksFor(app)
}

/** { done, total } progress for an entry. */
export function taskProgress(app: ApplicationEntry): { done: number; total: number } {
  const list = tasksForEntry(app)
  return { done: list.filter((x) => x.done).length, total: list.length }
}
