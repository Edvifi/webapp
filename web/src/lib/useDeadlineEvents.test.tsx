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
