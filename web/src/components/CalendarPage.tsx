/**
 * CalendarPage — Monthly calendar view with tasks
 *
 * Shows current month with upcoming tasks marked on their due dates.
 * Follows the warm parchment theme.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useDeadlineEvents } from '../lib/useDeadlineEvents'
import { downloadIcs } from '../lib/calendarExport'
import { DEADLINE_GROUPS, deadlineGroupById, selectDeadlines } from '../data/applicationDeadlines'

const EASE_OUT = [0.22, 1, 0.36, 1] as const

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

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

interface Props {
  /** `profiles.grade_start_idx` — picks which application cycle to date. */
  startIdx: number
}

export default function CalendarPage({ startIdx }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const today = now.getDate()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
  // Real deadlines: college applications plus tracked scholarships.
  const { events, failed } = useDeadlineEvents(startIdx)
  const [groupId, setGroupId] = useState('all')
  // Upcoming-only by default: a deadline that has already passed is noise in a
  // calendar the student is about to live out of. Confirmed-only is not, since
  // most scholarship dates are estimated and defaulting it on would silently
  // export almost nothing.
  const [upcomingOnly, setUpcomingOnly] = useState(true)
  const [confirmedOnly, setConfirmedOnly] = useState(false)
  const selection = { groupId, confirmedOnly, upcomingOnly, now }
  const exportEvents = selectDeadlines(events, selection)

  const daysInMonth = getDaysInMonth(year, month)
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

  // Build grid cells
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  const monthTasks = events.filter(e => e.date.getMonth() === month && e.date.getFullYear() === year)
  const tasksForDay = (day: number) => monthTasks.filter(e => e.date.getDate() === day)

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
          <div className="cal-export">
            <div className="cal-export-row">
              <label className="cal-export-label" htmlFor="cal-export-group">
                Export
              </label>
              <select
                id="cal-export-group"
                className="cal-export-select"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              >
                {GROUP_SECTIONS.map(({ section, groups }) => {
                  // The count is on the option itself: picking a group only to
                  // find the button disabled gives no reason why.
                  const opts = groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                      {g.hint ? ` (${g.hint})` : ''} —{' '}
                      {selectDeadlines(events, { ...selection, groupId: g.id }).length}
                    </option>
                  ))
                  return section ? (
                    <optgroup key={section} label={section}>
                      {opts}
                    </optgroup>
                  ) : (
                    opts
                  )
                })}
              </select>
              <button
                className="cal-export-btn"
                onClick={() =>
                  downloadIcs(exportEvents, exportFilename(groupId, confirmedOnly), {
                    calendarName: `Edvifi — ${deadlineGroupById(groupId).label}`,
                  })
                }
                disabled={exportEvents.length === 0}
                title={
                  exportEvents.length === 0
                    ? 'Nothing matches this selection yet'
                    : `Download ${exportEvents.length} deadline${exportEvents.length === 1 ? '' : 's'} as an .ics file`
                }
              >
                Add to my calendar
              </button>
            </div>
            <div className="cal-export-row cal-export-row--toggles">
              <label className="cal-export-toggle">
                <input
                  type="checkbox"
                  checked={upcomingOnly}
                  onChange={(e) => setUpcomingOnly(e.target.checked)}
                />
                Upcoming only
              </label>
              <label className="cal-export-toggle">
                <input
                  type="checkbox"
                  checked={confirmedOnly}
                  onChange={(e) => setConfirmedOnly(e.target.checked)}
                />
                Confirmed dates only
              </label>
            </div>
          </div>
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
          <button className="cal-nav-btn" onClick={prevMonth}>←</button>
          <span className="cal-month-label">{monthName} {year}</span>
          <button className="cal-nav-btn" onClick={nextMonth}>→</button>
        </div>

        {/* Day headers */}
        <div className="cal-grid cal-grid--header">
          {DAYS.map(d => (
            <div key={d} className="cal-day-header">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="cal-grid">
          {cells.map((day, i) => {
            const tasks = day ? tasksForDay(day) : []
            const isToday = isCurrentMonth && day === today
            return (
              <motion.div
                key={i}
                className={`cal-cell ${day ? '' : 'cal-cell--empty'} ${isToday ? 'cal-cell--today' : ''}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.008, duration: 0.3 }}
              >
                {day && (
                  <>
                    <span className={`cal-day-num ${isToday ? 'cal-day-num--today' : ''}`}>
                      {day}
                    </span>
                    {tasks.length > 0 && (
                      <div className="cal-cell-tasks">
                        {tasks.map((t) => (
                          <div
                            key={t.id}
                            className="cal-cell-task"
                            style={{ background: t.color + '18', borderLeft: `2px solid ${t.color}` }}
                            title={`${t.title} — ${t.dateDisplay}${t.estimated ? ' (estimated)' : ''}`}
                          >
                            <span className="cal-cell-task-text">{t.shortTitle}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
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
        <h3 className="cal-tasks-heading">This Month's Deadlines</h3>
        {monthTasks.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-faint)', padding: '12px 0' }}>
            {failed
              ? "Couldn't load your deadlines — check your connection and reload."
              : events.length === 0
                ? 'Add colleges in Application Tracking, or scholarships in Financial Aid, to see their deadlines here.'
                : 'No deadlines this month.'}
          </p>
        )}
        {monthTasks.map((task, i) => (
          <motion.div
            key={task.id}
            className="cal-task-row"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 + i * 0.04, duration: 0.35, ease: EASE_OUT }}
          >
            <div className="cal-task-date">
              <span className="cal-task-day">{task.date.getDate()}</span>
              <span className="cal-task-month">{task.date.toLocaleString('default', { month: 'short' })}</span>
            </div>
            <div className="cal-task-bar" style={{ background: task.color }} />
            <div className="cal-task-info">
              <span className="cal-task-name">{task.title}</span>
              <span className="cal-task-module">{task.module}{task.estimated ? ' · est.' : ''}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
