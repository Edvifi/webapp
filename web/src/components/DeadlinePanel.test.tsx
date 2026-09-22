import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DeadlinePanel from './DeadlinePanel'
import type { DeadlineEvent } from '../data/applicationDeadlines'

/** Pinned so "Today" and "Tomorrow" mean known dates. */
const NOW = new Date(2026, 8, 4)
const day = (offset: number) => new Date(2026, 8, 4 + offset)

const ev = (over: Partial<DeadlineEvent> & { id: string }): DeadlineEvent => ({
  collegeId: null, collegeName: null, typeLabel: '', title: over.id, shortTitle: over.id,
  emoji: '', module: 'Application Tracking', category: 'application', source: 'derived',
  date: day(0), dateDisplay: '', color: '#000', estimated: false, ...over,
})

const noop = () => {}
const renderPanel = (events: DeadlineEvent[], over: Partial<Parameters<typeof DeadlinePanel>[0]> = {}) =>
  render(
    <DeadlinePanel
      events={events} now={NOW} failed={false}
      onToggle={noop} onAdd={noop} onRemove={noop} onCorrect={noop} onOpenCalendar={noop}
      {...over}
    />,
  )

describe('DeadlinePanel', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); vi.setSystemTime(NOW) })
  afterEach(() => vi.useRealTimers())

  it('heads each group in the words a student would use', () => {
    renderPanel([
      ev({ id: 'late', date: day(-2) }),
      ev({ id: 'now', date: day(0) }),
      ev({ id: 'tmr', date: day(1) }),
      ev({ id: 'later', date: day(4) }),
    ])
    expect(screen.getByText(/Overdue/)).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Tomorrow')).toBeInTheDocument()
    // Beyond tomorrow the weekday carries it; "in 4 days" makes the reader count.
    expect(screen.getByText(/Tuesday, Sep 8/)).toBeInTheDocument()
  })

  it('says how late an overdue deadline is', () => {
    renderPanel([ev({ id: 'late', date: day(-3) })])
    expect(screen.getByText('3d late')).toBeInTheDocument()
  })

  it('lists only the week, but says what is coming after it', () => {
    renderPanel([ev({ id: 'soon', date: day(2) }), ev({ id: 'far', date: day(30) })])
    // Rows stop at a week; the calendar holds the rest.
    expect(screen.getByRole('button', { name: /soon/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /far/ })).not.toBeInTheDocument()
    // But "how long have I got" is the question a student is really asking,
    // and nothing inside a seven-day window can answer it.
    expect(screen.getByText(/After this week/)).toHaveTextContent('about 4 weeks')
  })

  it('says nothing about the horizon when there is nothing beyond the week', () => {
    renderPanel([ev({ id: 'soon', date: day(2) })])
    expect(screen.queryByText(/After this week/)).not.toBeInTheDocument()
  })

  it('leaves a completed deadline out of the horizon', () => {
    renderPanel([ev({ id: 'far', date: day(30), done: true })])
    expect(screen.queryByText(/After this week/)).not.toBeInTheDocument()
  })

  it('hides completed deadlines until asked for them', async () => {
    renderPanel([ev({ id: 'done-one', done: true }), ev({ id: 'open-one' })])
    expect(screen.queryByText('done-one')).not.toBeInTheDocument()
    expect(screen.getByText('1 open')).toBeInTheDocument()
    expect(screen.getByText('1 done')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Show completed' }))
    expect(screen.getByText('done-one')).toBeInTheDocument()
  })

  it('hands the whole event back when a deadline is ticked', async () => {
    // Not the id: only the event knows which record owns the deadline, and so
    // where the tick has to be written.
    const onToggle = vi.fn()
    const event = ev({ id: 'harvard', sourceRef: 'harvard' })
    renderPanel([event], { onToggle })
    await userEvent.click(screen.getByRole('button', { name: /harvard/ }))
    expect(onToggle).toHaveBeenCalledWith(event)
  })

  it('offers removal only for dates the student set themselves', () => {
    renderPanel([
      ev({ id: 'mine', source: 'self', category: 'own' }),
      ev({ id: 'theirs' }),
    ])
    // A college's deadline is a fact, not something to delete.
    expect(screen.getByRole('button', { name: 'Remove mine' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove theirs' })).not.toBeInTheDocument()
  })

  it('adds a date of your own', async () => {
    const onAdd = vi.fn()
    renderPanel([], { onAdd })
    await userEvent.click(screen.getByRole('button', { name: /Add a date of your own/ }))

    // Nothing to save until both halves are answered.
    expect(screen.getByRole('button', { name: 'Add it' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('What is it?'), 'Ask Ms. Reyes')
    expect(screen.getByRole('button', { name: 'Add it' })).toBeDisabled()

    await userEvent.type(screen.getByLabelText('When?'), '2026-09-09')
    await userEvent.selectOptions(screen.getByLabelText(/Where does it belong/), 'Financial Aid')
    await userEvent.click(screen.getByRole('button', { name: 'Add it' }))

    expect(onAdd).toHaveBeenCalledWith('Ask Ms. Reyes', '2026-09-09', 'Financial Aid')
    // The form closes so the list is readable again.
    expect(screen.queryByLabelText('What is it?')).not.toBeInTheDocument()
  })

  it('tells an empty student where to start, and a stocked one where to look', () => {
    const { unmount } = renderPanel([])
    expect(screen.getByText(/Add colleges in Application Tracking/)).toBeInTheDocument()
    unmount()

    renderPanel([ev({ id: 'far', date: day(40) })])
    expect(screen.getByText(/Open the calendar/)).toBeInTheDocument()
  })

  it('names the kind of each deadline that has no round to say it', () => {
    renderPanel([
      ev({ id: 'b', category: 'scholarship', module: 'Financial Aid' }),
      ev({ id: 'c', category: 'fafsa', module: 'Financial Aid' }),
      ev({ id: 'd', category: 'own', source: 'self' }),
    ])
    for (const l of ['Scholarship', 'Federal', 'Mine']) {
      expect(screen.getByText(l)).toBeInTheDocument()
    }
  })

  it('lets the round stand in for the kind on a college deadline', () => {
    // "EA" already says this is a college application. At aside width a
    // fourth chip wrapped the meta onto a third line for nothing.
    renderPanel([ev({ id: 'a', category: 'application', deadlineType: 'EA' })])
    expect(screen.getByText('EA')).toBeInTheDocument()
    expect(screen.queryByText('College')).not.toBeInTheDocument()
  })

  it('still names the kind on a rolling application, which has no round chip', () => {
    // Rolling is excluded from the round chip, so nothing else would say it.
    renderPanel([ev({ id: 'a', category: 'application' })])
    expect(screen.getByText('College')).toBeInTheDocument()
  })

  it('surfaces a load failure rather than showing an empty list as truth', () => {
    renderPanel([], { failed: true })
    expect(screen.getByText(/check your connection/)).toBeInTheDocument()
  })

  it('marks an estimated date so it is not read as exact', () => {
    renderPanel([ev({ id: 'guess', estimated: true })])
    const row = screen.getByText('guess').closest('.dl-row') as HTMLElement
    expect(within(row).getByText('est.')).toBeInTheDocument()
  })
})

describe('DeadlinePanel — a date we invented', () => {
  const invented = (over: Partial<DeadlineEvent> = {}) =>
    ev({ id: 'osu', title: 'Ohio State — Early Action', collegeName: 'Ohio State',
         estimated: true, estimateReason: 'no-source', date: day(3), ...over })

  it('says plainly that the date is not the school\'s', () => {
    renderPanel([invented()])
    // "est." is far too quiet for a date nothing about which came from them.
    expect(screen.getByText('no date on file')).toBeInTheDocument()
  })

  it('still says only est. for a curated day moved into this cycle', () => {
    renderPanel([invented({ id: 'harvard', estimateReason: 'cycle-year' })])
    expect(screen.getByText('est.')).toBeInTheDocument()
    expect(screen.queryByText('no date on file')).not.toBeInTheDocument()
  })

  it('takes the real date from the student', async () => {
    const onCorrect = vi.fn()
    renderPanel([invented()], { onCorrect })
    await userEvent.click(screen.getByRole('button', { name: 'Set date' }))
    const field = screen.getByLabelText(/Ohio State deadline, from their site/)
    await userEvent.clear(field)
    await userEvent.type(field, '2026-11-15')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onCorrect).toHaveBeenCalledWith('osu', '2026-11-15')
  })

  it('offers no correction once the deadline is done', () => {
    renderPanel([invented({ done: true })], { })
    expect(screen.queryByRole('button', { name: 'Set date' })).not.toBeInTheDocument()
  })
})

describe('DeadlinePanel — a date that belongs to neither module', () => {
  it('offers Custom, and says what it is for', async () => {
    renderPanel([])
    await userEvent.click(screen.getByRole('button', { name: /Add a date of your own/ }))
    // The label has to carry it: "Custom" alone reads as a setting, not a place
    // to put a driving test.
    expect(screen.getByRole('option', { name: 'Custom — anything else' })).toBeInTheDocument()
  })

  it('files a date under Custom', async () => {
    const onAdd = vi.fn()
    renderPanel([], { onAdd })
    await userEvent.click(screen.getByRole('button', { name: /Add a date of your own/ }))
    await userEvent.type(screen.getByLabelText('What is it?'), 'Driving test')
    await userEvent.type(screen.getByLabelText('When?'), '2026-09-12')
    await userEvent.selectOptions(screen.getByLabelText(/Where does it belong/), 'Custom')
    await userEvent.click(screen.getByRole('button', { name: 'Add it' }))

    expect(onAdd).toHaveBeenCalledWith('Driving test', '2026-09-12', 'Custom')
  })

  it('shows Custom on the row rather than misfiling it', () => {
    // The short label used to be a two-value ternary, so anything that was not
    // Application Tracking rendered as "Financial Aid".
    renderPanel([ev({ id: 'own-1', title: 'Driving test', module: 'Custom', source: 'self', category: 'own' })])
    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(screen.queryByText('Financial Aid')).not.toBeInTheDocument()
  })
})
