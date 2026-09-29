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

import { useId, useState } from 'react'
import {
  eventsOn,
  kindLabel,
  sameDay,
  weekStart,
  type DeadlineEvent,
} from '../data/applicationDeadlines'
import DeadlineDetail, { type DeadlineActions } from './DeadlineDetail'
import { useAnchoredPanel } from '../lib/useAnchoredPanel'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_MS = 86_400_000
/** Above this a day is drawn as crowded. */
const HEAVY = 3
/** Events shown per column before the rest collapse into "and N more". */
const SHOWN = 3

const short = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

interface Props extends DeadlineActions {
  events: DeadlineEvent[]
  now: Date
  /** Opens the calendar on a given day — the "and N more" escape hatch. */
  onOpenDay: (day: Date) => void
}

export default function WeekOverview({ events, now, onOpenDay, ...actions }: Props) {
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
                      <WeekEvent
                        key={e.id}
                        event={e}
                        now={now}
                        onOpenDay={onOpenDay}
                        {...actions}
                      />
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

/**
 * One event in a day column, and the panel it opens.
 *
 * The same panel the Overview rail uses. A chip this size cannot show a
 * deadline's detail, and tapping it used to jump to the calendar and lose the
 * student's place; now the week stays on screen behind it.
 */
function WeekEvent({ event, now, ...actions }: DeadlineActions & {
  event: DeadlineEvent
  now: Date
}) {
  const panelId = useId()
  // Only one panel is ever up, without the strip having to track which: a
  // click on another chip lands outside this one, which dismisses it.
  const { anchorRef, panelRef, open, pos, toggle, close } = useAnchoredPanel<HTMLButtonElement>()
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={`wk-ev ${event.source === 'self' ? 'wk-ev--mine' : ''} ${event.done ? 'wk-ev--done' : ''} ${open ? 'wk-ev--open' : ''}`}
        title={`${event.title} — ${event.dateDisplay}${event.estimated ? ' (estimated)' : ''}`}
      >
        <span className="wk-ev-bar" style={{ background: event.color }} aria-hidden="true" />
        <span className="wk-ev-main">
          <span className="wk-ev-t">{event.shortTitle}</span>
          <span className="wk-ev-k">
            {kindLabel(event)}{event.estimated ? ' · est.' : ''}
          </span>
        </span>
      </button>
      {open && (
        <DeadlineDetail
          event={event}
          now={now}
          pos={pos}
          panelRef={panelRef}
          panelId={panelId}
          onClose={close}
          {...actions}
        />
      )}
    </>
  )
}
