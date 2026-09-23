/**
 * ApplicationStatusTab — the Application Status overview.
 *
 * Deliberately light: a status strip, the season's deadlines on one
 * timeline, the tasks shared across the whole list (checked once for every
 * school), and one row per school sorted by deadline. Per-school detail lives
 * on SchoolApplicationPage, opened by clicking a row or a timeline marker.
 */

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { C, MODULE_COLORS, EASE_OUT } from '../lib/designTokens'
import { Bar, CollegeLogo, SecLabel } from './moduleUI'
import Celebration from './Celebration'
import DeadlineTimeline, { type TimelineItem } from './DeadlineTimeline'
import SchoolApplicationPage, { type SchoolDisplay } from './SchoolApplicationPage'
import { deriveDeadlineEvents, nextDueForModule, roughDuration, urgencyColor, type DeadlineEvent } from '../data/applicationDeadlines'
import { sharedTaskSummary, taskProgress, type SharedTaskSummary } from '../data/applicationTasks'
import { getCollegeById } from '../data/collegeData'
import { logoUrlForDomain } from '../lib/collegeLogo'
import {
  APP_STATUS_META,
  CATEGORY_META,
  type AppStatus,
  type AppTask,
  type ApplicationEntry,
} from '../data/applicationsChecklist'

const MC = MODULE_COLORS.applications
const font = "'Outfit',sans-serif"

type SortKey = 'deadline' | 'status' | 'name'
const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'deadline', label: 'Deadline' },
  { key: 'status', label: 'Status' },
  { key: 'name', label: 'Name' },
]
// Order schools appear in when sorted by status: most work left first.
const STATUS_ORDER: AppStatus[] = ['in-progress', 'not-started', 'submitted', 'deferred', 'waitlisted', 'accepted', 'rejected', 'withdrawn']

/** Where each application stands, for the status strip under the headline. */
type StageKey = 'todo' | 'submitted' | 'accepted' | 'waiting' | 'rejected' | 'withdrawn'
const STAGES: Array<{ key: StageKey; label: string; color: string; statuses: AppStatus[] }> = [
  { key: 'todo', label: 'to submit', color: '#C47A12', statuses: ['not-started', 'in-progress'] },
  { key: 'submitted', label: 'submitted', color: '#1D7FC4', statuses: ['submitted'] },
  { key: 'accepted', label: 'accepted', color: '#2D9E72', statuses: ['accepted'] },
  { key: 'waiting', label: 'waitlisted or deferred', color: '#7048C8', statuses: ['waitlisted', 'deferred'] },
  { key: 'rejected', label: 'not admitted', color: '#B93A3A', statuses: ['rejected'] },
  { key: 'withdrawn', label: 'withdrawn', color: '#7A6D5C', statuses: ['withdrawn'] },
]

const MS_PER_DAY = 86400000
const daysUntil = (d: Date, now: Date) => Math.ceil((d.getTime() - now.getTime()) / MS_PER_DAY)

const displayFor = (app: ApplicationEntry): SchoolDisplay => {
  const info = getCollegeById(app.collegeId)
  return {
    name: info?.name ?? app.name ?? 'College',
    emoji: info?.emoji ?? '🎓',
    logoUrl: logoUrlForDomain(info?.domain ?? app.website),
    sub: [app.city && app.state ? `${app.city}, ${app.state}` : app.state ?? info?.state, app.deadlineType].filter(Boolean).join(' · '),
  }
}

/** Overlapping logos of the schools a shared task covers (first few, then +N). */
const LogoStack = ({ apps, max = 5 }: { apps: ApplicationEntry[]; max?: number }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
    {apps.slice(0, max).map((a, i) => {
      const d = displayFor(a)
      return (
        <span key={a.collegeId} title={d.name} style={{ width: 22, height: 22, marginLeft: i ? -6 : 0, borderRadius: '50%', background: C.white, boxShadow: '0 0 0 2px var(--surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', zIndex: max - i }}>
          <CollegeLogo logoUrl={d.logoUrl} emoji={d.emoji} size={14} />
        </span>
      )
    })}
    {apps.length > max && <span style={{ marginLeft: 6, fontFamily: font, fontSize: 11, fontWeight: 600, color: C.textMuted }}>+{apps.length - max}</span>}
  </span>
)

