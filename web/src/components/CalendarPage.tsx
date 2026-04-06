/**
 * CalendarPage — Monthly calendar view with tasks
 *
 * Shows current month with upcoming tasks marked on their due dates.
 * Follows the warm parchment theme.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'

const EASE_OUT = [0.22, 1, 0.36, 1] as const

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalendarTask {
  title: string
  day: number
  color: string
  module: string
}

// Mock tasks for the current month
const MOCK_TASKS: CalendarTask[] = [
  { title: 'PSAT registration deadline', day: 5, color: '#C47A12', module: 'Testing' },
  { title: 'Course plan meeting', day: 8, color: '#2D9E72', module: 'Courses' },
  { title: 'Scholarship spreadsheet', day: 12, color: '#C47A12', module: 'Financial' },
  { title: 'Club officer election', day: 15, color: '#7048C8', module: 'Activities' },
  { title: 'SAT prep class starts', day: 18, color: '#7048C8', module: 'Testing' },
  { title: 'Join new activity', day: 20, color: '#2D9E72', module: 'Activities' },
  { title: 'Essay brainstorm due', day: 24, color: '#1D7FC4', module: 'Essays' },
  { title: 'Financial aid webinar', day: 28, color: '#C47A12', module: 'Financial' },
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const today = now.getDate()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

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

  const tasksForDay = (day: number) => MOCK_TASKS.filter(t => t.day === day)

  return (
    <div className="cal-page">
      <motion.div
        className="cal-header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        <h1 className="cal-title">Calendar</h1>
        <p className="cal-subtitle">Your upcoming deadlines and milestones.</p>
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
                        {tasks.map((t, ti) => (
                          <div
                            key={ti}
                            className="cal-cell-task"
                            style={{ background: t.color + '18', borderLeft: `2px solid ${t.color}` }}
                            title={t.title}
                          >
                            <span className="cal-cell-task-text">{t.title}</span>
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
        <h3 className="cal-tasks-heading">This Month's Tasks</h3>
        {MOCK_TASKS.map((task, i) => (
          <motion.div
            key={task.title}
            className="cal-task-row"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 + i * 0.04, duration: 0.35, ease: EASE_OUT }}
          >
            <div className="cal-task-date">
              <span className="cal-task-day">{task.day}</span>
              <span className="cal-task-month">{monthName.slice(0, 3)}</span>
            </div>
            <div className="cal-task-bar" style={{ background: task.color }} />
            <div className="cal-task-info">
              <span className="cal-task-name">{task.title}</span>
              <span className="cal-task-module">{task.module}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
