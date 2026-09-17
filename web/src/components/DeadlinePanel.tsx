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

import { useState } from 'react'
import {
  bucketDeadlines,
  daysUntil,
  type DeadlineEvent,
  type DeadlineModule,
} from '../data/applicationDeadlines'
import DeadlineRow from './DeadlineRow'

/** How far ahead the panel looks. Past this the list stops being a to-do and
 *  starts being a calendar, which is a page away. */
const WEEK_AHEAD = 7

interface Props {
  events: DeadlineEvent[]
  now: Date
  onToggle: (event: DeadlineEvent) => void
  onAdd: (title: string, date: string, module: DeadlineModule) => void
  onRemove: (id: string) => void
  onOpenCalendar: () => void
  failed: boolean
  /** Days ahead that still count as urgent, from the settings page. */
  urgentWindow?: number
}

export default function DeadlinePanel({
  events, now, onToggle, onAdd, onRemove, onOpenCalendar, failed, urgentWindow,
}: Props) {
  const [showDone, setShowDone] = useState(false)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [module, setModule] = useState<DeadlineModule>('Application Tracking')

  const inWindow = events.filter((e) => daysUntil(e, now) <= WEEK_AHEAD)
  const visible = showDone ? inWindow : inWindow.filter((e) => !e.done)
  const doneCount = inWindow.filter((e) => e.done).length
  const buckets = bucketDeadlines(visible, now, urgentWindow)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date) return
    onAdd(title, date, module)
    setTitle(''); setDate(''); setAdding(false)
  }

  return (
    <div className="dl-panel">
      <div className="dl-panel-head">
        <h3 className="dash-aside-title">Deadlines</h3>
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
                onToggle={onToggle}
                onRemove={onRemove}
              />
            ))}
          </div>
        ))
      )}

      {adding ? (
        <form className="dl-add-form" onSubmit={submit}>
          <label className="dl-add-label" htmlFor="dl-add-title">What is it?</label>
          <input
            id="dl-add-title"
            className="dl-add-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ask Ms. Reyes for a reference"
            maxLength={120}
            autoFocus
          />
          <label className="dl-add-label" htmlFor="dl-add-date">When?</label>
          <input
            id="dl-add-date"
            className="dl-add-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <label className="dl-add-label" htmlFor="dl-add-module">Where does it belong?</label>
          <select
            id="dl-add-module"
            className="dl-add-input"
            value={module}
            onChange={(e) => setModule(e.target.value as DeadlineModule)}
          >
            <option value="Application Tracking">Application Tracking</option>
            <option value="Financial Aid">Financial Aid</option>
          </select>
          <div className="dl-add-actions">
            <button type="submit" className="dl-add-save" disabled={!title.trim() || !date}>
              Add it
            </button>
            <button type="button" className="dl-add-cancel" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="dl-add-open" onClick={() => setAdding(true)}>
          + Add a date of your own
        </button>
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
