/**
 * CalendarPage — the month, plus whatever sits on the day you picked.
 *
 * A month grid can only ever show a couple of words per day, so the grid names
 * what is there and a detail panel below it carries the full rows — same
 * component the dashboard panel uses, so a deadline reads the same in both.
 * Picking a day is the only state the grid holds; today is picked on arrival.
 */

import { useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useDeadlineEvents } from '../lib/useDeadlineEvents'
import { downloadIcs } from '../lib/calendarExport'
import {
  DEADLINE_GROUPS,
  deadlineGroupById,
  selectDeadlines,
  eventsOn,
  sameDay,
  type DeadlineEvent,
} from '../data/applicationDeadlines'
import DeadlineRow from './DeadlineRow'
import DeadlineDetail, { type DeadlineActions } from './DeadlineDetail'
import AddDeadlineForm from './AddDeadlineForm'
import { useAnchoredPanel, PANEL_W } from '../lib/useAnchoredPanel'
import { toIsoDay } from '../lib/personalDeadlines'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { resolveDeadlinePreferences } from '../lib/preferences'

const EASE_OUT = [0.22, 1, 0.36, 1] as const

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

/** The picker's optgroups, in declaration order, so adding a DEADLINE_GROUPS
 *  row needs no change here. */
const GROUP_SECTIONS: { section: string | undefined; groups: typeof DEADLINE_GROUPS }[] = []
for (const g of DEADLINE_GROUPS) {
  const last = GROUP_SECTIONS.at(-1)
  if (last && last.section === g.section) last.groups = [...last.groups, g]
  else GROUP_SECTIONS.push({ section: g.section, groups: [g] })
}

/** edvifi-fafsa.ics / edvifi-early-confirmed.ics — two exports in a downloads
 *  folder should be tellable apart without opening them. */
function exportFilename(groupId: string, confirmedOnly: boolean): string {
  const base = groupId === 'all' ? 'deadlines' : groupId
  return `edvifi-${base}${confirmedOnly ? '-confirmed' : ''}.ics`
}

/** Events named in a day cell before the rest collapse into "+N more". */
const PINS_PER_CELL = 2

interface Props {
  /** `profiles.grade_start_idx` — picks which application cycle to date. */
  startIdx: number
  /** Day to open on, when the week strip sent the student here. */
  initialDay?: Date | null
}

