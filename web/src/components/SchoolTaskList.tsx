/**
 * SchoolTaskList — one college's application tasks, grouped by phase.
 *
 * This used to be the body of a popup that showed one college at a time and
 * closed the moment you looked away, which made the most actionable thing in
 * the module the hardest thing to keep in view. It is a page now
 * (ApplicationTasksTab) and the popup is gone.
 *
 * Owns no state but the new-task input: every change goes up through
 * `onChange`, which persists `entry.tasks`.
 *
 * Each task can carry the student's own due date. That is not the college's
 * deadline — which is derived and fixed — but the date they decided to have
 * the essay drafted or the recommendations asked for, usually earlier and
 * usually the one that actually needs remembering. A dated task shows up on
 * the calendar, the week strip and the deadline panel.
 */

import { useState } from 'react'
import { C, MODULE_COLORS } from '../lib/designTokens'
import { Bar } from './moduleUI'
import { TASK_PHASES, tasksForEntry } from '../data/applicationTasks'
import type { ApplicationEntry, AppTask } from '../data/applicationsChecklist'

const MC = MODULE_COLORS.applications

export default function SchoolTaskList({
  app,
  onChange,
  showProgress = true,
}: {
  app: ApplicationEntry
  onChange: (tasks: AppTask[]) => void
  /** The page draws its own progress bar in each college's header. */
  showProgress?: boolean
}) {
  const tasks = tasksForEntry(app)
  const [newLabel, setNewLabel] = useState('')
  const done = tasks.filter((x) => x.done).length

  const toggle = (id: string) =>
    onChange(tasks.map((x) => (x.id === id ? { ...x, done: !x.done } : x)))
  const remove = (id: string) => onChange(tasks.filter((x) => x.id !== id))
  const setDue = (id: string, due: string) =>
    onChange(tasks.map((x) => (x.id === id ? { ...x, due: due || undefined } : x)))
  const addCustom = () => {
    const label = newLabel.trim()
    if (!label) return
    // Stable, collision-free id derived from existing custom tasks (no Date.now).
    const nums = tasks.filter((x) => /^c-\d+$/.test(x.id)).map((x) => parseInt(x.id.slice(2), 10))
    const id = `c-${(nums.length ? Math.max(...nums) : 0) + 1}`
    onChange([...tasks, { id, label, done: false, phase: 'after', custom: true }])
    setNewLabel('')
  }

  return (
    <div>
      {showProgress && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ flex: 1 }}><Bar value={tasks.length ? done / tasks.length : 0} color={MC} height={6} /></div>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: C.textMuted, whiteSpace: 'nowrap' }}>
            {done} of {tasks.length} done
          </span>
        </div>
      )}

      {TASK_PHASES.map((phase) => {
        const items = tasks.filter((x) => x.phase === phase.id)
        if (items.length === 0) return null
        return (
          <div key={phase.id} style={{ marginTop: 16 }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, color: 'rgba(var(--ink-rgb), 0.40)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              {phase.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map((task) => (
                <div
                  key={task.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}
                >
                  <button
                    onClick={() => toggle(task.id)}
                    aria-label={`${task.label} — ${task.done ? 'mark not done' : 'mark done'}`}
                    aria-pressed={task.done}
                    style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 6, cursor: 'pointer', border: task.done ? 'none' : `2px solid ${C.borderStrong}`, background: task.done ? MC : 'transparent', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                  >
                    {task.done ? '✓' : ''}
                  </button>
                  <span style={{ flex: 1, minWidth: 0, fontFamily: "'Outfit',sans-serif", fontSize: 13.5, color: task.done ? C.textMuted : C.text, textDecoration: task.done ? 'line-through' : 'none' }}>
                    {task.label}
                  </span>
                  {/* Empty until they set one, so an undated checklist stays a
                      checklist rather than a wall of date pickers. */}
                  <input
                    type="date"
                    value={task.due ?? ''}
                    onChange={(e) => setDue(task.id, e.target.value)}
                    aria-label={`Due date for ${task.label}`}
                    title={task.due ? 'Your date for this task' : 'Set your own date for this task'}
                    style={{
                      flexShrink: 0, width: task.due ? 132 : 34, padding: '3px 6px',
                      border: `1px ${task.due ? 'solid' : 'dashed'} ${C.border}`,
                      borderRadius: 7, background: task.due ? C.white : 'transparent',
                      fontFamily: "'Outfit',sans-serif", fontSize: 11.5,
                      color: task.due ? C.text : 'transparent', colorScheme: 'light',
                      cursor: 'pointer', outline: 'none',
                    }}
                  />
                  {task.custom && (
                    <button
                      onClick={() => remove(task.id)}
                      aria-label={`Remove ${task.label}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.textFaint, padding: 2, lineHeight: 1 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#B93A3A' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.textFaint }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addCustom() }}
          placeholder="Add your own task…"
          aria-label={`Add a task for ${app.name ?? 'this college'}`}
          style={{ flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, outline: 'none' }}
        />
        <button
          onClick={addCustom}
          disabled={!newLabel.trim()}
          style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: newLabel.trim() ? MC : C.surfaceHover, color: newLabel.trim() ? '#fff' : C.textFaint, cursor: newLabel.trim() ? 'pointer' : 'default', fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, flexShrink: 0 }}
        >
          Add
        </button>
      </div>
    </div>
  )
}
