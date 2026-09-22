/**
 * DeadlineRow — one deadline as a tickable row.
 *
 * Shared by the dashboard panel and the calendar's day detail, which the
 * artifact draws identically. Keeping one component means a change to how a
 * deadline reads happens once.
 */

import { useState } from 'react'
import {
  kindLabel, daysUntil, DEADLINE_TYPE_MEANING, MODULE_SHORT_LABEL, type DeadlineEvent,
} from '../data/applicationDeadlines'
import { toIsoDay } from '../lib/personalDeadlines'

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
}

export default function DeadlineRow({ event, now, onToggle, fullModule, onRemove, onCorrect }: Props) {
  const offset = daysUntil(event, now)
  const kind = kindLabel(event)
  const [fixing, setFixing] = useState(false)
  const [typed, setTyped] = useState(() => toIsoDay(event.date))
  // We hold no deadline for this school at all — the date on screen came from
  // a typical date for the round, not from them. Saying "est." for that is far
  // too quiet, so it gets a sentence and a way to put it right.
  const invented = event.estimateReason === 'no-source' && !event.done
  return (
    <div className={`dl-row ${event.done ? 'dl-row--done' : ''}`}>
      <button
        type="button"
        className="dl-row-main"
        onClick={() => onToggle(event)}
        aria-pressed={!!event.done}
        // The row is the control, so the accessible name has to carry what the
        // tags say visually — a screen reader user gets "done"/"not done" from
        // aria-pressed, but not the kind or the date.
        aria-label={`${event.title} — ${kind}, due ${event.dateDisplay}${
          event.deadlineType ? `. ${DEADLINE_TYPE_MEANING[event.deadlineType]}` : ''}`}
      >
        <span className="dl-box" aria-hidden="true">✓</span>
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
          </span>
        </span>
        {offset < 0 && !event.done && (
          <span className="dl-when dl-when--hot">{Math.abs(offset)}d late</span>
        )}
      </button>
      {invented && onCorrect && (
        <button
          type="button"
          className="dl-fix"
          onClick={() => setFixing((v) => !v)}
          title="We don't have this deadline — add the real one"
        >
          {fixing ? 'Cancel' : 'Set date'}
        </button>
      )}
      {onRemove && event.source === 'self' && (
        <button
          type="button"
          className="dl-remove"
          onClick={() => onRemove(event.id)}
          aria-label={`Remove ${event.title}`}
          title="Remove this date"
        >
          ×
        </button>
      )}
      {fixing && onCorrect && (
        <form
          className="dl-fix-form"
          onSubmit={(e) => { e.preventDefault(); onCorrect(event.id, typed); setFixing(false) }}
        >
          <label className="dl-fix-label" htmlFor={`fix-${event.id}`}>
            {event.collegeName ?? 'This'} deadline, from their site
          </label>
          <input
            id={`fix-${event.id}`}
            className="dl-fix-input"
            type="date"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <button type="submit" className="dl-fix-save" disabled={!typed}>Save</button>
        </form>
      )}
    </div>
  )
}
