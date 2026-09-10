import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Real derivation and real rendering; only the two data fetches are mocked.
const H = vi.hoisted(() => ({
  getModuleData: vi.fn(),
  getTrackerItems: vi.fn(),
}))
vi.mock('../lib/moduleProgress', () => ({ getModuleData: H.getModuleData }))
vi.mock('../lib/fafsaData', () => ({ getTrackerItems: H.getTrackerItems }))

import CalendarPage from './CalendarPage'

const SENIOR = 10
/** Pinned so the calendar opens on a known month regardless of the real date. */
const NOW = new Date(2026, 8, 4)

const tracked = (over: Record<string, unknown> = {}) => ({
  id: 't1', scholarshipId: 's1', name: 'Coca-Cola Scholars', amount: '$20,000',
  deadline: 'Sep 15, 2026', deadlineDate: '2026-09-15',
  status: 'researching', type: null, source: null, ...over,
})

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(NOW)
    H.getModuleData.mockResolvedValue([])
    H.getTrackerItems.mockResolvedValue([])
  })
  afterEach(() => vi.useRealTimers())

  it('shows a tracked scholarship on its deadline date', async () => {
    H.getTrackerItems.mockResolvedValue([tracked()])
    render(<CalendarPage startIdx={SENIOR} />)
    // Twice on purpose: a pill in the day cell and a row in the month list.
    const hits = await screen.findAllByText('Coca-Cola Scholars')
    expect(hits.length).toBeGreaterThanOrEqual(2)
  })

  it('marks a recurring deadline as estimated', async () => {
    // No real date, so the month/day comes from the text and the student is
    // told the placement is approximate.
    H.getTrackerItems.mockResolvedValue([
      tracked({ deadline: 'September 15 (annual)', deadlineDate: null }),
    ])
    render(<CalendarPage startIdx={SENIOR} />)
    await screen.findAllByText('Coca-Cola Scholars')
    expect(screen.getByText(/Financial Aid · est\./)).toBeInTheDocument()
  })

  it('leaves a scholarship with no usable date off the calendar', async () => {
    H.getTrackerItems.mockResolvedValue([
      tracked({ deadline: 'Varies - check official site', deadlineDate: null }),
    ])
    render(<CalendarPage startIdx={SENIOR} />)
    expect(await screen.findByText(/to see their deadlines here/)).toBeInTheDocument()
    expect(screen.queryByText('Coca-Cola Scholars')).not.toBeInTheDocument()
  })
})
