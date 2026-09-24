import { describe, it, expect } from 'vitest'
import { defaultTasksFor, deriveTaskEvents, initialTasksFor, setSharedTask, sharedTaskSummary, tasksForEntry, tasksForRound, updateSharedTask } from './applicationTasks'
import type { ApplicationEntry } from './applicationsChecklist'

const app = (collegeId: string, fields: Partial<ApplicationEntry> = {}): ApplicationEntry => ({
  collegeId, category: 'match', deadlineType: 'RD', status: 'not-started', ...fields,
})

const done = (a: ApplicationEntry, id: string) => tasksForEntry(a).find((t) => t.id === id)?.done

describe('shared tasks', () => {
  it('counts only schools that need each task', () => {
    const apps = [
      app('a', { ownership: 'Private nonprofit' }),
      app('b', { ownership: 'Public' }),
      app('c', { institutionType: '2yr' }),
    ]
    const byId = Object.fromEntries(sharedTaskSummary(apps).map((s) => [s.id, s.total]))
    expect(byId).toEqual({ recs: 2, transcript: 3, css: 1 })
  })

  it('ignores withdrawn schools', () => {
    const summary = sharedTaskSummary([app('a'), app('b', { status: 'withdrawn' })])
    expect(summary.find((s) => s.id === 'transcript')?.total).toBe(1)
  })

  it('checks a shared task on every school at once, leaving per-school tasks alone', () => {
    const next = setSharedTask([app('a'), app('b', { institutionType: 'trade' })], 'transcript', true)
    expect(next.map((a) => done(a, 'transcript'))).toEqual([true, true])
    expect(done(next[0], 'essays')).toBe(false)
    expect(sharedTaskSummary(next).find((s) => s.id === 'transcript')).toMatchObject({ done: 2, total: 2 })
  })

  it('leaves schools without the task untouched', () => {
    const trade = app('b', { institutionType: 'trade' })
    const [, b] = setSharedTask([app('a'), trade], 'recs', true)
    expect(b).toBe(trade)
  })

  it('does not treat a custom task with a shared id as shared', () => {
    const a = app('a', { tasks: [{ id: 'recs', label: 'Mine', done: false, phase: 'after', custom: true }] })
    expect(setSharedTask([a], 'recs', true)[0]).toBe(a)
  })

  it('carries finished shared tasks over to a newly added school', () => {
    const [existing] = setSharedTask([app('a')], 'recs', true)
    const tasks = initialTasksFor(app('new'), [existing])
    expect(tasks.find((t) => t.id === 'recs')?.done).toBe(true)
    expect(tasks.find((t) => t.id === 'transcript')?.done).toBe(false)
  })
})

describe('tasksForRound', () => {
  const saved = (deadlineType: ApplicationEntry['deadlineType']) => {
    const a = app('a', { deadlineType })
    return { ...a, tasks: defaultTasksFor(a).map((t) => (t.id === 'essays' ? { ...t, done: true } : t)) }
  }
  const agreement = (tasks?: ReturnType<typeof tasksForRound>) => tasks?.find((t) => t.id === 'agreement')

  it('leaves unsaved checklists alone (the default follows the round already)', () => {
    expect(tasksForRound(app('a'), 'ED')).toBeUndefined()
  })

  it('adds the agreement task, unchecked, when moving to ED', () => {
    const tasks = tasksForRound(saved('RD'), 'ED')
    expect(agreement(tasks)).toMatchObject({ label: 'Review & sign the ED agreement', done: false, phase: 'before' })
    expect(tasks?.find((t) => t.id === 'essays')?.done).toBe(true) // progress kept
  })

  it('relabels it between ED and REA, and drops it for RD', () => {
    expect(agreement(tasksForRound(saved('ED'), 'REA'))?.label).toBe('Review & sign the REA agreement')
    expect(agreement(tasksForRound(saved('ED'), 'RD'))).toBeUndefined()
  })
})

describe('shared task dates', () => {
  it('sets one date on every school that needs the task', () => {
    const next = updateSharedTask([app('a'), app('b')], 'transcript', { due: '2026-11-01' })
    expect(next.map((a) => tasksForEntry(a).find((t) => t.id === 'transcript')?.due)).toEqual(['2026-11-01', '2026-11-01'])
    expect(tasksForEntry(next[0]).find((t) => t.id === 'essays')?.due).toBeUndefined()
  })

  it('puts a shared task on the calendar once, for all schools', () => {
    const next = updateSharedTask([app('a', { name: 'Alpha' }), app('b', { name: 'Beta' })], 'transcript', { due: '2026-11-01' })
    const events = deriveTaskEvents(next)
    expect(events).toHaveLength(1)
    expect(events[0].title).toMatch(/— all your schools$/)
  })

  it('names the school when only one needs it', () => {
    const next = updateSharedTask([app('a', { name: 'Alpha' })], 'transcript', { due: '2026-11-01' })
    expect(deriveTaskEvents(next)[0].title).toMatch(/— Alpha$/)
  })
})

