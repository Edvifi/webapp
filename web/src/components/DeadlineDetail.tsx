/**
 * DeadlineDetail — the panel that opens beside a deadline.
 *
 * Shared by the Overview rail, the calendar's day panel and the week strip,
 * which reach it from very different triggers: a full-width row, and a chip a
 * few characters wide inside a grid column. Where it sits and when it closes
 * belong to the trigger, which owns the anchor — see useAnchoredPanel. This
 * draws the contents.
 */

import { useEffect, useId, useRef, useState, type RefObject } from 'react'
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
  /**
   * Centred over the page instead of beside the trigger. For the calendar's
   * day list, which runs the full width: there is nothing to sit beside, and
   * a flyout there covers the month for no reason.
   */
  modal?: boolean
  /** Where to draw it; null lays it out as a bottom sheet. */
  pos: PanelPos | null
  panelRef: RefObject<HTMLDivElement | null>
  onClose: () => void
  /** Id the trigger points at with aria-controls. */
  panelId: string
}

export default function DeadlineDetail({
  event, now, pos, modal, panelRef, onClose, panelId,
  onToggle, onRemove, onCorrect, onNote, onOpenDay,
}: Props) {
  const offset = daysUntil(event, now)
  const [fixing, setFixing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [typed, setTyped] = useState(() => toIsoDay(event.date))
  const [note, setNote] = useState(event.note ?? '')
  const fieldId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  // A modal claims aria-modal, so focus has to actually go into it and come
  // back out again — otherwise a screen reader is told the rest of the page is
  // inert while the keyboard is still sitting in it. The flyout is a
  // disclosure and leaves focus where it was.
  useEffect(() => {
    if (!modal) return
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => previous?.focus?.()
  }, [modal])

  // We hold no deadline for this school at all — the date on screen came from
  // a typical date for the round, not from them. Saying "est." for that is far
  // too quiet, so it gets a sentence and a way to put it right.
  const invented = event.estimateReason === 'no-source' && !event.done
  // A date the student added and can take back. A date they set on a college's
  // task is also theirs, but it belongs to that task: removeOwn would not find
  // it, so it is cleared where it lives. Both look the same on this panel, and
  // the difference has to be said rather than left as a missing button.
  const isOwnDate = event.source === 'self' && !event.isTask
  const isTaskDate = event.source === 'self' && event.isTask

  const body = (
    <div
      ref={panelRef}
      className={`dl-pop ${modal ? 'dl-pop--modal' : pos ? '' : 'dl-pop--sheet'}`}
      id={panelId}
      role="dialog"
      aria-modal={modal || undefined}
      aria-label={event.title}
      style={modal || !pos ? undefined : { top: pos.top, left: pos.left, width: PANEL_W }}
    >
      <div className="dl-pop-head">
        <span className="dl-pop-title">{event.title}</span>
        <button
          ref={closeRef}
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
        {onRemove && isOwnDate && !confirmingDelete && (
          <button
            type="button"
            className="dl-act dl-act--del"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete ${event.title}`}
          >
            Delete
          </button>
        )}
      </div>

      {/* Deleting is the one thing here that cannot be undone, so it asks
          first and says what it is deleting. */}
      {onRemove && isOwnDate && confirmingDelete && (
        <div className="dl-confirm">
          <p className="dl-confirm-q">Delete “{event.title}”? This can’t be undone.</p>
          <div className="dl-detail-acts">
            <button
              type="button"
              className="dl-act dl-act--danger"
              onClick={() => onRemove(event.id)}
              aria-label={`Delete ${event.title} for good`}
            >
              Yes, delete it
            </button>
            <button type="button" className="dl-act" onClick={() => setConfirmingDelete(false)}>
              Keep it
            </button>
          </div>
        </div>
      )}

      {isTaskDate && (
        <p className="dl-detail-est">
          This is your date on {event.collegeName ?? 'a school'}’s checklist. Clear it
          from that school’s page and it disappears from here too.
        </p>
      )}

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
    </div>
  )

  // The scrim is outside the panel, so the click-outside handler that already
  // dismisses a flyout dismisses this too.
  return createPortal(
    modal ? <div className="dl-scrim">{body}</div> : body,
    document.body,
  )
}
