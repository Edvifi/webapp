/**
 * DeadlineRow — one deadline as a tickable row.
 *
 * Shared by the dashboard panel and the calendar's day detail, which the
 * artifact draws identically. Keeping one component means a change to how a
 * deadline reads happens once.
 */

import { kindLabel, daysUntil, type DeadlineEvent } from '../data/applicationDeadlines'

interface Props {
  event: DeadlineEvent
  now: Date
  onToggle: (event: DeadlineEvent) => void
  /** Show the module's full name rather than its short form. The calendar's
   *  day panel has the width for it; the dashboard aside does not. */
  fullModule?: boolean
  onRemove?: (id: string) => void
}

export default function DeadlineRow({ event, now, onToggle, fullModule, onRemove }: Props) {
  const offset = daysUntil(event, now)
  const kind = kindLabel(event)
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
        aria-label={`${event.title} — ${kind}, due ${event.dateDisplay}`}
      >
        <span className="dl-box" aria-hidden="true">✓</span>
        <span className="dl-text">
          <span className="dl-title">{event.title}</span>
          <span className="dl-meta">
            <span className="dl-pin" style={{ background: event.color }} aria-hidden="true" />
            {fullModule ? event.module : event.module === 'Application Tracking' ? 'Applications' : 'Financial Aid'}
            <span className="dl-kind">{kind}</span>
            {event.estimated && <span className="dl-est">est.</span>}
          </span>
        </span>
        {offset < 0 && !event.done && (
          <span className="dl-when dl-when--hot">{Math.abs(offset)}d late</span>
        )}
      </button>
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
    </div>
  )
}
