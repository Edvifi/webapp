import { describe, it, expect } from 'vitest'
import { defaultTasksFor, deriveTaskEvents, initialTasksFor, setSharedTask, sharedTaskSummary, tasksForEntry, tasksForRound, updateSharedTask } from './applicationTasks'
import { withKnownCategory, type ApplicationEntry } from './applicationsChecklist'

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

describe('shared task dates, merge follow-ups', () => {
  it('gives a newly added school the shared date as well as the tick', () => {
    const [a] = updateSharedTask([app('a')], 'recs', { due: '2026-10-15', done: true })
    const recs = initialTasksFor(app('new'), [a]).find((t) => t.id === 'recs')
    expect(recs).toMatchObject({ done: true, due: '2026-10-15' })
  })

  it('keeps different dates saved per school (before shared dates) on the calendar', () => {
    const [a] = updateSharedTask([app('a', { name: 'Alpha' })], 'recs', { due: '2026-10-01' })
    const [b] = updateSharedTask([app('b', { name: 'Beta' })], 'recs', { due: '2026-11-15' })
    const titles = deriveTaskEvents([a, b]).map((e) => e.title)
    expect(titles).toEqual(['Request teacher recommendations — Alpha', 'Request teacher recommendations — Beta'])
  })

  it('keeps withdrawn schools in step, but off the calendar', () => {
    const next = updateSharedTask([app('a', { name: 'Alpha' }), app('b', { status: 'withdrawn' })], 'recs', { due: '2026-10-15' })
    expect(tasksForEntry(next[1]).find((t) => t.id === 'recs')?.due).toBe('2026-10-15')
    // One active school has it, so the event names that school.
    expect(deriveTaskEvents(next).map((e) => e.title)).toEqual(['Request teacher recommendations — Alpha'])
  })

  it('carries a tick from a withdrawn school to a new one', () => {
    const [done] = setSharedTask([app('a', { status: 'withdrawn' })], 'transcript', true)
    expect(initialTasksFor(app('new'), [done]).find((t) => t.id === 'transcript')?.done).toBe(true)
  })
})

describe('seeding a new school from withdrawn ones', () => {
  it('prefers an active school’s shared date over a withdrawn one’s', () => {
    const [old] = updateSharedTask([app('w', { status: 'withdrawn' })], 'transcript', { due: '2025-10-01' })
    const [cur] = updateSharedTask([app('a')], 'transcript', { due: '2026-11-01' })
    const seeded = initialTasksFor(app('new'), [old, cur]).find((t) => t.id === 'transcript')
    expect(seeded?.due).toBe('2026-11-01')
  })
})

describe('withKnownCategory', () => {
  it('turns a category this build doesn’t know into unranked, and leaves known ones', () => {
    expect(withKnownCategory(app('a', { category: 'mystery' as never })).category).toBe('unranked')
    const known = app('b', { category: 'reach' })
    expect(withKnownCategory(known)).toBe(known)
  })
})

