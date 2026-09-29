/**
 * DeadlinePanel — the dashboard aside's deadline list.
 *
 * Replaces a flat "next four" list. The artifact's arrangement is headed
 * buckets — Overdue, Today, Tomorrow, then weekday and date — which answers
 * "what do I do now" without the student reading and comparing four dates.
 *
 * Scope is the week ahead plus anything overdue, because that is what a panel
 * this size can show honestly; the calendar holds the rest.
 */

import { useCallback, useState } from 'react'
import {
  bucketDeadlines,
  daysUntil,
  upcomingEvents,
  type DeadlineEvent,
  type DeadlineModule,
} from '../data/applicationDeadlines'
import DeadlineRow from './DeadlineRow'
import AddDeadlineForm from './AddDeadlineForm'

/** How far ahead the panel looks. Past this the list stops being a to-do and
 *  starts being a calendar, which is a page away. */
const WEEK_AHEAD = 7

interface Props {
  events: DeadlineEvent[]
  now: Date
  onToggle: (event: DeadlineEvent) => void
  onAdd: (title: string, date: string, module: DeadlineModule) => void
  onRemove: (id: string) => void
  onCorrect: (id: string, iso: string | null) => void
  onNote?: (id: string, text: string) => void
  onOpenCalendar: () => void
  /** Open the calendar on one deadline's day. */
  onOpenDay?: (day: Date) => void
  failed: boolean
  /** Days ahead that still count as urgent, from the settings page. */
  urgentWindow?: number
}

export default function DeadlinePanel({
  events, now, onToggle, onAdd, onRemove, onCorrect, onNote, onOpenCalendar, onOpenDay,
  failed, urgentWindow,
}: Props) {
  const [showDone, setShowDone] = useState(false)
  const [adding, setAdding] = useState(false)

  // Ticking something off used to delete it from the screen mid-click, which
  // read as the app losing it. Anything finished *here* stays put, struck
  // through, until the panel is next built — long enough to see what happened
  // and to undo a mistake.
  const [justDone, setJustDone] = useState<ReadonlySet<string>>(() => new Set())
  const toggle = useCallback((event: DeadlineEvent) => {
    // State, not a ref: the row only stays on screen if this re-renders. The
    // updater is add/delete on a copy, so StrictMode running it twice lands
    // on the same set.
    setJustDone((prev) => {
      const next = new Set(prev)
      if (event.done) next.delete(event.id)
      else next.add(event.id)
      return next
    })
    onToggle(event)
  }, [onToggle])

  const inWindow = events.filter((e) => daysUntil(e, now) <= WEEK_AHEAD)
  const visible = showDone ? inWindow : inWindow.filter((e) => !e.done || justDone.has(e.id))
  const doneCount = inWindow.filter((e) => e.done).length
  const buckets = bucketDeadlines(visible, now, urgentWindow)

  // Everything in this panel is inside a week, so nothing here answers "how
  // long have I actually got". The next deadline beyond the window does, and
  // it is the question a student in October is really asking.
  const ahead = upcomingEvents(events, now).filter((e) => !e.done)
  const next = ahead.find((e) => daysUntil(e, now) > WEEK_AHEAD)
  const weeksToNext = next ? Math.round(daysUntil(next, now) / 7) : 0

  return (
    <div className="dl-panel">
      <div className="dl-panel-head">
        <h3 className="dash-aside-title">Overview</h3>
        <span className="dl-count">{visible.filter((e) => !e.done).length} open</span>
      </div>

      {failed && (
        <p className="dl-empty-note">Couldn't load everything — check your connection and reload.</p>
      )}

      {buckets.length === 0 ? (
        <div className="dl-empty">
          <b>Nothing due this week</b>
          {events.length === 0
            ? 'Add colleges in Application Tracking, or scholarships in Financial Aid.'
            : 'Open the calendar for what comes after that.'}
        </div>
      ) : (
        buckets.map((bucket) => (
          <div key={bucket.label}>
            <div className={`dl-bucket ${bucket.tone ? `dl-bucket--${bucket.tone}` : ''}`}>
              {bucket.label}
              {bucket.label === 'Overdue' && ` · ${bucket.events.length}`}
            </div>
            {bucket.events.map((event) => (
              <DeadlineRow
                key={event.id}
                event={event}
                now={now}
                onToggle={toggle}
                onRemove={onRemove}
                onCorrect={onCorrect}
                onNote={onNote}
                onOpenDay={onOpenDay}
              />
            ))}
          </div>
        ))
      )}

      {adding ? (
        <AddDeadlineForm
          onAdd={(t, d, m) => { onAdd(t, d, m); setAdding(false) }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button type="button" className="dl-add-open" onClick={() => setAdding(true)}>
          + Add a date of your own
        </button>
      )}

      {next && (
        <p className="dl-horizon">
          After this week, your next is <b>{next.shortTitle}</b> in{' '}
          {weeksToNext <= 1 ? 'about a week' : `about ${weeksToNext} weeks`}.
        </p>
      )}

      <div className="dl-panel-foot">
        <button type="button" onClick={() => setShowDone((v) => !v)} aria-pressed={showDone}>
          {showDone ? 'Hide completed' : 'Show completed'}
        </button>
        {doneCount > 0 && <span className="dl-count">{doneCount} done</span>}
        <button type="button" className="dl-open-cal" onClick={onOpenCalendar}>
          Calendar →
        </button>
      </div>
    </div>
  )
}
