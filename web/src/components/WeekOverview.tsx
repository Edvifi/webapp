/**
 * WeekOverview — the seven days around today, on the dashboard.
 *
 * The deadline panel answers "what next"; this answers "how is the week
 * shaped". A student can see that Thursday holds three things and Friday holds
 * none, which is the question a list of four dates cannot answer.
 *
 * Days with three or more are tinted and carry a count, since crowding is the
 * thing worth noticing before it arrives.
 */

import { useState } from 'react'
import {
  eventsOn,
  kindLabel,
  sameDay,
  weekStart,
  type DeadlineEvent,
} from '../data/applicationDeadlines'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_MS = 86_400_000
/** Above this a day is drawn as crowded. */
const HEAVY = 3
/** Events shown per column before the rest collapse into "and N more". */
const SHOWN = 3

const short = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

interface Props {
  events: DeadlineEvent[]
  now: Date
  /** Opens the calendar on a given day — the "and N more" escape hatch. */
  onOpenDay: (day: Date) => void
}

export default function WeekOverview({ events, now, onOpenDay }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const start = weekStart(now, weekOffset)
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    return { date, items: eventsOn(events, date) }
  })

  const all = days.flatMap((d) => d.items)
  const set = all.filter((e) => e.source === 'derived').length
  const mine = all.length - set
  const busiest = [...days].sort((a, b) => b.items.length - a.items.length)[0]
  const end = new Date(start.getTime() + 6 * DAY_MS)

  const heading =
    weekOffset === 0 ? 'Your week'
    : weekOffset === 1 ? 'Next week'
    : weekOffset === -1 ? 'Last week'
    : `Week of ${short(start)}`

  const summary = all.length === 0
    ? 'Nothing on the calendar this week.'
    : `${set} deadline${set === 1 ? '' : 's'} set for you and ${mine} of your own${
        busiest && busiest.items.length >= HEAVY
          ? `. ${busiest.date.toLocaleDateString(undefined, { weekday: 'long' })} is the crowded one with ${busiest.items.length}.`
          : '.'}`

  return (
    <section className="wk">
      <div className="wk-head">
        <h2 className="wk-title">{heading}</h2>
        <div className="wk-nav">
          <button type="button" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week">←</button>
          <span className="wk-span">{short(start)} – {short(end)}</span>
          <button type="button" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week">→</button>
          {weekOffset !== 0 && (
            <button type="button" onClick={() => setWeekOffset(0)}>Today</button>
          )}
        </div>
      </div>
      <p className="wk-sum">{summary}</p>

      <div className="wk-scroll">
        <div className="wk-grid">
          {days.map(({ date, items }) => {
            const isToday = sameDay(date, now)
            const past = date.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
            const heavy = items.length >= HEAVY
            const shown = items.slice(0, SHOWN)
            const extra = items.length - shown.length
            return (
              <div
                key={date.toISOString()}
                className={`wk-day ${isToday ? 'wk-day--today' : ''} ${past ? 'wk-day--past' : ''} ${heavy ? 'wk-day--heavy' : ''}`}
              >
                <div className="wk-day-head">
                  <span className="wk-dow">{DOW[date.getDay()]}</span>
                  <span className="wk-dnum">{date.getDate()}</span>
                  {heavy && <span className="wk-load">{items.length}</span>}
                </div>
                {items.length === 0 ? (
                  <div className="wk-clear">clear</div>
                ) : (
                  <div className="wk-items">
                    {shown.map((e) => (
                      <div
                        key={e.id}
                        className={`wk-ev ${e.source === 'self' ? 'wk-ev--mine' : ''} ${e.done ? 'wk-ev--done' : ''}`}
                        title={`${e.title} — ${e.dateDisplay}${e.estimated ? ' (estimated)' : ''}`}
                      >
                        <span className="wk-ev-bar" style={{ background: e.color }} aria-hidden="true" />
                        <span className="wk-ev-main">
                          <span className="wk-ev-t">{e.shortTitle}</span>
                          <span className="wk-ev-k">
                            {kindLabel(e)}{e.estimated ? ' · est.' : ''}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {extra > 0 && (
                  <button type="button" className="wk-more" onClick={() => onOpenDay(date)}>
                    And {extra} more
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="wk-legend">
        <span><i className="wk-key wk-key--solid" /> Set by a school or scholarship</span>
        <span><i className="wk-key wk-key--dash" /> A date you set yourself</span>
        <span><i className="wk-key wk-key--heavy" /> Three or more in one day</span>
      </div>
    </section>
  )
}
