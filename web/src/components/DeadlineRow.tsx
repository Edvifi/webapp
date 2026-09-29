/**
 * DeadlineRow — one deadline, expandable.
 *
 * Shared by the Overview panel and the calendar's day detail, which the
 * artifact draws identically. Keeping one component means a change to how a
 * deadline reads happens once.
 *
 * The whole row used to be a single button that marked the deadline done.
 * Students clicked it expecting the row to open, and instead ticked something
 * off — which then vanished from the list, because done deadlines are hidden.
 * So the row body opens a detail panel now, and finishing something is an
 * explicit act: the checkbox, or the labelled button inside the panel.
 *
 * The panel opens beside the row rather than under it. The list lives in a
 * narrow rail, and pushing every row below down by the height of a detail
 * panel moved whatever the student was reading. It is portalled to the body
 * and positioned from the row's rect: the rail scrolls and its ancestors
 * carry transforms, either of which would clip or misplace a panel positioned
 * inside it. On a phone there is no room beside anything, so it becomes a
 * sheet across the bottom.
 */

/** Width of the flyout, and the gap between it and the row. */
const POP_W = 320
const POP_GAP = 10
/** Below this there is no room beside the row; the panel becomes a sheet. */
const SHEET_MAX = 760

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  kindLabel, daysUntil, DEADLINE_TYPE_MEANING, MODULE_SHORT_LABEL, type DeadlineEvent,
} from '../data/applicationDeadlines'
import { toIsoDay, NOTE_MAX } from '../lib/personalDeadlines'

/** What each kind of estimate actually means, in a sentence. */
const ESTIMATE_HINT: Record<string, string> = {
  'cycle-year': "The day is right; we moved the year into your application cycle.",
  'recurring-text': "Worked out from wording like \"May 1 (annual)\" — confirm it.",
  'no-source': "We hold no deadline for this school. This is a typical date for the round, not theirs.",
}

interface Props {
  event: DeadlineEvent
  now: Date
  onToggle: (event: DeadlineEvent) => void
  /** Show the module's full name rather than its short form. The calendar's
   *  day panel has the width for it; the dashboard aside does not. */
  fullModule?: boolean
  onRemove?: (id: string) => void
  /** Lets the student replace a date we guessed with the real one. */
  onCorrect?: (id: string, iso: string | null) => void
  /** The student's own note against this deadline. Omit where there is
   *  nowhere to save one. */
  onNote?: (id: string, text: string) => void
  /** Jump to this deadline's day. Omitted inside the calendar, which is
   *  already showing it. */
  onOpenDay?: (day: Date) => void
}

