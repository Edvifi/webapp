import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Real derivation, mocked I/O — the point of this suite is the wiring between
// the two data sources, which the pure derivation tests cannot reach.
const H = vi.hoisted(() => ({
  getModuleData: vi.fn(),
  getTrackerItems: vi.fn(),
}))
vi.mock('./moduleProgress', () => ({ getModuleData: H.getModuleData }))
vi.mock('./fafsaData', () => ({ getTrackerItems: H.getTrackerItems }))

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
  })

  it('merges college and scholarship deadlines into one sorted list', async () => {
    H.getModuleData.mockResolvedValue(apps)
    H.getTrackerItems.mockResolvedValue([scholarship])

    const { result } = renderHook(() => useDeadlineEvents(SENIOR))
    await waitFor(() => expect(result.current.length).toBeGreaterThan(1))

    const ids = result.current.map((e) => e.id)
    expect(ids).toContain('scholarship-t1')
    expect(ids.some((id) => id.startsWith('app-'))).toBe(true)
    for (let i = 1; i < result.current.length; i++) {
      expect(result.current[i].date.getTime()).toBeGreaterThanOrEqual(result.current[i - 1].date.getTime())
    }
  })

  it('still shows college deadlines when the scholarship fetch fails', async () => {
    // Partial degradation: one broken source must not blank the whole view.
    H.getModuleData.mockResolvedValue(apps)
    H.getTrackerItems.mockRejectedValue(new Error('offline'))

    const { result } = renderHook(() => useDeadlineEvents(SENIOR))
    await waitFor(() => expect(result.current.length).toBeGreaterThan(0))
    expect(result.current.every((e) => !e.id.startsWith('scholarship-'))).toBe(true)
  })

  it('still shows scholarship deadlines when the college fetch fails', async () => {
    H.getModuleData.mockRejectedValue(new Error('offline'))
    H.getTrackerItems.mockResolvedValue([scholarship])

    const { result } = renderHook(() => useDeadlineEvents(SENIOR))
    await waitFor(() => expect(result.current.length).toBeGreaterThan(0))
    expect(result.current.map((e) => e.id)).toContain('scholarship-t1')
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
    expect(result.current).toEqual([])

    rerender({ active: true })
    await waitFor(() => expect(result.current.length).toBeGreaterThan(0))
    expect(H.getTrackerItems).toHaveBeenCalledTimes(1)
  })
})
