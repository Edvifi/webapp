import { describe, it, expect } from 'vitest'
import { defaultTasksFor, deriveTaskEvents, initialTasksFor, setSharedTask, sharedTaskSummary, tasksForEntry, tasksForRound, updateSharedTask, suggestedWaiverDue, applicationFeeFact, WAIVER_LEAD_DAYS } from './applicationTasks'
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
    // The waiver follows the four-year schools: 'c' is a community college,
    // which almost never charges an application fee to waive.
    expect(byId).toEqual({ recs: 2, transcript: 3, css: 1, waiver: 2 })
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
    // A real saved list, plus a custom task that happens to reuse the id.
    const base = app('a')
    const a = app('a', {
      tasks: [
        ...defaultTasksFor(base),
        { id: 'recs', label: 'Mine', done: false, phase: 'after', custom: true },
      ],
    })
    const [out] = setSharedTask([a], 'recs', true)
    const byCustom = Object.fromEntries(
      (out.tasks ?? []).filter((t) => t.id === 'recs').map((t) => [t.custom ? 'custom' : 'default', t.done]),
    )
    expect(byCustom).toEqual({ default: true, custom: false })
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


describe('fee waivers need lead time', () => {
  const idsOf = (a: ApplicationEntry) => defaultTasksFor(a).map((t) => t.id)
  const phaseOf = (a: ApplicationEntry, id: string) => defaultTasksFor(a).find((t) => t.id === id)?.phase

  it('asks about the waiver before applying, and pays at submit', () => {
    // One task used to do both: "Pay the application fee (or apply for a
    // waiver)", in the submit phase. A waiver cannot be a submit-day job.
    const a = app('a')
    expect(phaseOf(a, 'waiver')).toBe('before')
    expect(phaseOf(a, 'fee')).toBe('submit')
  })

  it('is one request for the whole list, unlike the fee itself', () => {
    // A granted Common App waiver applies at every Common App school; paying
    // is per school.
    const [out] = setSharedTask([app('a'), app('b')], 'waiver', true)
    expect(out.tasks?.find((t) => t.id === 'waiver')?.done).toBe(true)
    const [feeOut] = setSharedTask([app('a'), app('b')], 'fee', true)
    expect(feeOut.tasks?.find((t) => t.id === 'fee')?.done).not.toBe(true)
  })

  it('leaves community colleges alone', () => {
    // 611 of the 1,128 schools in the Common App grid charge nothing to apply,
    // and two-year schools are overwhelmingly among them.
    expect(idsOf(app('c', { institutionType: '2yr' }))).not.toContain('waiver')
    expect(idsOf(app('a'))).toContain('waiver')
  })

  it('counts back a month from the deadline', () => {
    expect(WAIVER_LEAD_DAYS).toBe(30)
    // Across a month boundary, which naive date arithmetic gets wrong.
    expect(suggestedWaiverDue(new Date(2027, 0, 2)).toDateString()).toBe(new Date(2026, 11, 3).toDateString())
  })

  it('reaches a list saved before the task existed', () => {
    // Default tasks cannot be deleted, so a saved list missing one is simply
    // old — a student who added a school last month should not be the only one
    // without this step.
    const old = defaultTasksFor(app('a')).filter((t) => t.id !== 'waiver')
    const topped = tasksForEntry(app('a', { tasks: old }))
    expect(topped.find((t) => t.id === 'waiver')).toBeDefined()
    expect(topped.find((t) => t.id === 'waiver')?.phase).toBe('before')
  })

  it('leaves a complete list exactly as it was', () => {
    const entry = app('a', { tasks: defaultTasksFor(app('a')) })
    expect(tasksForEntry(entry)).toBe(entry.tasks)
  })
})

describe('application fees', () => {
  const idsOf = (a: ApplicationEntry) => defaultTasksFor(a).map((t) => t.id)

  it('says free rather than $0, and never invents either answer', () => {
    expect(applicationFeeFact(app('a', { applicationFeeCents: 0 })).amount).toBe('Free to apply')
    expect(applicationFeeFact(app('a', { applicationFeeCents: 8500 })).amount).toBe('$85')
    // No figure is its own answer. An invented $0 is a promise; an invented
    // fee is a reason not to apply.
    expect(applicationFeeFact(app('a')).amount).toBe('Fee not on file')
  })

  it('says whether a waiver is taken, when the grid told us', () => {
    const note = (p?: string) => applicationFeeFact(app('a', { applicationFeeCents: 8500, feeWaiverPolicy: p })).note
    expect(note('accepted')).toBe('Fee waivers accepted')
    expect(note('us_only')).toBe('Fee waivers accepted')
    expect(note('not_accepted')).toBe('No fee waivers here')
    expect(note(undefined)).toBe('Ask about a waiver')
  })

  it('drops the waiver task where there is no fee to waive', () => {
    expect(idsOf(app('a', { applicationFeeCents: 0 }))).not.toContain('waiver')
    expect(idsOf(app('a', { applicationFeeCents: 8500 }))).toContain('waiver')
  })

  it('falls back to the school type when no fee is on file', () => {
    // Most of the 6,273 colleges have no grid row at all.
    expect(idsOf(app('a'))).toContain('waiver')
    expect(idsOf(app('c', { institutionType: '2yr' }))).not.toContain('waiver')
  })

  it('keeps the waiver on a free two-year school that actually charges', () => {
    // The real figure beats the guess, in both directions.
    expect(idsOf(app('c', { institutionType: '2yr', applicationFeeCents: 4000 }))).toContain('waiver')
  })
})
