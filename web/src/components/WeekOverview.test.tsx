import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeekOverview from './WeekOverview'
import type { DeadlineEvent } from '../data/applicationDeadlines'

/** Friday 4 Sep 2026. Its week runs Sun 30 Aug – Sat 5 Sep. */
const NOW = new Date(2026, 8, 4)
const day = (offset: number) => new Date(2026, 8, 4 + offset)

const ev = (over: Partial<DeadlineEvent> & { id: string }): DeadlineEvent => ({
  collegeId: null, collegeName: null, typeLabel: '', title: over.id, shortTitle: over.id,
  emoji: '', module: 'Application Tracking', category: 'application', source: 'derived',
  date: day(0), dateDisplay: '', color: '#000', estimated: false, ...over,
})

const renderWeek = (events: DeadlineEvent[], onOpenDay = vi.fn()) => {
  render(<WeekOverview events={events} now={NOW} onOpenDay={onOpenDay} />)
  return onOpenDay
}

/** The column whose day number is `n`. */
const column = (n: number) =>
  screen.getAllByText(String(n)).map((el) => el.closest('.wk-day')).find(Boolean) as HTMLElement

describe('WeekOverview', () => {
  it('lays out the seven days around today', () => {
    renderWeek([])
    expect(screen.getByText('Your week')).toBeInTheDocument()
    expect(screen.getByText('Aug 30 – Sep 5')).toBeInTheDocument()
    // Every day is empty, and says so rather than sitting blank.
    expect(screen.getAllByText('clear')).toHaveLength(7)
  })

  it('puts each deadline in its own day', () => {
    renderWeek([ev({ id: 'mon', date: day(-2) }), ev({ id: 'fri' })])
    expect(within(column(2)).getByText('mon')).toBeInTheDocument()
    expect(within(column(4)).getByText('fri')).toBeInTheDocument()
  })

  it('counts a crowded day so it can be seen coming', () => {
    renderWeek([
      ev({ id: 'a', date: day(1) }), ev({ id: 'b', date: day(1) }), ev({ id: 'c', date: day(1) }),
    ])
    const sat = column(5)
    expect(sat.className).toContain('wk-day--heavy')
    expect(within(sat).getByText('3')).toBeInTheDocument()
    expect(screen.getByText(/Saturday is the crowded one with 3/)).toBeInTheDocument()
  })

  it('separates what was set for you from what you set yourself', () => {
    renderWeek([ev({ id: 'theirs' }), ev({ id: 'mine', source: 'self', category: 'own' })])
    expect(screen.getByText(/1 deadline set for you and 1 of your own/)).toBeInTheDocument()
    // Dashed is the signal; the class carries it.
    const mine = screen.getByText('mine').closest('.wk-ev') as HTMLElement
    expect(mine.className).toContain('wk-ev--mine')
  })

  it('collapses a long day and offers the calendar for the rest', async () => {
    const onOpenDay = renderWeek(
      Array.from({ length: 5 }, (_, i) => ev({ id: `e${i}`, date: day(1) })),
    )
    expect(within(column(5)).getByText('e0')).toBeInTheDocument()
    expect(within(column(5)).queryByText('e4')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'And 2 more' }))
    expect(onOpenDay).toHaveBeenCalledTimes(1)
    // It opens the day that was clicked, not today.
    expect((onOpenDay.mock.calls[0][0] as Date).getDate()).toBe(5)
  })

  it('walks to other weeks and back', async () => {
    renderWeek([])
    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(screen.getByText('Next week')).toBeInTheDocument()
    expect(screen.getByText('Sep 6 – Sep 12')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    await userEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    expect(screen.getByText('Last week')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(screen.getByText('Your week')).toBeInTheDocument()
  })

  it('dims the days already gone and rings today', () => {
    renderWeek([])
    expect(column(4).className).toContain('wk-day--today')
    expect(column(2).className).toContain('wk-day--past')
    expect(column(5).className).not.toContain('wk-day--past')
  })

  it('says nothing is on rather than showing an empty summary', () => {
    renderWeek([])
    expect(screen.getByText('Nothing on the calendar this week.')).toBeInTheDocument()
  })
})
