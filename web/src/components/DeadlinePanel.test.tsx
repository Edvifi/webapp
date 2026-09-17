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
      onToggle={noop} onAdd={noop} onRemove={noop} onOpenCalendar={noop}
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

  it('stops at a week out, because the calendar holds the rest', () => {
    renderPanel([ev({ id: 'soon', date: day(2) }), ev({ id: 'far', date: day(30) })])
    expect(screen.getByText('soon')).toBeInTheDocument()
    expect(screen.queryByText('far')).not.toBeInTheDocument()
  })

  it('hides completed deadlines until asked for them', async () => {
    renderPanel([ev({ id: 'done-one', done: true }), ev({ id: 'open-one' })])
    expect(screen.queryByText('done-one')).not.toBeInTheDocument()
    expect(screen.getByText('1 open')).toBeInTheDocument()
    expect(screen.getByText('1 done')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Show completed' }))
    expect(screen.getByText('done-one')).toBeInTheDocument()
  })

  it('ticks a deadline off by its id', async () => {
    const onToggle = vi.fn()
    renderPanel([ev({ id: 'harvard' })], { onToggle })
    await userEvent.click(screen.getByRole('button', { name: /harvard/ }))
    expect(onToggle).toHaveBeenCalledWith('harvard')
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

  it('names the kind of each deadline', () => {
    renderPanel([
      ev({ id: 'a', category: 'application' }),
      ev({ id: 'b', category: 'scholarship', module: 'Financial Aid' }),
      ev({ id: 'c', category: 'fafsa', module: 'Financial Aid' }),
      ev({ id: 'd', category: 'own', source: 'self' }),
    ])
    const labels = ['College', 'Scholarship', 'Federal', 'Mine']
    for (const l of labels) expect(screen.getByText(l)).toBeInTheDocument()
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
