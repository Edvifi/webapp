/**
 * DeadlineRow — one deadline as a row that opens.
 *
 * Shared by the Overview rail and the calendar's day detail, which the
 * artifact draws identically. Keeping one component means a change to how a
 * deadline reads happens once.
 *
 * The whole row used to be a single button that marked the deadline done.
 * Students clicked it expecting the row to open, and instead ticked something
 * off — which then vanished from the list, because done deadlines are hidden.
 * So the row body opens DeadlineDetail now, and finishing something is an
 * explicit act: the checkbox, or the labelled button inside the panel.
 */

import { useId } from 'react'
import {
  kindLabel, daysUntil, DEADLINE_TYPE_MEANING, MODULE_SHORT_LABEL, ESTIMATE_HINT,
  type DeadlineEvent,
} from '../data/applicationDeadlines'
import DeadlineDetail, { type DeadlineActions } from './DeadlineDetail'
import { useAnchoredPanel } from '../lib/useAnchoredPanel'

interface Props extends DeadlineActions {
  event: DeadlineEvent
  now: Date
  /** Show the module's full name rather than its short form. The calendar's
   *  day panel has the width for it; the dashboard aside does not. */
  fullModule?: boolean
  /** Open the detail centred rather than beside the row. */
  modal?: boolean
}

export default function DeadlineRow({ event, now, fullModule, modal, ...actions }: Props) {
  const offset = daysUntil(event, now)
  const kind = kindLabel(event)
  const panelId = useId()
  const { anchorRef, panelRef, open, pos, toggle, close } = useAnchoredPanel<HTMLDivElement>()

  return (
    <div
      ref={anchorRef}
      className={`dl-row ${event.done ? 'dl-row--done' : ''} ${open ? 'dl-row--open' : ''}`}
    >
      {/* Ticking off stays one click, but from a target you have to mean. */}
      <button
        type="button"
        className="dl-box-btn"
        onClick={() => actions.onToggle(event)}
        aria-pressed={!!event.done}
        aria-label={`${event.done ? 'Untick' : 'Tick off'} ${event.title}`}
      >
        <span className="dl-box" aria-hidden="true">✓</span>
      </button>

      <button
        type="button"
        className="dl-row-main"
        onClick={toggle}
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

      {open && (
        <DeadlineDetail
          event={event}
          now={now}
          pos={pos}
          modal={modal}
          panelRef={panelRef}
          panelId={panelId}
          onClose={close}
          {...actions}
        />
      )}
    </div>
  )
}