const SharedTaskCard = ({ task, apps, onToggle }: { task: SharedTaskSummary; apps: ApplicationEntry[]; onToggle: () => void }) => {
  const all = task.done === task.total
  const partial = task.done > 0 && !all
  const covered = task.collegeIds.map((id) => apps.find((a) => a.collegeId === id)).filter((a): a is ApplicationEntry => !!a)
  return (
    <button
      onClick={onToggle}
      aria-pressed={all}
      className="ast-card"
      style={{ display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'space-between', padding: '14px 15px', background: all ? `${MC}0F` : C.surface, border: `1px solid ${all ? `${MC}40` : C.border}`, borderRadius: 12, cursor: 'pointer', textAlign: 'left' }}
    >
      <span style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ width: 20, height: 20, flexShrink: 0, marginTop: 1, borderRadius: 6, border: all ? 'none' : `2px solid ${partial ? MC : C.borderStrong}`, background: all ? MC : 'transparent', color: all ? '#fff' : MC, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
          {all ? '✓' : partial ? '–' : ''}
        </span>
        <span style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, lineHeight: 1.35, color: all ? C.textMuted : C.text }}>{task.label}</span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <LogoStack apps={covered} />
        <span style={{ fontFamily: font, fontSize: 11.5, fontWeight: all ? 600 : 500, color: all ? MC : C.textMuted, whiteSpace: 'nowrap' }}>
          {all ? (task.total === 1 ? 'Done' : `Done for all ${task.total}`) : partial ? `${task.done} of ${task.total} done` : `${task.total} ${task.total === 1 ? 'school' : 'schools'}`}
        </span>
      </span>
    </button>
  )
}

/** Stacked month / day block for a school row; tinted when the date is close. */
const DateBlock = ({ date, urgent }: { date: Date | null; urgent: string | null }) => (
  <span style={{ width: 44, height: 46, borderRadius: 9, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: urgent ? `${urgent}14` : 'rgba(var(--line-rgb), 0.05)', border: date ? `1px solid ${urgent ? `${urgent}38` : C.border}` : `1px dashed ${C.borderStrong}`, flexShrink: 0 }}>
    {date ? (
      <>
        <span style={{ fontFamily: font, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: urgent ?? C.textMuted, lineHeight: 1 }}>{date.toLocaleString('en-US', { month: 'short' })}</span>
        <span style={{ fontFamily: "'Young Serif',serif", fontSize: 18, color: urgent ?? C.text, lineHeight: 1.1, marginTop: 2 }}>{date.getDate()}</span>
      </>
    ) : <span style={{ fontFamily: font, fontSize: 14, color: C.textFaint }}>—</span>}
  </span>
)

const isComplete = (app: ApplicationEntry) => {
  const p = taskProgress(app)
  return p.total > 0 && p.done === p.total
}

