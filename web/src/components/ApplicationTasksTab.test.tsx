import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApplicationTasksTab from './ApplicationTasksTab'
import type { ApplicationEntry, AppTask } from '../data/applicationsChecklist'

const NOW = new Date(2026, 9, 6)

const task = (id: string, done: boolean): AppTask =>
  ({ id, label: `Task ${id}`, done, phase: 'before' })

const app = (over: Partial<ApplicationEntry> & { collegeId: string }): ApplicationEntry =>
  ({ category: 'match', deadlineType: 'RD', status: 'in-progress', name: over.collegeId, ...over } as ApplicationEntry)

const render_ = (apps: ApplicationEntry[], over: Partial<Parameters<typeof ApplicationTasksTab>[0]> = {}) =>
  render(
    <ApplicationTasksTab
      apps={apps} onUpdate={vi.fn()} gradeStartIdx={10}
      focusCollegeId={null} onAddColleges={vi.fn()} {...over}
    />,
  )

describe('ApplicationTasksTab', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); vi.setSystemTime(NOW) })
  afterEach(() => vi.useRealTimers())

  it('orders colleges by how soon they are due', () => {
    render_([
      app({ collegeId: 'yale', name: 'Yale', deadlineType: 'RD' }),
      app({ collegeId: 'harvard', name: 'Harvard', deadlineType: 'EA' }),
    ])
    const names = screen.getAllByRole('heading', { level: 2 }).length
    expect(names).toBe(1) // the page title
    // Harvard's Early Action lands before Yale's Regular Decision.
    const text = document.body.textContent ?? ''
    expect(text.indexOf('Harvard')).toBeLessThan(text.indexOf('Yale'))
  })

  it('keeps an unfinished college open and not collapsible', () => {
    render_([app({ collegeId: 'harvard', name: 'Harvard', tasks: [task('a', false), task('b', true)] })])
    // A student opens this page to work; hiding unfinished work behind a click
    // would be the wrong trade.
    expect(screen.getByText('Task a')).toBeInTheDocument()
    expect(screen.queryByRole('button', { expanded: false })).not.toBeInTheDocument()
  })

  it('collapses a finished college to its header', () => {
    render_([app({ collegeId: 'harvard', name: 'Harvard', tasks: [task('a', true), task('b', true)] })])
    expect(screen.getByText('Harvard')).toBeInTheDocument()
    expect(screen.getByText('All 2 done')).toBeInTheDocument()
    // The ticked boxes are the ones least worth the space.
    expect(screen.queryByText('Task a')).not.toBeInTheDocument()
  })

  it('reopens a finished college when asked', async () => {
    render_([app({ collegeId: 'harvard', name: 'Harvard', tasks: [task('a', true)] })])
    await userEvent.click(screen.getByRole('button', { expanded: false }))
    expect(screen.getByText('Task a')).toBeInTheDocument()
  })

  it('never collapses the college the student just clicked through to', () => {
    // They asked for it by name; hiding it would be a dead end on arrival.
    render_(
      [app({ collegeId: 'harvard', name: 'Harvard', tasks: [task('a', true)] })],
      { focusCollegeId: 'harvard' },
    )
    expect(screen.getByText('Task a')).toBeInTheDocument()
  })

  it('counts progress across every college', () => {
    render_([
      app({ collegeId: 'a', name: 'A', tasks: [task('1', true), task('2', false)] }),
      app({ collegeId: 'b', name: 'B', tasks: [task('3', true)] }),
    ])
    expect(screen.getByText(/2 of 3 done across 2 colleges/)).toBeInTheDocument()
  })

  it('offers a way out when there are no colleges yet', async () => {
    const onAddColleges = vi.fn()
    render_([], { onAddColleges })
    await userEvent.click(screen.getByRole('button', { name: /Add your first college/ }))
    expect(onAddColleges).toHaveBeenCalled()
  })
})