export default function DeadlineRow({
  event, now, onToggle, fullModule, onRemove, onCorrect, onNote, onOpenDay,
}: Props) {
  const offset = daysUntil(event, now)
  const kind = kindLabel(event)
  const [open, setOpen] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [typed, setTyped] = useState(() => toIsoDay(event.date))
  const [note, setNote] = useState(event.note ?? '')
  const panelId = useId()
  const rowRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  // null while it should render as a bottom sheet, which CSS places.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const place = useCallback(() => {
    const el = rowRef.current
    if (!el || window.innerWidth <= SHEET_MAX) { setPos(null); return }
    const r = el.getBoundingClientRect()
    // The rail sits on the right, so the natural side is the left. Falls back
    // to the right, then to whatever fits.
    let left = r.left - POP_W - POP_GAP
    if (left < 8) left = Math.min(r.right + POP_GAP, window.innerWidth - POP_W - 8)
    setPos({ top: Math.max(8, Math.min(r.top, window.innerHeight - 280)), left })
  }, [])

  // Measured when it opens rather than in an effect afterwards: the row is
  // already on screen at click time, so there is nothing to wait for and no
  // frame where the panel is placed wrongly.
  const toggleOpen = useCallback(() => {
    if (!open) place()
    setOpen((v) => !v)
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!popRef.current?.contains(t) && !rowRef.current?.contains(t)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', place)
    // Capture: the rail is what actually scrolls, not the window.
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, place])
  // We hold no deadline for this school at all — the date on screen came from
  // a typical date for the round, not from them. Saying "est." for that is far
  // too quiet, so it gets a sentence and a way to put it right.
  const invented = event.estimateReason === 'no-source' && !event.done

  return (
    <div
      ref={rowRef}
      className={`dl-row ${event.done ? 'dl-row--done' : ''} ${open ? 'dl-row--open' : ''}`}
    >
      {/* Ticking off stays one click, but from a target you have to mean. */}
      <button
        type="button"
        className="dl-box-btn"
        onClick={() => onToggle(event)}
        aria-pressed={!!event.done}
        aria-label={`${event.done ? 'Untick' : 'Tick off'} ${event.title}`}
      >
        <span className="dl-box" aria-hidden="true">✓</span>
      </button>

      <button
        type="button"
        className="dl-row-main"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-controls={panelId}
        // The tags carry meaning a screen reader cannot see.
        aria-label={`${event.title} — ${kind}, due ${event.dateDisplay}${
          event.deadlineType ? `. ${DEADLINE_TYPE_MEANING[event.deadlineType]}` : ''}`}
      >
        <span className="dl-text">
          <span className="dl-title">{event.title}</span>
          <span className="dl-meta">
            <span className="dl-pin" style={{ background: event.color }} aria-hidden="true" />
            {fullModule ? event.module : MODULE_SHORT_LABEL[event.module]}
            {/* ED binds a student to attend. Four initials on a dropdown is
                not enough for a promise that size. */}
            {event.deadlineType && event.deadlineType !== 'Rolling' && (
              <abbr className="dl-round" title={DEADLINE_TYPE_MEANING[event.deadlineType]}>
                {event.deadlineType}
              </abbr>
            )}
            {/* The round already says this is a college application, so the
                kind chip only earns its place where there is no round —
                scholarships, FAFSA, and the student's own dates. At aside
                width four chips wrap to a third line. */}
            {!event.deadlineType && <span className="dl-kind">{kind}</span>}
            {event.estimated && (
              <span className="dl-est" title={ESTIMATE_HINT[event.estimateReason ?? 'cycle-year']}>
                {event.estimateReason === 'no-source' ? 'no date on file' : 'est.'}
              </span>
            )}
            {event.corrected && <span className="dl-kind">yours</span>}
            {event.note && !open && <span className="dl-kind dl-kind--note">note</span>}
          </span>
        </span>
        {offset < 0 && !event.done && (
          <span className="dl-when dl-when--hot">{Math.abs(offset)}d late</span>
        )}
        <span className={`dl-caret ${open ? 'dl-caret--open' : ''}`} aria-hidden="true">›</span>
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          className={`dl-pop ${pos ? '' : 'dl-pop--sheet'}`}
          id={panelId}
          role="dialog"
          aria-label={event.title}
          style={pos ? { top: pos.top, left: pos.left, width: POP_W } : undefined}
        >
          <div className="dl-pop-head">
            <span className="dl-pop-title">{event.title}</span>
            <button
              type="button"
              className="dl-pop-x"
              onClick={() => setOpen(false)}
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
            {/* Every action here names its deadline: several rows can be open
                at once, so "Remove" alone says nothing about what it removes,
                to a screen reader or to a test. */}
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
              <label className="dl-fix-label" htmlFor={`fix-${panelId}`}>
                {event.collegeName ?? 'This'} deadline, from their site
              </label>
              <input
                id={`fix-${panelId}`}
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
              <label className="dl-note-label" htmlFor={`note-${panelId}`}>Your notes</label>
              <textarea
                id={`note-${panelId}`}
                className="dl-note-input"
                value={note}
                maxLength={NOTE_MAX}
                rows={2}
                placeholder="What's left, who you've asked, where you got to…"
                onChange={(e) => setNote(e.target.value)}
                // Saved on the way out rather than per keystroke: a note is
                // written in one go, and every keystroke would be a settings
                // write.
                onBlur={() => { if (note !== (event.note ?? '')) onNote(event.id, note) }}
              />
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
