import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

// Real derivation, mocked I/O — the point of this suite is the wiring between
// the two data sources, which the pure derivation tests cannot reach.
const H = vi.hoisted(() => ({
  getModuleData: vi.fn(),
  setModuleData: vi.fn(),
  getTrackerItems: vi.fn(),
  updateTrackerStatus: vi.fn(),
}))
vi.mock('./moduleProgress', () => ({
  getModuleData: H.getModuleData, setModuleData: H.setModuleData,
}))
vi.mock('./fafsaData', () => ({
  getTrackerItems: H.getTrackerItems, updateTrackerStatus: H.updateTrackerStatus,
}))

import { useDeadlineEvents } from './useDeadlineEvents'

const SENIOR = 10

const apps = [{ collegeId: 'harvard', category: 'unranked', deadlineType: 'RD', status: 'not-started' }]
const scholarship = {
  id: 't1', scholarshipId: 's1', name: 'Coca-Cola Scholars', amount: '$20,000',
  deadline: 'Oct 2, 2026', deadlineDate: '2026-10-02', status: 'researching', type: null, source: null,
}

describe('useDeadlineEvents', () => {
  beforeEach(() => {
    H.getModuleData.mockReset()
    H.getTrackerItems.mockReset()
    H.setModuleData.mockReset().mockResolvedValue(undefined)
    H.updateTrackerStatus.mockReset().mockResolvedValue(undefined)
  })

  it('merges college and scholarship deadlines into one sorted list', async () => {
    H.getModuleData.mockResolvedValue(apps)
    H.getTrackerItems.mockResolvedValue([scholarship])

    const { result } = renderHook(() => useDeadlineEvents(SENIOR))
    await waitFor(() => expect(result.current.events.length).toBeGreaterThan(1))

    const ids = result.current.events.map((e) => e.id)
    expect(ids).toContain('scholarship-t1')
    expect(ids.some((id) => id.startsWith('app-'))).toBe(true)
    for (let i = 1; i < result.current.events.length; i++) {
      expect(result.current.events[i].date.getTime()).toBeGreaterThanOrEqual(result.current.events[i - 1].date.getTime())
    }
  })

  it('still shows college deadlines when the scholarship fetch fails', async () => {
    // Partial degradation: one broken source must not blank the whole view.
    H.getModuleData.mockResolvedValue(apps)
    H.getTrackerItems.mockRejectedValue(new Error('offline'))

    const { result } = renderHook(() => useDeadlineEvents(SENIOR))
    await waitFor(() => expect(result.current.events.length).toBeGreaterThan(0))
    expect(result.current.events.every((e) => !e.id.startsWith('scholarship-'))).toBe(true)
  })

  it('still shows scholarship deadlines when the college fetch fails', async () => {
    H.getModuleData.mockRejectedValue(new Error('offline'))
    H.getTrackerItems.mockResolvedValue([scholarship])

    const { result } = renderHook(() => useDeadlineEvents(SENIOR))
    await waitFor(() => expect(result.current.events.length).toBeGreaterThan(0))
    expect(result.current.events.map((e) => e.id)).toContain('scholarship-t1')
  })

  it('reports a failed source so the view can say so', async () => {
    // Without this an empty list looks like "you have nothing tracked", and the
    // view tells the student to add what they already added.
    H.getModuleData.mockResolvedValue(apps)
    H.getTrackerItems.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useDeadlineEvents(SENIOR))
    await waitFor(() => expect(result.current.failed).toBe(true))
  })

  it('does not fetch while inactive, and fetches once it becomes active', async () => {
    H.getModuleData.mockResolvedValue(apps)
    H.getTrackerItems.mockResolvedValue([scholarship])

    // The dashboard pauses whilst a module is open, then refetches on the way
    // back so a scholarship just added shows up.
    const { result, rerender } = renderHook(
      ({ active }) => useDeadlineEvents(SENIOR, { active }),
      { initialProps: { active: false } },
    )
    expect(H.getTrackerItems).not.toHaveBeenCalled()
    expect(result.current.events).toEqual([])

    rerender({ active: true })
    await waitFor(() => expect(result.current.events.length).toBeGreaterThan(0))
    expect(H.getTrackerItems).toHaveBeenCalledTimes(1)
  })
})

/**
 * Where a tick lands. This holds the promise that ticking a deadline on the
 * dashboard and marking it done inside its own module are the same act, so it
 * asserts the write rather than the rendering.
 */
