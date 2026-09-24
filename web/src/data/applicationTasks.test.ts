import { describe, it, expect } from 'vitest'
import { deriveTaskEvents, taskEventId, parseTaskEventId } from './applicationTasks'
import type { ApplicationEntry, AppTask } from './applicationsChecklist'

const task = (over: Partial<AppTask> & { id: string }): AppTask =>
  ({ label: `Task ${over.id}`, done: false, phase: 'before', ...over })

const app = (over: Partial<ApplicationEntry> & { collegeId: string }): ApplicationEntry =>
  ({ category: 'match', deadlineType: 'RD', status: 'in-progress', name: over.collegeId, ...over } as ApplicationEntry)

describe('deriveTaskEvents', () => {
  it('only surfaces tasks the student put a date on', () => {
    const events = deriveTaskEvents([
      app({ collegeId: 'harvard', name: 'Harvard', tasks: [
        task({ id: 'a', due: '2026-10-15' }),
        task({ id: 'b' }),
      ] }),
    ])
    expect(events).toHaveLength(1)
    expect(events[0].shortTitle).toBe('Task a')
  })

  it('names the college, because the title travels away from it', () => {
    // On the calendar "Draft the essay" alone says nothing about which school.
    const [e] = deriveTaskEvents([
      app({ collegeId: 'harvard', name: 'Harvard', tasks: [task({ id: 'a', label: 'Draft the essay', due: '2026-10-15' })] }),
    ])
    expect(e.title).toBe('Draft the essay — Harvard')
    expect(e.collegeName).toBe('Harvard')
  })

  it('dates it on the day typed, not the day before', () => {
    // A bare `new Date(iso)` is UTC midnight, which is the 14th west of UTC.
    const [e] = deriveTaskEvents([
      app({ collegeId: 'h', tasks: [task({ id: 'a', due: '2026-10-15' })] }),
    ])
    expect(e.date.getMonth()).toBe(9)
    expect(e.date.getDate()).toBe(15)
  })

  it('marks it as the student\'s own, never estimated', () => {
    const [e] = deriveTaskEvents([app({ collegeId: 'h', tasks: [task({ id: 'a', due: '2026-10-15' })] })])
    expect(e.source).toBe('self')
    expect(e.estimated).toBe(false)
    // It belongs to a college, so it stays in that module.
    expect(e.module).toBe('Application Tracking')
  })

  it('carries the task\'s done state', () => {
    const [e] = deriveTaskEvents([
      app({ collegeId: 'h', tasks: [task({ id: 'a', due: '2026-10-15', done: true })] }),
    ])
    expect(e.done).toBe(true)
  })

  it('drops a withdrawn application\'s tasks', () => {
    // Not work any more.
    expect(deriveTaskEvents([
      app({ collegeId: 'h', status: 'withdrawn', tasks: [task({ id: 'a', due: '2026-10-15' })] }),
    ])).toEqual([])
  })

  it('ignores a date that is not a date', () => {
    expect(deriveTaskEvents([
      app({ collegeId: 'h', tasks: [task({ id: 'a', due: 'next Tuesday' })] }),
    ])).toEqual([])
  })

  it('sorts across colleges by date', () => {
    const events = deriveTaskEvents([
      app({ collegeId: 'yale', tasks: [task({ id: 'late', due: '2026-12-01' })] }),
      app({ collegeId: 'harvard', tasks: [task({ id: 'early', due: '2026-10-15' })] }),
    ])
    expect(events.map((e) => e.shortTitle)).toEqual(['Task early', 'Task late'])
  })

  it.each([
    ['harvard', 'c-1'],
    ['cal-poly', 'c-12'],
    ['harvard', 'draft-essay'],
    ['139658', 'c-1'],
  ])('round-trips %s / %s so a tick can find its task again', (collegeId, taskId) => {
    // Both halves can contain hyphens — cal-poly, and every task a student
    // adds themselves is c-1, c-2 and so on.
    expect(parseTaskEventId(taskEventId(collegeId, taskId))).toEqual({ collegeId, taskId })
  })

  it('does not claim ids belonging to other kinds of deadline', () => {
    for (const id of ['app-harvard-EA', 'scholarship-t1', 'fafsa-priority', 'own-abc']) {
      expect(parseTaskEventId(id)).toBeNull()
    }
  })
})
