/**
 * SchoolApplicationPage — the full-page view of one application, opened from
 * the Application Status overview. Holds everything specific to that school:
 * status, category and deadline round (edited here since the College List tab
 * went away), deadline, net price, what the round commits you to, its task
 * checklist, and removing it from the list.
 *
 * Shared tasks (see SHARED_TASK_IDS) are checked and dated through
 * onToggleShared / onSetSharedDue, so a tick or a date here counts for every
 * school that needs the same task.
 *
 * Any task can carry the student's own due date: not the college's deadline,
 * which is derived and fixed, but the date they mean to have the essay drafted
 * or the recommendations asked for. Dated tasks show on the calendar.
 */

import { useEffect, useRef, useState } from 'react'
import { C, MODULE_COLORS } from '../lib/designTokens'
import { Bar, CollegeLogo, SecLabel } from './moduleUI'
import JourneyStepper from './JourneyStepper'
import { TASK_PHASES, tasksForEntry, isSharedTask, suggestedWaiverDue, applicationFeeFact, WAIVER_LEAD_DAYS } from '../data/applicationTasks'
import { DEADLINE_TYPE_LABEL, DEADLINE_TYPE_MEANING, daysLabel, urgencyColor, type DeadlineEvent } from '../data/applicationDeadlines'
import NetPriceFact from './NetPriceFact'
import { toIsoDay } from '../lib/personalDeadlines'
import {
  APP_STATUS_META,
  CATEGORY_META,
  DEADLINE_TYPES,
  type AppCategory,
  type AppDeadlineType,
  type AppStatus,
  type AppTask,
  type ApplicationEntry,
} from '../data/applicationsChecklist'
import type { SchoolDisplay } from '../lib/schoolDisplay'

const MC = MODULE_COLORS.applications
const font = "'Outfit',sans-serif"


/**
 * A task's own due date.
 *
 * While the box has focus it edits a local draft and never remounts, so typing
 * "11" into the month keeps focus through both digits. A plausible date saves
 * after a short pause (a picker choice is one change, so it saves promptly);
 * typing's in-between values — a half-typed year like 0002, or January on the
 * way to November — are superseded before they save. An empty box only clears
 * the date on blur, and only if it was really cleared: a native date input
 * reports '' for a half-edited value too, so leaving mid-retype (or the window
 * losing focus) reverts instead of erasing the date (for a shared task, on
 * every school). Leaving the box saves a complete date or reverts.
 *
 * Before there is a date, the control is a labelled button rather than the
 * input: an empty date input is a blank box that says nothing about what it
 * is for, so the feature went unfound.
 */
const DUE_SAVE_DELAY_MS = 600
const plausibleDay = (v: string) => {
  const year = Number(v.slice(0, 4))
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && year >= 2000 && year <= 2100
}

