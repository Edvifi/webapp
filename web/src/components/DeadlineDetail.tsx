/**
 * DeadlineDetail — the panel that opens beside a deadline.
 *
 * Shared by the Overview rail, the calendar's day panel and the week strip,
 * which reach it from very different triggers: a full-width row, and a chip a
 * few characters wide inside a grid column. Where it sits and when it closes
 * belong to the trigger, which owns the anchor — see useAnchoredPanel. This
 * draws the contents.
 */

import { useId, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { daysUntil, ESTIMATE_HINT, type DeadlineEvent } from '../data/applicationDeadlines'
import { toIsoDay, NOTE_MAX } from '../lib/personalDeadlines'
import { PANEL_W, type PanelPos } from '../lib/useAnchoredPanel'

/** The handlers a surface can offer. Each is optional: the calendar is already
 *  showing the day, a read-only list has nothing to write to. */
export interface DeadlineActions {
  onToggle: (event: DeadlineEvent) => void
  onRemove?: (id: string) => void
  onCorrect?: (id: string, iso: string | null) => void
  onNote?: (id: string, text: string) => void
  onOpenDay?: (day: Date) => void
}

interface Props extends DeadlineActions {
  event: DeadlineEvent
  now: Date
  /** Where to draw it; null lays it out as a bottom sheet. */
  pos: PanelPos | null
  panelRef: RefObject<HTMLDivElement | null>
  onClose: () => void
  /** Id the trigger points at with aria-controls. */
  panelId: string
}

export default function DeadlineDetail({
  event, now, pos, panelRef, onClose, panelId,
  onToggle, onRemove, onCorrect, onNote, onOpenDay,
}: Props) {
  const offset = daysUntil(event, now)
  const [fixing, setFixing] = useState(false)
  const [typed, setTyped] = useState(() => toIsoDay(event.date))
  const [note, setNote] = useState(event.note ?? '')
  const fieldId = useId()

  // We hold no deadline for this school at all — the date on screen came from
  // a typical date for the round, not from them. Saying "est." for that is far
  // too quiet, so it gets a sentence and a way to put it right.
  const invented = event.estimateReason === 'no-source' && !event.done

  return createPortal(
    <div
      ref={panelRef}
      className={`dl-pop ${pos ? '' : 'dl-pop--sheet'}`}
      id={panelId}
      role="dialog"
      aria-label={event.title}
      style={pos ? { top: pos.top, left: pos.left, width: PANEL_W } : undefined}
    >
      <div className="dl-pop-head">
        <span className="dl-pop-title">{event.title}</span>
        <button
          type="button"
          className="dl-pop-x"
          onClick={onClose}
          aria-label={`Close ${event.title}`}
        >
          ×
        </button>
      </div>
      <p className="dl-detail-when">
        {event.dateDisplay}
        {offset === 0 ? ' · today' : offset > 0 ? ` · in ${offset} day${offset === 1 ? '' : 's'}`
          : ` · ${Math.abs(offset)} day${Math.abs(offset) === 1 ? '' : 's'} ago`}
      </p>
      {event.estimated && (
        <p className="dl-detail-est">{ESTIMATE_HINT[event.estimateReason ?? 'cycle-year']}</p>
      )}

      <div className="dl-detail-acts">
        {/* Every action names its deadline: several panels can be open at
            once, so "Remove" alone says nothing about what it removes, to a
            screen reader or to a test. */}
        <button
          type="button"
          className="dl-act dl-act--done"
          onClick={() => onToggle(event)}
          aria-label={`Mark ${event.title} as ${event.done ? 'not done' : 'complete'}`}
        >
          {event.done ? 'Mark as not done' : 'Mark as complete'}
        </button>
        {onOpenDay && (
          <button
            type="button"
            className="dl-act"
            onClick={() => onOpenDay(event.date)}
            aria-label={`View ${event.title} in the calendar`}
          >
            View in calendar
          </button>
        )}
        {invented && onCorrect && (
          <button
            type="button"
            className="dl-act"
            onClick={() => setFixing((v) => !v)}
            aria-label={`Set the real date for ${event.title}`}
          >
            {fixing ? 'Cancel' : 'Set the real date'}
          </button>
        )}
        {/* Only the student's own standalone dates can be removed here. A
            task's date is cleared on its school's page; removeOwn wouldn't
            find it. */}
        {onRemove && event.source === 'self' && !event.isTask && (
          <button
            type="button"
            className="dl-act dl-act--del"
            onClick={() => onRemove(event.id)}
            aria-label={`Remove ${event.title}`}
          >
            Remove
          </button>
        )}
      </div>

      {fixing && onCorrect && (
        <form
          className="dl-fix-form"
          onSubmit={(e) => { e.preventDefault(); onCorrect(event.id, typed); setFixing(false) }}
        >
          <label className="dl-fix-label" htmlFor={`fix-${fieldId}`}>
            {event.collegeName ?? 'This'} deadline, from their site
          </label>
          <input
            id={`fix-${fieldId}`}
            className="dl-fix-input"
            type="date"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <button type="submit" className="dl-fix-save" disabled={!typed}>Save</button>
        </form>
      )}

      {event.details && event.details.length > 0 && (
        <dl className="dl-facts">
          {event.details.map((d) => (
            <div key={d.label} className="dl-fact">
              <dt>{d.label}</dt>
              <dd>{d.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {event.link && (
        <a className="dl-link" href={event.link} target="_blank" rel="noreferrer noopener">
          Open the official page ↗
        </a>
      )}

      {onNote && (
        <div className="dl-note">
          <label className="dl-note-label" htmlFor={`note-${fieldId}`}>Your notes</label>
          <textarea
            id={`note-${fieldId}`}
            className="dl-note-input"
            value={note}
            maxLength={NOTE_MAX}
            rows={2}
            placeholder="What's left, who you've asked, where you got to…"
            onChange={(e) => setNote(e.target.value)}
            // Saved on the way out rather than per keystroke: a note is written
            // in one go, and every keystroke would be a settings write.
            onBlur={() => { if (note !== (event.note ?? '')) onNote(event.id, note) }}
          />
        </div>
      )}
    </div>,
    document.body,
  )
}
