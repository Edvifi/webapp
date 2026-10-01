import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DeadlinePanel from './DeadlinePanel'
import { deriveDeadlineEvents, deriveScholarshipEvents, type DeadlineEvent } from '../data/applicationDeadlines'

/** Pinned so "Today" and "Tomorrow" mean known dates. */
const NOW = new Date(2026, 8, 4)
const day = (offset: number) => new Date(2026, 8, 4 + offset)

const ev = (over: Partial<DeadlineEvent> & { id: string }): DeadlineEvent => ({
  collegeId: null, collegeName: null, typeLabel: '', title: over.id, shortTitle: over.id,
  emoji: '', module: 'Application Tracking', category: 'application', source: 'derived',
  date: day(0), dateDisplay: '', color: '#000', estimated: false, ...over,
})

const noop = () => {}
/** The row body, which opens the deadline. Its name starts with the title,
 *  which the tick-off button's does not. */
const open = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title} —`) })
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
    expect(open('soon')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^far —/ })).not.toBeInTheDocument()
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
    await userEvent.click(screen.getByRole('button', { name: 'Tick off harvard' }))
    expect(onToggle).toHaveBeenCalledWith(event)
  })

  it('opens the deadline when the row is clicked, and ticks nothing off', async () => {
    // Students clicked the row expecting it to open and marked things done by
    // accident, which then vanished from the list.
    const onToggle = vi.fn()
    renderPanel([ev({ id: 'harvard', sourceRef: 'harvard' })], { onToggle })
    await userEvent.click(open('harvard'))
    expect(onToggle).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Mark harvard as complete' })).toBeInTheDocument()
  })

  it('finishes a deadline from the button inside it', async () => {
    const onToggle = vi.fn()
    const event = ev({ id: 'harvard', sourceRef: 'harvard' })
    renderPanel([event], { onToggle })
    await userEvent.click(open('harvard'))
    await userEvent.click(screen.getByRole('button', { name: 'Mark harvard as complete' }))
    expect(onToggle).toHaveBeenCalledWith(event)
  })

  it('keeps a deadline on screen after it is ticked off', async () => {
    // It used to disappear under the cursor, which reads as the app losing it.
    renderPanel([ev({ id: 'harvard', sourceRef: 'harvard' })])
    await userEvent.click(screen.getByRole('button', { name: 'Tick off harvard' }))
    expect(screen.getByRole('button', { name: /^harvard —/ })).toBeInTheDocument()
  })

  it('saves a note when the field is left, not on every keystroke', async () => {
    const onNote = vi.fn()
    renderPanel([ev({ id: 'harvard', sourceRef: 'harvard' })], { onNote })
    await userEvent.click(open('harvard'))
    await userEvent.type(screen.getByLabelText('Your notes'), 'ask Ms Patel')
    expect(onNote).not.toHaveBeenCalled()
    await userEvent.tab()
    expect(onNote).toHaveBeenCalledWith('harvard', 'ask Ms Patel')
  })

  it('offers removal only for dates the student set themselves', async () => {
    renderPanel([
      ev({ id: 'mine', source: 'self', category: 'own' }),
      ev({ id: 'theirs' }),
    ])
    // A college's deadline is a fact, not something to delete.
    // Both live inside the opened row now.
    await userEvent.click(open('mine'))
    expect(screen.getByRole('button', { name: 'Delete mine' })).toBeInTheDocument()
    await userEvent.click(open('theirs'))
    expect(screen.queryByRole('button', { name: 'Delete theirs' })).not.toBeInTheDocument()
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
    await userEvent.click(open('Ohio State — Early Action'))
    await userEvent.click(screen.getByRole('button', { name: 'Set the real date for Ohio State — Early Action' }))
    const field = screen.getByLabelText(/Ohio State deadline, from their site/)
    await userEvent.clear(field)
    await userEvent.type(field, '2026-11-15')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onCorrect).toHaveBeenCalledWith('osu', '2026-11-15')
  })

  it('offers no correction once the deadline is done', async () => {
    renderPanel([invented({ done: true })], { })
    // Done rows are hidden, so reveal it first — otherwise this passes
    // whether or not the correction is offered.
    await userEvent.click(screen.getByRole('button', { name: 'Show completed' }))
    await userEvent.click(open('Ohio State — Early Action'))
    expect(screen.queryByRole('button', { name: /Set the real date/ })).not.toBeInTheDocument()
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

  it('offers “remove” on the student’s own dates but not on task dates', async () => {
    renderPanel([
      ev({ id: 'own-1', title: 'Driving test', shortTitle: 'Driving test', source: 'self', category: 'own', module: 'Custom' }),
      ev({ id: 'task-sc-1::essays', title: 'Draft the essay — Alpha', shortTitle: 'Draft the essay', source: 'self', category: 'own', isTask: true }),
    ])
    await userEvent.click(open('Driving test'))
    expect(screen.getByRole('button', { name: 'Delete Driving test' })).toBeInTheDocument()
    await userEvent.click(open('Draft the essay — Alpha'))
    expect(screen.queryByRole('button', { name: /^Delete Draft the essay/ })).not.toBeInTheDocument()
    // A task date is the student's too, so the panel says where it lives
    // rather than leaving a missing button to be puzzled over.
    expect(screen.getByText(/Clear it\s+from that school/)).toBeInTheDocument()
  })
})

describe('DeadlinePanel — the opened deadline', () => {
  it('closes on Escape', async () => {
    renderPanel([ev({ id: 'harvard' })])
    await userEvent.click(open('harvard'))
    expect(screen.getByRole('dialog', { name: 'harvard' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows what a system deadline belongs to', () => {
    // A college's round, where the application stands and how many of its
    // tasks are done — all already on the entry, so no extra lookup.
    const [appEvent] = deriveDeadlineEvents(
      [{
        collegeId: 'sc-1', category: 'reach', deadlineType: 'ED', status: 'in-progress',
        name: 'Alpha College', city: 'Boston', state: 'MA', website: 'alpha.edu',
        tasks: [
          { id: 'a', label: 'Essay', done: true, phase: 'before' },
          { id: 'b', label: 'Recs', done: false, phase: 'before' },
        ],
      }],
      { gradeStartIdx: 3, now: new Date('2026-09-01T12:00:00') },
    )
    renderPanel([{ ...appEvent, date: day(2) }])
    fireEvent.click(open(appEvent.title))
    // Two saved tasks plus the aid-application task an in-progress school gains,
    // the same count the school's own page shows.
    expect(screen.getByText('1 of 3 done')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('Reach')).toBeInTheDocument()
    expect(screen.getByText('Boston, MA')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /official page/ })).toHaveAttribute('href', 'https://alpha.edu')
  })

  it('shows the award, and what the source said when we had to guess the date', () => {
    const [sch] = deriveScholarshipEvents(
      [{ id: 't1', name: 'Coca-Cola Scholars', deadline: 'May 1 (annual)', amount: '$20,000',
         status: 'ready', type: 'Merit', provider: 'Coca-Cola Foundation',
         url: 'https://coca-colascholarsfoundation.org' }],
      { gradeStartIdx: 3, now: new Date('2026-09-01T12:00:00') },
    )
    renderPanel([{ ...sch, date: day(2) }])
    fireEvent.click(open(sch.title))
    expect(screen.getByText('$20,000')).toBeInTheDocument()
    // The catalogue's wording is the authoritative answer; our date is derived.
    expect(screen.getByText('May 1 (annual)')).toBeInTheDocument()
    expect(screen.getByText('Ready to submit')).toBeInTheDocument()
    expect(screen.getByText('Coca-Cola Foundation')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /official page/ }))
      .toHaveAttribute('href', 'https://coca-colascholarsfoundation.org')
  })
})

describe('DeadlinePanel — a curated school', () => {
  it('brings what the curated record knows, and links to it', () => {
    // 'harvard' is in the curated set, so the entry's own snapshot is thin
    // but the record behind it is not.
    const [appEvent] = deriveDeadlineEvents(
      [{ collegeId: 'harvard', category: 'reach', deadlineType: 'EA', status: 'not-started' }],
      { gradeStartIdx: 3, now: new Date('2026-09-01T12:00:00') },
    )
    renderPanel([{ ...appEvent, date: day(2) }])
    fireEvent.click(open(appEvent.title))
    expect(screen.getByText('3% of applicants')).toBeInTheDocument()
    expect(screen.getByText(/meets full need/)).toBeInTheDocument()
    // No website on the entry; the curated domain stands in.
    expect(screen.getByRole('link', { name: /official page/ }))
      .toHaveAttribute('href', 'https://harvard.edu')
  })
})

describe('DeadlinePanel — deleting your own date', () => {
  const own = () => ev({ id: 'own-1', title: 'Driving test', source: 'self', category: 'own', module: 'Custom' })

  it('asks before deleting, and names what it would delete', async () => {
    const onRemove = vi.fn()
    renderPanel([own()], { onRemove })
    await userEvent.click(open('Driving test'))
    await userEvent.click(screen.getByRole('button', { name: 'Delete Driving test' }))

    // Nothing has gone yet.
    expect(onRemove).not.toHaveBeenCalled()
    expect(screen.getByText(/Delete “Driving test”\? This can’t be undone\./)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Delete Driving test for good' }))
    expect(onRemove).toHaveBeenCalledWith('own-1')
  })

  it('keeps it when you back out', async () => {
    const onRemove = vi.fn()
    renderPanel([own()], { onRemove })
    await userEvent.click(open('Driving test'))
    await userEvent.click(screen.getByRole('button', { name: 'Delete Driving test' }))
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }))
    expect(onRemove).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Delete Driving test' })).toBeInTheDocument()
  })
})
