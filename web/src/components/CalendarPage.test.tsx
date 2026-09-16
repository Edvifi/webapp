import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Real derivation and real rendering; only the two data fetches are mocked.
const H = vi.hoisted(() => ({
  getModuleData: vi.fn(),
  getTrackerItems: vi.fn(),
  downloadIcs: vi.fn(),
}))
vi.mock('../lib/moduleProgress', () => ({ getModuleData: H.getModuleData }))
vi.mock('../lib/fafsaData', () => ({ getTrackerItems: H.getTrackerItems }))
vi.mock('../lib/calendarExport', () => ({ downloadIcs: H.downloadIcs }))

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
    H.downloadIcs.mockClear()
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

  /** An early round at one school and a regular round at another, plus a
   *  scholarship. The college list also yields a FAFSA event. Group predicates
   *  themselves are covered in applicationDeadlines.test.ts; these tests are
   *  about the picker reaching the export with the right selection. */
  const mixedList = () => {
    H.getModuleData.mockResolvedValue([
      { collegeId: 'harvard', name: 'Harvard', deadlineType: 'EA', status: 'not-started' },
      { collegeId: 'yale', name: 'Yale', deadlineType: 'RD', status: 'not-started' },
    ])
    H.getTrackerItems.mockResolvedValue([tracked()])
  }

  const exportWith = async (groupId: string, toggles: string[] = []) => {
    await userEvent.selectOptions(await screen.findByLabelText('Export'), groupId)
    for (const t of toggles) await userEvent.click(screen.getByLabelText(t))
    await userEvent.click(screen.getByRole('button', { name: 'Add to my calendar' }))
    const [events, filename, opts] = H.downloadIcs.mock.calls.at(-1)!
    return { ids: (events as { id: string }[]).map((e) => e.id), filename, opts }
  }

  it('exports the chosen group, named after it', async () => {
    mixedList()
    render(<CalendarPage startIdx={SENIOR} />)
    const { ids, filename, opts } = await exportWith('early')
    expect(ids).toEqual(['app-harvard-EA'])
    expect(filename).toBe('edvifi-early.ics')
    // The calendar app shows this on import, so it must name the group.
    expect(opts.calendarName).toBe('Edvifi — Early rounds only')
  })

  it('exports everything under "all"', async () => {
    mixedList()
    render(<CalendarPage startIdx={SENIOR} />)
    const { ids, filename } = await exportWith('all')
    expect(ids.sort()).toEqual(
      ['app-harvard-EA', 'app-yale-RD', 'fafsa-priority', 'scholarship-t1'].sort(),
    )
    expect(filename).toBe('edvifi-deadlines.ics')
  })

  it('drops estimated dates when asked for confirmed ones only', async () => {
    H.getModuleData.mockResolvedValue([
      { collegeId: 'harvard', name: 'Harvard', deadlineType: 'EA', status: 'not-started' },
    ])
    H.getTrackerItems.mockResolvedValue([
      // Recurring text, so the date is inferred rather than known.
      tracked({ deadline: 'September 15 (annual)', deadlineDate: null }),
    ])
    render(<CalendarPage startIdx={SENIOR} />)
    await screen.findAllByText('Coca-Cola Scholars')

    const { ids, filename } = await exportWith('all', ['Confirmed dates only'])
    expect(ids).not.toContain('scholarship-t1')
    expect(ids).toContain('app-harvard-EA')
    // The suffix keeps this from overwriting the unfiltered export.
    expect(filename).toBe('edvifi-deadlines-confirmed.ics')
  })

  it('disables the export when a toggle empties the chosen group', async () => {
    H.getTrackerItems.mockResolvedValue([
      tracked({ deadline: 'September 15 (annual)', deadlineDate: null }),
    ])
    render(<CalendarPage startIdx={SENIOR} />)

    await userEvent.selectOptions(await screen.findByLabelText('Export'), 'scholarships')
    expect(screen.getByRole('button', { name: 'Add to my calendar' })).toBeEnabled()
    // The only scholarship has an estimated date, so nothing is left to send.
    await userEvent.click(screen.getByLabelText('Confirmed dates only'))
    expect(screen.getByRole('button', { name: 'Add to my calendar' })).toBeDisabled()
  })

  it('shows a count against every group so an empty one is visible', async () => {
    H.getTrackerItems.mockResolvedValue([tracked()])
    render(<CalendarPage startIdx={SENIOR} />)
    // Only a scholarship is tracked: no college deadlines exist to export.
    expect(await screen.findByRole('option', { name: /Every college deadline — 0/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Scholarships only — 1/ })).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Export'), 'applications')
    expect(screen.getByRole('button', { name: 'Add to my calendar' })).toBeDisabled()
  })
})