export default function ApplicationStatusTab({
  apps,
  onUpdate,
  onSetShared,
  gradeStartIdx,
}: {
  apps: ApplicationEntry[]
  onUpdate: (collegeId: string, fields: Partial<ApplicationEntry>) => void
  /** Check or uncheck a shared task on every school; returns the updated list. */
  onSetShared: (taskId: string, done: boolean) => ApplicationEntry[]
  /** `profiles.grade_start_idx` — picks which application cycle to date. */
  gradeStartIdx: number | null | undefined
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('deadline')
  const [filter, setFilter] = useState<StageKey | null>(null)
  const [celebrateKey, setCelebrateKey] = useState<number | null>(null)
  // Confetti, fired at the action site (status change / a school's last task checked).
  const celebrate = () => setCelebrateKey((k) => (k ?? 0) + 1)
  // Moving between the overview and a school page starts at the top, not
  // wherever the previous view was scrolled to.
  const topRef = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    topRef.current?.scrollIntoView({ block: 'start' })
  }, [openId])

  if (apps.length === 0) {
    return (
      <div style={{ padding: '24px 28px', maxWidth: 760 }}>
        <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 30, fontWeight: 400, color: C.text, margin: 0, lineHeight: 1.2 }}>Your applications</h2>
        <div style={{ marginTop: 24, textAlign: 'center', padding: '40px 20px', background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 12 }}>
          <div style={{ fontFamily: font, fontSize: 14, color: C.textMuted }}>Add colleges to your list first. They'll appear here once you do.</div>
        </div>
      </div>
    )
  }

  const now = new Date()
  const events = deriveDeadlineEvents(apps, { gradeStartIdx, now })
  const deadlineFor = new Map<string, DeadlineEvent>()
  for (const e of events) {
    if (e.collegeId && e.module === 'Application Tracking' && daysUntil(e.date, now) >= 0 && !deadlineFor.has(e.collegeId)) {
      deadlineFor.set(e.collegeId, e)
    }
  }
  const preSubmission = (a: ApplicationEntry) => a.status === 'not-started' || a.status === 'in-progress'
  const daysFor = (a: ApplicationEntry): number | null => {
    const e = preSubmission(a) ? deadlineFor.get(a.collegeId) : undefined
    return e ? daysUntil(e.date, now) : null
  }

  const shared = sharedTaskSummary(apps)
  const sharedCounts = new Map(shared.map((s) => [s.id, s.total]))

  // Toggling a shared task can finish several schools at once; celebrate if any.
  const setShared = (taskId: string, done: boolean) => {
    const before = new Set(apps.filter(isComplete).map((a) => a.collegeId))
    const after = onSetShared(taskId, done)
    if (after.some((a) => isComplete(a) && !before.has(a.collegeId))) celebrate()
  }
  const setStatus = (app: ApplicationEntry, s: AppStatus) => {
    if ((s === 'submitted' || s === 'accepted') && app.status !== s) celebrate()
    onUpdate(app.collegeId, { status: s })
  }
  const setTasks = (app: ApplicationEntry, tasks: AppTask[]) => {
    if (tasks.length > 0 && tasks.every((t) => t.done) && !isComplete(app)) celebrate()
    onUpdate(app.collegeId, { tasks })
  }

  const confetti = celebrateKey != null && <Celebration key={celebrateKey} onDone={() => setCelebrateKey(null)} />

  const openApp = apps.find((a) => a.collegeId === openId) ?? null
  if (openApp) {
    return (
      <div ref={topRef}>
        <SchoolApplicationPage
          app={openApp}
          display={displayFor(openApp)}
          deadline={deadlineFor.get(openApp.collegeId) ?? null}
          daysLeft={daysFor(openApp)}
          sharedCounts={sharedCounts}
          onBack={() => setOpenId(null)}
          onStatus={(s) => setStatus(openApp, s)}
          onTasks={(tasks) => setTasks(openApp, tasks)}
          onToggleShared={setShared}
        />
        {confetti}
      </div>
    )
  }

  const next = nextDueForModule(events, 'Application Tracking', now)
  const nextApp = next ? apps.find((a) => a.collegeId === next.collegeId && preSubmission(a)) : undefined
  const nextDays = next && nextApp ? daysUntil(next.date, now) : null
  const nextUrgent = urgencyColor(nextDays)

  const stages = STAGES.map((st) => ({ ...st, n: apps.filter((a) => st.statuses.includes(a.status)).length })).filter((st) => st.n > 0)
  const activeFilter = stages.find((st) => st.key === filter) ?? null

  const timeline: TimelineItem[] = apps.flatMap((a) => {
    const e = preSubmission(a) ? deadlineFor.get(a.collegeId) : undefined
    if (!e) return []
    const d = displayFor(a)
    return [{ id: a.collegeId, name: d.name, logoUrl: d.logoUrl, emoji: d.emoji, date: e.date, dateDisplay: e.dateDisplay, typeLabel: e.typeLabel, days: daysUntil(e.date, now), guessed: e.estimateReason === 'no-source' }]
  })

  const sorted = apps.filter((a) => !activeFilter || activeFilter.statuses.includes(a.status)).sort((a, b) => {
    const name = displayFor(a).name.localeCompare(displayFor(b).name)
    const status = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
    if (sort === 'name') return name
    if (sort === 'status') return status || name
    // Deadline: schools with a date coming up first, soonest first; the rest by status.
    const da = daysFor(a), db = daysFor(b)
    if (da != null && db != null) return da - db || name
    if (da != null) return -1
    if (db != null) return 1
    return status || name
  })

  return (
    <motion.div ref={topRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, ease: EASE_OUT }} style={{ padding: '24px 28px 32px', maxWidth: 900 }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 30, fontWeight: 400, color: C.text, margin: 0, lineHeight: 1.2 }}>
            Your applications
          </h2>
          {/* status strip — each count filters the school list below */}
          {stages.length > 0 && (
            <div role="group" aria-label="Filter schools by status" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10, marginLeft: -8 }}>
              {stages.map((st) => {
                const on = filter === st.key
                return (
                  <button
                    key={st.key}
                    onClick={() => setFilter(on ? null : st.key)}
                    aria-pressed={on}
                    className="ast-chip"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 99, border: `1px solid ${on ? `${st.color}40` : 'transparent'}`, background: on ? `${st.color}14` : undefined, cursor: 'pointer', fontFamily: font, fontSize: 12.5, color: on ? st.color : C.textMuted }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.color }} />
                    <b style={{ fontWeight: 700, color: st.color }}>{st.n}</b> {st.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {next && nextApp && nextDays != null && (
          <button
            onClick={() => setOpenId(nextApp.collegeId)}
            className="ast-card"
            aria-label={`Next up: ${next.collegeName}, ${next.typeLabel}, ${next.dateDisplay}`}
            style={{ flex: '0 1 280px', minWidth: 230, display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', background: nextUrgent ? `${nextUrgent}0D` : C.surface, border: `1px solid ${nextUrgent ? `${nextUrgent}40` : C.border}`, borderRadius: 12, cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <SecLabel style={{ marginBottom: 0 }}>Next up</SecLabel>
              <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: nextUrgent ?? C.textMuted, whiteSpace: 'nowrap' }}>
                {nextDays === 0 ? 'Today' : nextDays === 1 ? 'Tomorrow' : roughDuration(nextDays, { approx: false })}
              </span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <CollegeLogo logoUrl={displayFor(nextApp).logoUrl} emoji={displayFor(nextApp).emoji} size={28} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: font, fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{next.collegeName}</span>
                <span style={{ display: 'block', fontFamily: font, fontSize: 12, color: C.textMuted, marginTop: 1 }}>{next.typeLabel} · {next.dateDisplay}</span>
              </span>
            </span>
          </button>
        )}
      </header>

      {timeline.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <DeadlineTimeline items={timeline} now={now} onSelect={setOpenId} />
        </section>
      )}

      {/* shared tasks */}
      {shared.length > 0 && (
        <section style={{ marginTop: 30 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
            <SecLabel style={{ marginBottom: 0 }}>Shared across your list</SecLabel>
            <span style={{ fontFamily: font, fontSize: 12, color: C.textMuted }}>Do these once and they count for every school</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {shared.map((t) => (
              <SharedTaskCard key={t.id} task={t} apps={apps} onToggle={() => setShared(t.id, t.done !== t.total)} />
            ))}
          </div>
        </section>
      )}

      {/* schools */}
      <section style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10 }}>
            <SecLabel style={{ marginBottom: 0 }}>{activeFilter ? `Your schools · ${activeFilter.label}` : 'Your schools'}</SecLabel>
            {activeFilter && (
              <button onClick={() => setFilter(null)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font, fontSize: 12, fontWeight: 600, color: MC }}>Show all</button>
            )}
          </span>
          <div role="group" aria-label="Sort schools" style={{ display: 'flex', gap: 4, alignItems: 'baseline', fontFamily: font, fontSize: 12, color: C.textMuted }}>
            Sort by
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                aria-pressed={sort === s.key}
                style={{ background: 'none', border: 'none', padding: '0 4px', cursor: 'pointer', fontFamily: font, fontSize: 12, fontWeight: sort === s.key ? 700 : 500, color: sort === s.key ? MC : C.textMuted }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, overflow: 'hidden' }}>
          {sorted.map((app, i) => {
            const d = displayFor(app)
            const status = APP_STATUS_META[app.status]
            const cat = CATEGORY_META[app.category]
            const prog = taskProgress(app)
            const complete = prog.total > 0 && prog.done === prog.total
            const days = daysFor(app)
            const deadline = preSubmission(app) ? deadlineFor.get(app.collegeId) : undefined
            const urgent = urgencyColor(days)
            return (
              <button
                key={app.collegeId}
                onClick={() => setOpenId(app.collegeId)}
                className="ast-grid ast-row"
                style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderTop: i ? `1px solid ${C.border}` : 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <DateBlock date={deadline?.date ?? null} urgent={urgent} />
                <CollegeLogo logoUrl={d.logoUrl} emoji={d.emoji} size={28} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: font, fontSize: 14.5, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                  <span style={{ display: 'block', fontFamily: font, fontSize: 12, color: C.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span style={{ color: cat.color, fontWeight: 600 }}>{cat.label}</span> · {app.deadlineType}
                    {days != null && <span style={{ color: urgent ?? C.textMuted, fontWeight: urgent ? 600 : 400 }}> · {days === 0 ? 'due today' : `${roughDuration(days)} left`}</span>}
                  </span>
                </span>
                <span className="ast-tasks" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <Bar value={prog.total ? prog.done / prog.total : 0} color={complete ? '#2D9E72' : MC} height={5} />
                  <span style={{ fontFamily: font, fontSize: 11, color: complete ? '#2D9E72' : C.textMuted, fontWeight: complete ? 600 : 400 }}>{complete ? 'All tasks done' : `${prog.done} of ${prog.total} tasks`}</span>
                </span>
                <span style={{ justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: font, fontSize: 11.5, fontWeight: 600, color: status.color, background: `${status.color}14`, border: `1px solid ${status.color}2E`, borderRadius: 99, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.color, flexShrink: 0 }} />
                  {status.label}
                </span>
                <span aria-hidden style={{ color: C.textFaint, fontSize: 18, lineHeight: 1 }}>›</span>
              </button>
            )
          })}
        </div>
      </section>

      {confetti}
    </motion.div>
  )
}