describe('useDeadlineEvents — a tick writes through to the owning record', () => {
  const app = (status: string) => [
    { collegeId: 'harvard', category: 'unranked', deadlineType: 'EA', status },
  ]
  const sch = (status: string) => [{ ...scholarship, status }]

  /** module_data is one store with several keys; route each to its own value. */
  const stored = (over: Record<string, unknown>) =>
    H.getModuleData.mockImplementation((_m: string, key: string) =>
      Promise.resolve(over[key] ?? []))

  const tick = async (id: string) => {
    const { result } = renderHook(() => useDeadlineEvents(SENIOR))
    await waitFor(() => expect(result.current.events.some((e) => e.id === id)).toBe(true))
    const event = result.current.events.find((e) => e.id === id)!
    await act(async () => { result.current.toggleDone(event) })
    return { result, event }
  }

  beforeEach(() => {
    H.getModuleData.mockReset()
    H.getTrackerItems.mockReset().mockResolvedValue([])
    H.setModuleData.mockReset().mockResolvedValue(undefined)
    H.updateTrackerStatus.mockReset().mockResolvedValue(undefined)
  })

  it('marks the college list entry submitted, not a separate done list', async () => {
    stored({ apps: app('not-started') })
    await tick('app-harvard-EA')

    // The college list itself changed, and Application Tracking reads the same
    // rows — so the two views cannot now disagree.
    const write = H.setModuleData.mock.calls.find(([, k]) => k === 'apps')!
    expect(write[0]).toBe('applications')
    expect((write[2] as { status: string }[])[0].status).toBe('submitted')
    expect(H.setModuleData.mock.calls.some(([, k]) => k === 'done')).toBe(false)
  })

  it('puts back the status a tick overwrote, not a guess at it', async () => {
    // The mis-tap case: a not-started application ticked and immediately
    // untapped used to be left in-progress for good.
    stored({ apps: app('not-started') })
    const { result } = renderHook(() => useDeadlineEvents(SENIOR))
    await waitFor(() => expect(result.current.events.some((e) => e.id === 'app-harvard-EA')).toBe(true))

    const find = () => result.current.events.find((e) => e.id === 'app-harvard-EA')!
    await act(async () => { result.current.toggleDone(find()) })
    await act(async () => { result.current.toggleDone(find()) })

    const write = H.setModuleData.mock.calls.filter(([, k]) => k === 'apps').at(-1)!
    expect((write[2] as { status: string }[])[0].status).toBe('not-started')
  })

  it('tells the view which module a tick just changed', async () => {
    const onNotice = vi.fn()
    stored({ apps: app('not-started') })
    const { result } = renderHook(() => useDeadlineEvents(SENIOR, { onNotice }))
    await waitFor(() => expect(result.current.events.some((e) => e.id === 'app-harvard-EA')).toBe(true))
    await act(async () => {
      result.current.toggleDone(result.current.events.find((e) => e.id === 'app-harvard-EA')!)
    })
    // Editing a record on another page silently is how a student ends up
    // confused about why their application says submitted.
    expect(onNotice).toHaveBeenCalledWith(expect.stringContaining('Application Tracking'))
  })

  it('returns a college entry to in-progress when unticked', async () => {
    // 'submitted' is what a tick wrote, so the event arrives already done.
    stored({ apps: app('submitted') })
    const { event } = await tick('app-harvard-EA')
    expect(event.done).toBe(true)

    const write = H.setModuleData.mock.calls.find(([, k]) => k === 'apps')!
    expect((write[2] as { status: string }[])[0].status).toBe('in-progress')
  })

  it('marks a tracked scholarship submitted through the tracker', async () => {
    H.getModuleData.mockResolvedValue([])
    H.getTrackerItems.mockResolvedValue(sch('researching'))
    await tick('scholarship-t1')

    expect(H.updateTrackerStatus).toHaveBeenCalledWith('t1', 'submitted')
    // Nothing leaked into the settings-backed fallback.
    expect(H.setModuleData).not.toHaveBeenCalled()
  })

  it('returns a scholarship to ready when unticked', async () => {
    H.getModuleData.mockResolvedValue([])
    H.getTrackerItems.mockResolvedValue(sch('submitted'))
    await tick('scholarship-t1')
    expect(H.updateTrackerStatus).toHaveBeenCalledWith('t1', 'ready')
  })

  it('keeps the FAFSA tick in the stored list, since no record owns that date', async () => {
    // FAFSA priority is one date derived from the whole college list. There is
    // no row to put a status on, so the id list is the only place it can go.
    stored({ apps: app('not-started') })
    await tick('fafsa-priority')

    const write = H.setModuleData.mock.calls.filter(([, k]) => k === 'done').at(-1)!
    expect(write[2]).toEqual(['fafsa-priority'])
  })

  it('keeps a self-set date ticked in the stored list', async () => {
    stored({
      own: [{ id: 'own-1', title: 'Ask Ms. Reyes', date: '2026-10-02', module: 'Application Tracking' }],
    })
    await tick('own-1')

    const write = H.setModuleData.mock.calls.filter(([, k]) => k === 'done').at(-1)!
    expect(write[2]).toEqual(['own-1'])
  })

  it('shows the tick immediately rather than waiting for the write', async () => {
    // The write never settles; the row still has to respond.
    H.setModuleData.mockReturnValue(new Promise(() => {}))
    stored({ apps: app('not-started') })
    const { result } = await tick('app-harvard-EA')
    expect(result.current.events.find((e) => e.id === 'app-harvard-EA')!.done).toBe(true)
  })

  it('reports a failed write so the view can say so', async () => {
    H.setModuleData.mockRejectedValue(new Error('offline'))
    stored({ apps: app('not-started') })
    const { result } = await tick('app-harvard-EA')
    await waitFor(() => expect(result.current.failed).toBe(true))
  })
})