function TaskDueInput({ due, label, hint, suggested, onCommit }: {
  due?: string
  label: string
  hint: string
  /** A sensible date to open on, as `YYYY-MM-DD`. The student still has to
   *  save it — nothing is written until they do. */
  suggested?: string
  onCommit: (due: string | undefined) => void
}) {
  // null = not editing: show the saved value.
  const [draft, setDraft] = useState<string | null>(null)
  // Swapped in by the "Add date" button, so the input arrives focused.
  const [adding, setAdding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<string | null>(null) // plausible value waiting to save
  const latest = useRef({ due, onCommit })
  useEffect(() => { latest.current = { due, onCommit } })
  const flush = (v: string, clearAllowed: boolean) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    pending.current = null
    const { due: saved, onCommit: commit } = latest.current
    if (v === '') { if (clearAllowed && saved) commit(undefined) }
    else if (plausibleDay(v) && v !== saved) commit(v)
  }
  // Leaving the page mid-edit (no blur fires on unmount) still saves a
  // plausible date that was waiting out the pause.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
    const v = pending.current
    if (v && v !== latest.current.due) latest.current.onCommit(v)
  }, [])

  const value = draft ?? due ?? ''
  // Full size while being edited, even with every segment wiped, so the
  // student isn't retyping into a collapsed, invisible chip.
  const set = draft !== null || !!value
  if (!set && !adding) {
    return (
      <button
        type="button"
        onClick={() => { if (suggested) setDraft(suggested); setAdding(true) }}
        aria-label={`Add a due date for ${label}`}
        title={hint}
        style={{
          flexShrink: 0, padding: '3px 9px', borderRadius: 7,
          border: `1px dashed ${C.borderStrong}`, background: 'transparent',
          fontFamily: font, fontSize: 11.5, fontWeight: 600,
          color: C.textMuted, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = MC; e.currentTarget.style.color = MC }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.borderStrong; e.currentTarget.style.color = C.textMuted }}
      >
        + Add date
      </button>
    )
  }
  return (
    <input
      type="date"
      autoFocus={adding}
      value={value}
      onFocus={() => setDraft(due ?? '')}
      onChange={(e) => {
        const v = e.target.value
        setDraft(v)
        if (timer.current) clearTimeout(timer.current)
        pending.current = plausibleDay(v) ? v : null
        if (plausibleDay(v)) timer.current = setTimeout(() => flush(v, false), DUE_SAVE_DELAY_MS)
      }}
      onBlur={(e) => {
        // badInput: some segments filled, some not. That's not a clear.
        if (e.currentTarget.validity.badInput) flush('', false)
        else flush(draft ?? '', true)
        setDraft(null)
        setAdding(false)
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      aria-label={`Due date for ${label}`}
      title={hint}
      style={{
        flexShrink: 0, width: 132, padding: '3px 6px',
        border: `1px solid ${C.border}`,
        borderRadius: 7, background: C.white,
        fontFamily: font, fontSize: 11.5, color: C.text,
        cursor: 'pointer', outline: 'none',
      }}
    />
  )
}

export default function SchoolApplicationPage({
  app,
  display,
  deadline,
  daysLeft,
  sharedCounts,
  onBack,
  onStatus,
  onCategory,
  onDeadlineType,
  onRemove,
  onTasks,
  onToggleShared,
  onSetSharedDue,
}: {
  app: ApplicationEntry
  display: SchoolDisplay
  /** This school's upcoming application deadline, if it still has one. */
  deadline: DeadlineEvent | null
  daysLeft: number | null
  /** Shared task id → how many active schools need it. */
  sharedCounts: Map<string, number>
  onBack: () => void
  onStatus: (status: AppStatus) => void
  onCategory: (category: AppCategory) => void
  onDeadlineType: (type: AppDeadlineType) => void
  onRemove: () => void
  onTasks: (tasks: AppTask[]) => void
  onToggleShared: (taskId: string, done: boolean) => void
  onSetSharedDue: (taskId: string, due: string | undefined) => void
}) {
  const tasks = tasksForEntry(app)
  const [newLabel, setNewLabel] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const done = tasks.filter((t) => t.done).length
  const status = APP_STATUS_META[app.status]
  const cat = CATEGORY_META[app.category]
  const preSubmission = app.status === 'not-started' || app.status === 'in-progress'
  const urgent = preSubmission ? urgencyColor(daysLeft) : null
  // A month before this school's deadline, for the fee-waiver task. Null when
  // we hold no deadline to count back from.
  const waiverSuggestion = deadline ? toIsoDay(suggestedWaiverDue(deadline.date)) : undefined
  const fee = applicationFeeFact(app)

  const setDue = (task: AppTask, due: string | undefined) => {
    if (isSharedTask(task)) onSetSharedDue(task.id, due)
    else onTasks(tasks.map((t) => (t.id === task.id ? { ...t, due } : t)))
  }
  const toggle = (task: AppTask) => {
    if (isSharedTask(task)) onToggleShared(task.id, !task.done)
    else onTasks(tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)))
  }
  const remove = (id: string) => onTasks(tasks.filter((t) => t.id !== id))
  const addCustom = () => {
    const label = newLabel.trim()
    if (!label) return
    // Stable, collision-free id derived from existing custom tasks (no Date.now).
    const nums = tasks.filter((t) => /^c-\d+$/.test(t.id)).map((t) => parseInt(t.id.slice(2), 10))
    const id = `c-${(nums.length ? Math.max(...nums) : 0) + 1}`
    onTasks([...tasks, { id, label, done: false, phase: 'after', custom: true }])
    setNewLabel('')
  }

  return (
    <div style={{ padding: '20px 28px 32px', maxWidth: 820 }}>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font, fontSize: 13, fontWeight: 600, color: MC, marginBottom: 18 }}
      >
        ← All applications
      </button>

      {/* header — tinted with the school's reach / match / safety color */}
      <div style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${cat.color}17 0%, ${cat.color}05 55%, transparent 100%), var(--surface)`, border: `1px solid ${C.border}`, borderRadius: 16, padding: '22px 24px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ width: 58, height: 58, borderRadius: 14, background: C.white, border: `1px solid ${C.border}`, boxShadow: C.shadow1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CollegeLogo logoUrl={display.logoUrl} emoji={display.emoji} size={38} />
          </span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 28, fontWeight: 400, color: C.text, margin: 0, lineHeight: 1.15 }}>{display.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6, fontFamily: font, fontSize: 13, color: C.textMuted }}>
              <select
                value={app.category}
                onChange={(e) => onCategory(e.target.value as AppCategory)}
                aria-label="Reach, match or safety"
                style={{ fontFamily: font, fontSize: 11.5, fontWeight: 700, color: cat.color, background: `${cat.color}14`, border: `1px solid ${cat.color}30`, borderRadius: 99, padding: '2px 8px', cursor: 'pointer', outline: 'none' }}
              >
                {(Object.keys(CATEGORY_META) as AppCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
              </select>
              <select
                value={app.deadlineType}
                onChange={(e) => onDeadlineType(e.target.value as AppDeadlineType)}
                aria-label="Application round"
                style={{ fontFamily: font, fontSize: 11.5, fontWeight: 600, color: C.text, background: 'rgba(var(--line-rgb), 0.05)', border: `1px solid ${C.border}`, borderRadius: 99, padding: '2px 8px', cursor: 'pointer', outline: 'none' }}
              >
                {DEADLINE_TYPES.map((t) => <option key={t} value={t}>{DEADLINE_TYPE_LABEL[t]}</option>)}
              </select>
              {display.sub}
            </div>
          </div>
          <select
            value={app.status}
            onChange={(e) => onStatus(e.target.value as AppStatus)}
            aria-label="Application status"
            style={{ fontFamily: font, fontSize: 12.5, fontWeight: 600, color: status.color, background: `${status.color}14`, border: `1px solid ${status.color}33`, borderRadius: 99, padding: '7px 12px', cursor: 'pointer', outline: 'none' }}
          >
            {(Object.keys(APP_STATUS_META) as AppStatus[]).map((s) => <option key={s} value={s}>{APP_STATUS_META[s].label}</option>)}
          </select>
        </div>
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}` }}><JourneyStepper status={app.status} /></div>
      </div>

      {/* facts */}
      <div className="sap-facts" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginTop: 14, border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface }}>
        <div style={{ padding: '14px 18px', borderRight: `1px solid ${C.border}` }}>
          <SecLabel style={{ marginBottom: 6 }}>Deadline</SecLabel>
          {deadline && preSubmission ? (
            <>
              <div style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: C.text }}>
                {deadline.dateDisplay}
                {daysLeft != null && (
                  <span style={{ fontWeight: 500, color: urgent ?? C.textMuted }}> · {daysLeft < 0 ? 'passed' : daysLabel(daysLeft)}</span>
                )}
              </div>
              <div style={{ fontFamily: font, fontSize: 12, color: C.textMuted, marginTop: 3 }}>
                {daysLeft != null && daysLeft < 0 && <span style={{ color: '#B93A3A' }}>Check if the school still accepts applications, or switch rounds. </span>}
                {deadline.typeLabel}
                {deadline.estimateReason === 'no-source'
                  ? ' · typical date for this round, confirm on the school’s site'
                  : deadline.estimated ? ' · estimated' : ''}
              </div>
            </>
          ) : (
            <div style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: C.textMuted }}>
              {preSubmission ? `No fixed date (${app.deadlineType})` : status.label}
            </div>
          )}
        </div>
        <div style={{ padding: '14px 18px', borderRight: `1px solid ${C.border}` }}>
          <NetPriceFact key={app.collegeId} collegeId={app.collegeId} />
        </div>
        <div style={{ padding: '14px 18px', borderRight: `1px solid ${C.border}` }}>
          <SecLabel style={{ marginBottom: 6 }}>To apply</SecLabel>
          <div style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: C.text }}>
            {fee.amount}
          </div>
          <div style={{ fontFamily: font, fontSize: 12, color: C.textMuted, marginTop: 2 }}>{fee.note}</div>
        </div>
        <div style={{ padding: '14px 18px' }}>
          <SecLabel style={{ marginBottom: 6 }}>Tasks</SecLabel>
          <div style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: C.text }}>{done} of {tasks.length} done</div>
          <div style={{ marginTop: 8, maxWidth: 220 }}><Bar value={tasks.length ? done / tasks.length : 0} color={MC} height={5} /></div>
        </div>
      </div>
      <p style={{ fontFamily: font, fontSize: 12.5, color: C.textMuted, lineHeight: 1.55, margin: '10px 2px 0' }}>
        <b style={{ color: C.text, fontWeight: 600 }}>{app.deadlineType}:</b> {DEADLINE_TYPE_MEANING[app.deadlineType]}
      </p>

      {/* checklist — the three stages as one connected path */}
      <div className="sap-path" style={{ marginTop: 30 }}>
        {TASK_PHASES.map((phase) => {
          const items = tasks.filter((t) => t.phase === phase.id)
          if (items.length === 0) return null
          const phaseDone = items.filter((t) => t.done).length
          const allDone = phaseDone === items.length
          return (
            <div key={phase.id} className="sap-stage">
              <span style={{ position: 'absolute', left: -34, top: 0, width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: allDone ? MC : C.bg, border: allDone ? 'none' : `2px solid ${phaseDone ? MC : C.borderStrong}`, color: '#fff', fontSize: 11, fontWeight: 700 }}>
                {allDone ? '✓' : ''}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10, minHeight: 22 }}>
                <span style={{ fontFamily: "'Young Serif',serif", fontSize: 16, color: C.text }}>{phase.title}</span>
                <span style={{ fontFamily: font, fontSize: 12, color: allDone ? MC : C.textMuted, fontWeight: allDone ? 600 : 400 }}>{phaseDone} of {items.length}</span>
              </div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, overflow: 'hidden' }}>
                {items.map((task, i) => {
                  const shared = isSharedTask(task)
                  const n = sharedCounts.get(task.id) ?? 1
                  return (
                    <div
                      key={task.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i ? `1px solid ${C.border}` : 'none' }}
                    >
                      <button
                        onClick={() => toggle(task)}
                        aria-label={task.done ? 'Mark not done' : 'Mark done'}
                        style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 6, cursor: 'pointer', border: task.done ? 'none' : `2px solid ${C.borderStrong}`, background: task.done ? MC : 'transparent', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                      >
                        {task.done ? '✓' : ''}
                      </button>
                      <span style={{ flex: 1, fontFamily: font, fontSize: 13.5, color: task.done ? C.textMuted : C.text, textDecoration: task.done ? 'line-through' : 'none' }}>{task.label}</span>
                      {/* A button until they set one, so an undated checklist
                          stays a checklist rather than a wall of date pickers
                          — but still says a date can go here. */}
                      <TaskDueInput
                        due={task.due}
                        label={task.label}
                        hint={task.due ? 'Your date for this task' : shared && n > 1 ? 'Set your own date (for every school that needs this)' : 'Set your own date for this task'}
                        // The waiver is the one task whose date is not a
                        // preference: the counselor needs the lead time, so
                        // the box opens on a month before this school's
                        // deadline rather than on nothing.
                        suggested={task.id === 'waiver' ? waiverSuggestion : undefined}
                        onCommit={(due) => setDue(task, due)}
                      />
                      {task.id === 'waiver' && !task.done && (
                        <span
                          title={`Counselors confirm waiver eligibility for a whole cohort each autumn. ${WAIVER_LEAD_DAYS} days gives them room, and you room to chase it.`}
                          style={{ fontFamily: font, fontSize: 11, fontWeight: 600, color: C.textMuted, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap' }}
                        >
                          ask ~{WAIVER_LEAD_DAYS} days ahead
                        </span>
                      )}
                      {shared && n > 1 && (
                        <span title="Done once, counts for every school that needs it" style={{ fontFamily: font, fontSize: 11, fontWeight: 600, color: MC, background: `${MC}12`, borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                          Shared with {n - 1} other {n - 1 === 1 ? 'school' : 'schools'}
                        </span>
                      )}
                      {task.custom && (
                        <button
                          onClick={() => remove(task.id)}
                          aria-label="Remove task"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.textFaint, padding: 2, lineHeight: 1 }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#B93A3A' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.textFaint }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* add custom */}
      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addCustom() }}
          placeholder={`Add a task for ${display.name}…`}
          style={{ flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontFamily: font, fontSize: 13, color: C.text, outline: 'none' }}
        />
        <button
          onClick={addCustom}
          disabled={!newLabel.trim()}
          style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: newLabel.trim() ? MC : C.surfaceHover, color: newLabel.trim() ? '#fff' : C.textFaint, cursor: newLabel.trim() ? 'pointer' : 'default', fontFamily: font, fontSize: 13, fontWeight: 600 }}
        >
          Add
        </button>
      </div>

      {/* remove */}
      <div style={{ marginTop: 36, paddingTop: 16, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontFamily: font, fontSize: 13 }}>
        {confirmRemove ? (
          <>
            <span style={{ color: C.text }}>Remove {display.name} and its tasks from your list?</span>
            <button onClick={onRemove} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#B93A3A', color: '#fff', cursor: 'pointer', fontFamily: font, fontSize: 12.5, fontWeight: 600 }}>Remove</button>
            <button onClick={() => setConfirmRemove(false)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font, fontSize: 12.5, color: C.textMuted }}>Cancel</button>
          </>
        ) : (
          <button onClick={() => setConfirmRemove(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font, fontSize: 12.5, fontWeight: 600, color: '#B93A3A' }}>
            Remove from my list
          </button>
        )}
      </div>
    </div>
  )
}
