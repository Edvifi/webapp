import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Real derivation and real rendering; only the two data fetches are mocked.
const H = vi.hoisted(() => ({
  getModuleData: vi.fn(),
  setModuleData: vi.fn(),
  getTrackerItems: vi.fn(),
  downloadIcs: vi.fn(),
}))
vi.mock('../lib/moduleProgress', () => ({
  getModuleData: H.getModuleData, setModuleData: H.setModuleData,
}))
vi.mock('../lib/fafsaData', () => ({ getTrackerItems: H.getTrackerItems }))
vi.mock('../lib/calendarExport', () => ({ downloadIcs: H.downloadIcs }))
// The page reads deadline preferences from the profile and reports a tick
// through the toast; neither has a provider in these tests.
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ profile: null }) }))
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ info: vi.fn(), error: vi.fn(), success: vi.fn() }),
}))

import CalendarPage from './CalendarPage'
import { ApplicationsProvider } from '../contexts/ApplicationsContext'

// The college list is owned by the provider, so the page needs it in scope.
const renderPage = () => render(
  <ApplicationsProvider><CalendarPage startIdx={SENIOR} /></ApplicationsProvider>,
)

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
    // One mock serves the college list, the self-set dates and the done set;
    // an empty array is the right empty for all three.
    H.getModuleData.mockResolvedValue([])
    H.setModuleData.mockResolvedValue(undefined)
    H.getTrackerItems.mockResolvedValue([])
    H.downloadIcs.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  /** Export lives behind a button now; open it before reaching its controls. */
  const openExport = () => userEvent.click(screen.getByRole('button', { name: 'Export dates' }))

  it('pins a tracked scholarship on its deadline date', async () => {
    H.getTrackerItems.mockResolvedValue([tracked()])
    renderPage()
    // The grid names it on the 15th; the detail panel below shows whichever
    // day is selected, which on arrival is today.
    expect(await screen.findByText('Coca-Cola Scholars')).toBeInTheDocument()
  })

  it('opens on today and shows that day underneath', async () => {
    H.getTrackerItems.mockResolvedValue([tracked({ deadline: 'Sep 4, 2026', deadlineDate: '2026-09-04' })])
    renderPage()
    expect(await screen.findByRole('heading', { name: /Friday, September 4/ })).toBeInTheDocument()
    // Named twice now: the pin in the cell and the row in the day panel.
    expect(screen.getAllByText('Coca-Cola Scholars').length).toBeGreaterThanOrEqual(2)
  })

  it('shows a picked day in the panel below the grid', async () => {
    H.getTrackerItems.mockResolvedValue([tracked()])
    renderPage()
    await screen.findByText('Coca-Cola Scholars')
    // Nothing is due today, so the panel says so until a day is picked.
    expect(screen.getByText('Nothing on this day')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Tuesday, September 15.*1 due/ }))
    expect(await screen.findByRole('heading', { name: /Tuesday, September 15/ })).toBeInTheDocument()
    expect(screen.getByText('Scholarship')).toBeInTheDocument()
  })

  it('marks a recurring deadline as estimated', async () => {
    // No real date, so the month/day comes from the text and the student is
    // told the placement is approximate.
    H.getTrackerItems.mockResolvedValue([
      tracked({ deadline: 'September 15 (annual)', deadlineDate: null }),
    ])
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /September 15.*1 due/ }))
    expect(screen.getByText('est.')).toBeInTheDocument()
  })

  it('leaves a scholarship with no usable date off the calendar', async () => {
    H.getTrackerItems.mockResolvedValue([
      tracked({ deadline: 'Varies - check official site', deadlineDate: null }),
    ])
    renderPage()
    expect(await screen.findByText(/Add colleges in Application Tracking/)).toBeInTheDocument()
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
    await openExport()
    await userEvent.selectOptions(screen.getByLabelText('Which dates'), groupId)
    for (const t of toggles) await userEvent.click(screen.getByLabelText(t))
    await userEvent.click(screen.getByRole('button', { name: 'Download .ics' }))
    const [events, filename, opts] = H.downloadIcs.mock.calls.at(-1)!
    return { ids: (events as { id: string }[]).map((e) => e.id), filename, opts }
  }

  it('exports the chosen group, named after it', async () => {
    mixedList()
    renderPage()
    const { ids, filename, opts } = await exportWith('early')
    expect(ids).toEqual(['app-harvard-EA'])
    expect(filename).toBe('edvifi-early.ics')
    // The calendar app shows this on import, so it must name the group.
    expect(opts.calendarName).toBe('Edvifi — Early rounds only')
  })

  it('exports everything under "all"', async () => {
    mixedList()
    renderPage()
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
    renderPage()
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
    renderPage()

    await openExport()
    await userEvent.selectOptions(screen.getByLabelText('Which dates'), 'scholarships')
    expect(screen.getByRole('button', { name: 'Download .ics' })).toBeEnabled()
    // The only scholarship has an estimated date, so nothing is left to send.
    await userEvent.click(screen.getByLabelText('Confirmed dates only'))
    expect(screen.getByRole('button', { name: 'Download .ics' })).toBeDisabled()
  })

  it('shows a count against every group so an empty one is visible', async () => {
    H.getTrackerItems.mockResolvedValue([tracked()])
    renderPage()
    await screen.findByText('Coca-Cola Scholars')
    await openExport()
    // Only a scholarship is tracked: no college deadlines exist to export.
    expect(screen.getByRole('option', { name: /Every college deadline — 0/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Scholarships only — 1/ })).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Which dates'), 'applications')
    expect(screen.getByRole('button', { name: 'Download .ics' })).toBeDisabled()
  })
  it('opens a deadline from its tile, without changing the selected day', async () => {
    H.getTrackerItems.mockResolvedValue([tracked()])
    renderPage()
    await screen.findByText('Coca-Cola Scholars')
    // The day panel still shows today, which has nothing on it.
    expect(screen.getByText('Nothing on this day')).toBeInTheDocument()

    // The tile entry, not the day behind it.
    const tile = screen.getAllByRole('button', { name: /Coca-Cola Scholars/ })[0]
    await userEvent.click(tile)

    const panel = await screen.findByRole('dialog', { name: 'Coca-Cola Scholars' })
    expect(within(panel).getByLabelText('Your notes')).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: /Mark Coca-Cola Scholars as complete/ })).toBeInTheDocument()
    // Reading a deadline is not picking its day.
    expect(screen.getByText('Nothing on this day')).toBeInTheDocument()
  })

  it('adds your own date on the day you picked, prefilled', async () => {
    H.getTrackerItems.mockResolvedValue([])
    renderPage()
    await screen.findByRole('heading', { name: /Friday, September 4/ })

    await userEvent.click(screen.getByRole('button', { name: '+ Add your own date' }))
    // The day already chosen is the day it lands on — no retyping it.
    expect(screen.getByLabelText('When?')).toHaveValue('2026-09-04')
    await userEvent.type(screen.getByLabelText('What is it?'), 'Ask for a reference')
    expect(screen.getByRole('button', { name: 'Add it' })).toBeEnabled()
  })

  it('says the export is a copy, not a live link', async () => {
    H.getTrackerItems.mockResolvedValue([tracked()])
    renderPage()
    // "Add to my calendar" read as though it added something to this one.
    await openExport()
    expect(screen.getByRole('button', { name: 'Download .ics' })).toBeInTheDocument()
    expect(screen.getByText(/copy, not a live link/)).toBeInTheDocument()
  })
})