describe('useDeadlineEvents — a dated college task', () => {
  const withTask = (done = false) => [{
    collegeId: 'cal-poly', category: 'unranked', deadlineType: 'RD', status: 'in-progress',
    name: 'Cal Poly',
    tasks: [{ id: 'c-1', label: 'Ask Ms. Reyes', done, phase: 'before', custom: true, due: '2026-10-02' }],
  }]

  beforeEach(() => {
    H.getModuleData.mockReset()
    H.getTrackerItems.mockReset().mockResolvedValue([])
    H.setModuleData.mockReset().mockResolvedValue(undefined)
    H.updateTrackerStatus.mockReset().mockResolvedValue(undefined)
  })

  const stored = (over: Record<string, unknown>) =>
    H.getModuleData.mockImplementation((_m: string, key: string) => Promise.resolve(over[key] ?? []))

  it('shows up beside every other deadline', async () => {
    stored({ apps: withTask() })
    const { result } = renderHook(() => useDeadlineEvents(SENIOR))
    await waitFor(() => expect(result.current.events.length).toBeGreaterThan(0))

    const task = result.current.events.find((e) => e.id.startsWith('task-'))
    expect(task).toBeDefined()
    // The college's own deadline is derived and fixed; this one is theirs.
    expect(task!.source).toBe('self')
    expect(task!.title).toContain('Cal Poly')
  })

  it('writes a tick back to the task, not to the stored id list', async () => {
    // Otherwise the calendar and the college's own checklist disagree about
    // whether the same thing is done.
    stored({ apps: withTask() })
    const { result } = renderHook(() => useDeadlineEvents(SENIOR))
    await waitFor(() => expect(result.current.events.some((e) => e.id.startsWith('task-'))).toBe(true))

    const event = result.current.events.find((e) => e.id.startsWith('task-'))!
    await act(async () => { result.current.toggleDone(event) })

    const write = H.setModuleData.mock.calls.find(([, k]) => k === 'apps')!
    const tasks = (write[2] as Array<{ tasks: Array<{ id: string; done: boolean }> }>)[0].tasks
    expect(tasks.find((t) => t.id === 'c-1')!.done).toBe(true)
    expect(H.setModuleData.mock.calls.some(([, k]) => k === 'done')).toBe(false)
  })

  it('unticks it again', async () => {
    stored({ apps: withTask(true) })
    const { result } = renderHook(() => useDeadlineEvents(SENIOR))
    await waitFor(() => expect(result.current.events.some((e) => e.id.startsWith('task-'))).toBe(true))

    const event = result.current.events.find((e) => e.id.startsWith('task-'))!
    expect(event.done).toBe(true)
    await act(async () => { result.current.toggleDone(event) })

    const write = H.setModuleData.mock.calls.find(([, k]) => k === 'apps')!
    const tasks = (write[2] as Array<{ tasks: Array<{ id: string; done: boolean }> }>)[0].tasks
    expect(tasks.find((t) => t.id === 'c-1')!.done).toBe(false)
  })

  it('ticks a shared task for every school that needs it', async () => {
    // One transcript, one set of recommendations: ticking it off the calendar
    // must match ticking it on any school's page.
    const recs = (collegeId: string, name: string) => ({
      collegeId, name, category: 'match', deadlineType: 'RD', status: 'in-progress',
      tasks: [{ id: 'recs', label: 'Request teacher recommendations', done: false, phase: 'before', due: '2026-10-02' }],
    })
    stored({ apps: [recs('sc-1', 'Alpha'), recs('sc-2', 'Beta')] })
    const { result } = renderHook(() => useDeadlineEvents(SENIOR))
    await waitFor(() => expect(result.current.events.some((e) => e.id.startsWith('task-'))).toBe(true))

    const taskEvents = result.current.events.filter((e) => e.id.startsWith('task-'))
    expect(taskEvents).toHaveLength(1) // one event, not one per school
    await act(async () => { result.current.toggleDone(taskEvents[0]) })

    const write = H.setModuleData.mock.calls.find(([, k]) => k === 'apps')!
    const apps = write[2] as Array<{ tasks: Array<{ id: string; done: boolean }> }>
    expect(apps.map((a) => a.tasks.find((t) => t.id === 'recs')!.done)).toEqual([true, true])
  })
})
