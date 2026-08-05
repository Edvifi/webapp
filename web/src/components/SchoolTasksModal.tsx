/**
 * SchoolTasksModal — per-school application to-do list in a popup.
 *
 * Shows the checklist for one college (seeded from a smart default, then
 * editable), grouped by phase, with add / remove / check. Every change is
 * pushed up via onChange, which persists entry.tasks.
 */

import { useState } from 'react'
import { C, MODULE_COLORS } from '../lib/designTokens'
import { useModalA11y } from '../lib/useModalA11y'
import { Bar, CollegeLogo } from './moduleUI'
import { TASK_PHASES, tasksForEntry } from '../data/applicationTasks'
import type { ApplicationEntry, AppTask } from '../data/applicationsChecklist'

const MC = MODULE_COLORS.applications

interface Display { logoUrl?: string | null; emoji: string; name: string; sub: string }

export default function SchoolTasksModal({
  app,
  display,
  onChange,
  onClose,
}: {
  app: ApplicationEntry
  display: Display
  onChange: (tasks: AppTask[]) => void
  onClose: () => void
}) {
  const tasks = tasksForEntry(app)
  const [newLabel, setNewLabel] = useState('')
  const done = tasks.filter((x) => x.done).length

  const dialogRef = useModalA11y<HTMLDivElement>(onClose)

  const toggle = (id: string) => onChange(tasks.map((x) => (x.id === id ? { ...x, done: !x.done } : x)))
  const remove = (id: string) => onChange(tasks.filter((x) => x.id !== id))
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
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: C.scrim, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${display.name} — application tasks`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(560px, 100%)', maxHeight: '86vh', overflowY: 'auto', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: C.shadow3 }}
      >
        {/* header */}
        <div style={{ position: 'sticky', top: 0, background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '18px 20px', borderRadius: '16px 16px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CollegeLogo logoUrl={display.logoUrl} emoji={display.emoji} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Young Serif',serif", fontSize: 18, color: C.text }}>{display.name}</div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted }}>{display.sub}</div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: C.textFaint, padding: 4, lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1 }}><Bar value={tasks.length ? done / tasks.length : 0} color={MC} height={6} /></div>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: C.textMuted, whiteSpace: 'nowrap' }}>{done} of {tasks.length} done</span>
          </div>
        </div>

        {/* phases */}
        <div style={{ padding: '8px 20px 20px' }}>
          {TASK_PHASES.map((phase) => {
            const items = tasks.filter((x) => x.phase === phase.id)
            if (items.length === 0) return null
            return (
              <div key={phase.id} style={{ marginTop: 16 }}>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, color: 'rgba(var(--ink-rgb), 0.40)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{phase.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {items.map((task) => (
                    <div
                      key={task.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}
                    >
                      <button
                        onClick={() => toggle(task.id)}
                        aria-label={task.done ? 'Mark not done' : 'Mark done'}
                        style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 6, cursor: 'pointer', border: task.done ? 'none' : `2px solid ${C.borderStrong}`, background: task.done ? MC : 'transparent', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                      >
                        {task.done ? '✓' : ''}
                      </button>
                      <span style={{ flex: 1, fontFamily: "'Outfit',sans-serif", fontSize: 13.5, color: task.done ? C.textMuted : C.text, textDecoration: task.done ? 'line-through' : 'none' }}>{task.label}</span>
                      {task.custom && (
                        <button
                          onClick={() => remove(task.id)}
                          aria-label="Remove task"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.textFaint, padding: 2, lineHeight: 1 }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--c-danger)' }}
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

          {/* add custom */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addCustom() }}
              placeholder="Add your own task…"
              style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, outline: 'none' }}
            />
            <button
              onClick={addCustom}
              disabled={!newLabel.trim()}
              style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: newLabel.trim() ? MC : C.surfaceHover, color: newLabel.trim() ? '#fff' : C.textFaint, cursor: newLabel.trim() ? 'pointer' : 'default', fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600 }}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