export default function CalendarPage({ startIdx, initialDay }: Props) {
  const now = new Date()
  const opening = initialDay ?? now
  const [year, setYear] = useState(opening.getFullYear())
  const [month, setMonth] = useState(opening.getMonth())
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState<Date>(
    new Date(opening.getFullYear(), opening.getMonth(), opening.getDate()),
  )
  // Every dated thing the student has: colleges, scholarships, FAFSA, and the
  // dates they set themselves.
  const { profile } = useAuth()
  const toast = useToast()
  // The same standing filter the dashboard applies, so the two never show
  // different sets of the same deadlines.
  const deadlinePrefs = useMemo(
    () => resolveDeadlinePreferences(profile?.settings),
    [profile?.settings],
  )
  const { events, failed, toggleDone, addOwn, removeOwn, correctDate, setNote } = useDeadlineEvents(startIdx, {
    visibility: deadlinePrefs,
    onNotice: toast.info,
  })
  const [groupId, setGroupId] = useState('all')
  // Upcoming-only by default: a deadline that has already passed is noise in a
  // calendar the student is about to live out of. Confirmed-only is not, since
  // most scholarship dates are estimated and defaulting it on would silently
  // export almost nothing.
  const [upcomingOnly, setUpcomingOnly] = useState(true)
  const [confirmedOnly, setConfirmedOnly] = useState(false)
  const selection = { groupId, confirmedOnly, upcomingOnly, now }
  const exportEvents = selectDeadlines(events, selection)

  const firstDay = getFirstDayOfMonth(year, month)
  const monthName = new Date(year, month).toLocaleString('default', { month: 'long' })

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Six full weeks from the Sunday on or before the 1st. The days either side
  // are drawn dimmed rather than left blank: a deadline on the 1st of next
  // month is worth seeing while you are looking at the end of this one.
  const gridStart = new Date(year, month, 1 - firstDay)
  const cells = Array.from({ length: 42 }, (_, i) =>
    new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))

  const monthTasks = events.filter(e => e.date.getMonth() === month && e.date.getFullYear() === year)
  const selectedEvents = eventsOn(events, selected)

  return (
    <div className="cal-page">
      <motion.div
        className="cal-header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        <div className="cal-header-row">
          <div>
            <h1 className="cal-title">Calendar</h1>
            <p className="cal-subtitle">Your upcoming deadlines and milestones.</p>
          </div>
          <ExportMenu
            events={events}
            groupId={groupId}
            setGroupId={setGroupId}
            selection={selection}
            exportEvents={exportEvents}
            upcomingOnly={upcomingOnly}
            setUpcomingOnly={setUpcomingOnly}
            confirmedOnly={confirmedOnly}
            setConfirmedOnly={setConfirmedOnly}
          />
        </div>
      </motion.div>

      <motion.div
        className="cal-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: EASE_OUT }}
      >
        {/* Month nav */}
        <div className="cal-month-nav">
          <button className="cal-nav-btn" onClick={prevMonth} aria-label="Previous month">←</button>
          <span className="cal-month-label">{monthName} {year}</span>
          <button className="cal-nav-btn" onClick={nextMonth} aria-label="Next month">→</button>
        </div>

        {/* Day headers */}
        <div className="cal-grid cal-grid--header">
          {DAYS.map(d => (
            <div key={d} className="cal-day-header">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="cal-grid">
          {cells.map((date, i) => {
            const tasks = eventsOn(events, date)
            const outside = date.getMonth() !== month
            const isToday = sameDay(date, now)
            const isSelected = sameDay(date, selected)
            const pins = tasks.slice(0, PINS_PER_CELL)
            const dayName = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
            return (
              // A div, not a button: the entries inside it are buttons of their
              // own now, and a button cannot hold a button. Picking the day is
              // its own control behind them, the way a calendar grid works —
              // clicking an entry opens it, clicking the space around it
              // selects the day.
              <motion.div
                key={i}
                className={`cal-cell ${outside ? 'cal-cell--out' : ''} ${isToday ? 'cal-cell--today' : ''} ${isSelected ? 'cal-cell--sel' : ''}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.008, duration: 0.3 }}
              >
                <button
                  type="button"
                  className="cal-cell-pick"
                  onClick={() => setSelected(date)}
                  aria-pressed={isSelected}
                  aria-label={`${dayName}, ${tasks.length === 0 ? 'nothing due' : `${tasks.length} due`}`}
                />
                <span className={`cal-day-num ${isToday ? 'cal-day-num--today' : ''}`}>{date.getDate()}</span>
                {pins.map((t) => (
                  <CalendarEntry
                    key={t.id}
                    event={t}
                    now={now}
                    onToggle={toggleDone}
                    onRemove={removeOwn}
                    onCorrect={correctDate}
                    onNote={setNote}
                  />
                ))}
                {tasks.length > pins.length && (
                  <button type="button" className="cal-more" onClick={() => setSelected(date)}>
                    +{tasks.length - pins.length} more
                  </button>
                )}
                {/* Google-calendar habit: the empty part of a day is where you
                    put something new. */}
                <button
                  type="button"
                  className="cal-add-day"
                  onClick={() => { setSelected(date); setAdding(true) }}
                  aria-label={`Add your own date on ${dayName}`}
                  title="Add your own date"
                >
                  +
                </button>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Tasks list below calendar */}
      <motion.div
        className="cal-tasks-list"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, ease: EASE_OUT }}
      >
        <div className="cal-day-head">
          <h3 className="cal-day-heading">
            {selected.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          {!adding && (
            <button type="button" className="dl-add-open cal-day-add" onClick={() => setAdding(true)}>
              + Add your own date
            </button>
          )}
        </div>
        {adding && (
          <AddDeadlineForm
            initialDate={toIsoDay(selected)}
            onAdd={(t, d, m) => { addOwn(t, d, m); setAdding(false) }}
            onCancel={() => setAdding(false)}
          />
        )}
        {selectedEvents.length === 0 ? (
          <div className="dl-empty">
            <b>Nothing on this day</b>
            {failed
              ? "Couldn't load your deadlines — check your connection and reload."
              : monthTasks.length > 0
                ? 'Pick another date above.'
                : events.length === 0
                  ? 'Add colleges in Application Tracking, or scholarships in Financial Aid.'
                  : 'Nothing this month — try another.'}
          </div>
        ) : (
          selectedEvents.map((event) => (
            <DeadlineRow
              key={event.id}
              event={event}
              now={now}
              onToggle={toggleDone}
              onRemove={removeOwn}
              onCorrect={correctDate}
              onNote={setNote}
              fullModule
              modal
            />
          ))
        )}
      </motion.div>
    </div>
  )
}

/**
 * One deadline inside a day cell.
 *
 * Opens the same panel the Overview rail and the week strip use, anchored to
 * the entry, so a date can be read, ticked, noted or removed without leaving
 * the month.
 */
function CalendarEntry({ event, now, ...actions }: DeadlineActions & {
  event: DeadlineEvent
  now: Date
}) {
  const panelId = useId()
  const { anchorRef, panelRef, open, pos, toggle, close } = useAnchoredPanel<HTMLButtonElement>()
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={`cal-pin-row ${event.done ? 'cal-pin-row--done' : ''} ${open ? 'cal-pin-row--open' : ''}`}
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        title={`${event.title} — ${event.dateDisplay}`}
      >
        <span className="cal-pin" style={{ background: event.color }} aria-hidden="true" />
        <span className="cal-pin-text">{event.shortTitle}</span>
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

/**
 * Exporting, behind one button.
 *
 * A select, two checkboxes, a button and two lines of explanation sat open
 * beside the page title and read as the busiest thing on the screen — for
 * something a student does once a term, if that. It opens on demand now and
 * the explanation comes with it, where there is room to say it properly.
 */
function ExportMenu({
  events, groupId, setGroupId, selection, exportEvents,
  upcomingOnly, setUpcomingOnly, confirmedOnly, setConfirmedOnly,
}: {
  events: DeadlineEvent[]
  groupId: string
  setGroupId: (id: string) => void
  selection: Parameters<typeof selectDeadlines>[1]
  exportEvents: DeadlineEvent[]
  upcomingOnly: boolean
  setUpcomingOnly: (v: boolean) => void
  confirmedOnly: boolean
  setConfirmedOnly: (v: boolean) => void
}) {
  const panelId = useId()
  const { anchorRef, panelRef, open, pos, toggle, close } = useAnchoredPanel<HTMLButtonElement>()
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className="cal-export-open"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
      >
        Export dates
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          id={panelId}
          className={`dl-pop cal-export-pop ${pos ? '' : 'dl-pop--sheet'}`}
          role="dialog"
          aria-label="Export dates"
          style={pos ? { top: pos.top, left: pos.left, width: PANEL_W } : undefined}
        >
          <div className="dl-pop-head">
            <span className="dl-pop-title">Send dates to another calendar</span>
            <button type="button" className="dl-pop-x" onClick={close} aria-label="Close export">×</button>
          </div>
          <p className="cal-export-intro">Google Calendar, Apple Calendar and Outlook all import this file.</p>

          <label className="dl-add-label" htmlFor={`${panelId}-group`}>Which dates</label>
          <select
            id={`${panelId}-group`}
            className="dl-add-input"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            {GROUP_SECTIONS.map(({ section, groups }) => {
              // The count is on the option itself: picking a group only to
              // find the button disabled gives no reason why.
              const opts = groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}{g.hint ? ` (${g.hint})` : ''} —{' '}
                  {selectDeadlines(events, { ...selection, groupId: g.id }).length}
                </option>
              ))
              return section ? <optgroup key={section} label={section}>{opts}</optgroup> : opts
            })}
          </select>

          <div className="cal-export-toggles">
            <label className="cal-export-toggle">
              <input type="checkbox" checked={upcomingOnly} onChange={(e) => setUpcomingOnly(e.target.checked)} />
              Upcoming only
            </label>
            <label className="cal-export-toggle">
              <input type="checkbox" checked={confirmedOnly} onChange={(e) => setConfirmedOnly(e.target.checked)} />
              Confirmed dates only
            </label>
          </div>

          <button
            className="dl-add-save"
            onClick={() =>
              downloadIcs(exportEvents, exportFilename(groupId, confirmedOnly), {
                calendarName: `Edvifi — ${deadlineGroupById(groupId).label}`,
              })
            }
            disabled={exportEvents.length === 0}
          >
            Download .ics
          </button>
          <p className="cal-export-note">
            It is a copy, not a live link — download again when your dates change.
          </p>
        </div>,
        document.body,
      )}
    </>
  )
}
