/**
 * ApplicationTasksTab — every college's application tasks, on one page.
 *
 * The companion to Application Status. That page answers "where do I stand";
 * this one answers "what do I actually do next", which used to live in a modal
 * showing one college at a time. A student could not see everything they owed
 * without opening and closing a dialog per school.
 *
 * Ordered by deadline, soonest first, because that is the order the work has
 * to happen in. A college with no date sorts last rather than being hidden —
 * most colleges outside the curated set have no deadline on file, and burying
 * them would hide most of the list.
 */

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { C, MODULE_COLORS, EASE_OUT } from '../lib/designTokens'
import { CollegeLogo, Tag } from './moduleUI'
import SchoolTaskList from './SchoolTaskList'
import Celebration from './Celebration'
import { getCollegeById } from '../data/collegeData'
import { logoUrlForDomain } from '../lib/collegeLogo'
import { deriveDeadlineEvents } from '../data/applicationDeadlines'
import { taskProgress } from '../data/applicationTasks'
import { APP_STATUS_META, CATEGORY_META } from '../data/applicationsChecklist'
import type { ApplicationEntry, AppTask } from '../data/applicationsChecklist'

const MC = MODULE_COLORS.applications

interface Props {
  apps: ApplicationEntry[]
  onUpdate: (collegeId: string, fields: Partial<ApplicationEntry>) => void
  gradeStartIdx: number | null | undefined
  /** Set when the student clicked a college on the status page; that section
   *  is scrolled to on arrival so the jump lands somewhere specific. */
  focusCollegeId?: string | null
  onAddColleges: () => void
}

export default function ApplicationTasksTab({
  apps, onUpdate, gradeStartIdx, focusCollegeId, onAddColleges,
}: Props) {
  const focusRef = useRef<HTMLDivElement>(null)
  // Finishing a school's checklist is the one moment in this module worth
  // marking. The modal did it; losing it with the modal would be a loss.
  const [celebrateKey, setCelebrateKey] = useState<number | null>(null)

  useEffect(() => {
    if (!focusCollegeId) return
    focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusCollegeId])

  if (apps.length === 0) {
    return (
      <div style={{ padding: '24px 28px', maxWidth: 760 }}>
        <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, color: C.text, margin: 0, marginBottom: 6 }}>Tasks</h2>
        <div style={{ marginTop: 24, textAlign: 'center', padding: '40px 20px', background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: C.textMuted }}>
            Each college gets its own checklist once it is on your list.
          </div>
          <button
            onClick={onAddColleges}
            style={{ marginTop: 16, padding: '9px 16px', borderRadius: 9, border: 'none', background: MC, color: '#fff', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600 }}
          >
            Add your first college
          </button>
        </div>
      </div>
    )
  }

  // Soonest deadline per college, so the page reads in the order the work is
  // due. Colleges we hold no date for keep their place at the end.
  const now = new Date()
  const events = deriveDeadlineEvents(apps, { gradeStartIdx, now })
  const dueByCollege = new Map<string, { days: number; label: string; estimated: boolean }>()
  for (const e of events) {
    if (!e.collegeId) continue
    const days = Math.ceil((e.date.getTime() - now.getTime()) / 86_400_000)
    const prev = dueByCollege.get(e.collegeId)
    if (prev == null || days < prev.days) {
      dueByCollege.set(e.collegeId, { days, label: e.dateDisplay, estimated: e.estimated })
    }
  }

  const ordered = [...apps].sort((a, b) => {
    const da = dueByCollege.get(a.collegeId)?.days ?? Number.POSITIVE_INFINITY
    const db = dueByCollege.get(b.collegeId)?.days ?? Number.POSITIVE_INFINITY
    return da - db
  })

  const totals = apps.reduce((acc, a) => {
    const p = taskProgress(a); acc.done += p.done; acc.total += p.total; return acc
  }, { done: 0, total: 0 })

  return (
    <div style={{ padding: '24px 28px', maxWidth: 860 }}>
      <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, color: C.text, margin: 0, marginBottom: 4 }}>Tasks</h2>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13.5, color: C.textMuted, margin: '0 0 22px' }}>
        {totals.done} of {totals.total} done across {apps.length} {apps.length === 1 ? 'college' : 'colleges'}, soonest deadline first.
      </p>

      {ordered.map((app, i) => {
        const info = getCollegeById(app.collegeId)
        const name = info?.name ?? app.name ?? 'College'
        const due = dueByCollege.get(app.collegeId)
        const meta = APP_STATUS_META[app.status]
        const catMeta = CATEGORY_META[app.category]
        const prog = taskProgress(app)
        const complete = prog.total > 0 && prog.done === prog.total
        const isFocus = app.collegeId === focusCollegeId

        return (
          <motion.div
            key={app.collegeId}
            ref={isFocus ? focusRef : undefined}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.35, ease: EASE_OUT }}
            style={{
              background: C.white,
              border: `1px solid ${isFocus ? MC : C.border}`,
              boxShadow: isFocus ? `0 0 0 1px ${MC}` : C.shadow1,
              borderRadius: 14,
              padding: '16px 18px',
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap', marginBottom: 10 }}>
              <CollegeLogo logoUrl={logoUrlForDomain(info?.domain ?? app.website)} emoji={info?.emoji ?? '🎓'} size={26} />
              <span style={{ fontFamily: "'Young Serif',serif", fontSize: 17, color: C.text, flex: 1, minWidth: 0 }}>{name}</span>
              {complete && <Tag label="All done" color={MC} />}
              <Tag label={catMeta.label} color={catMeta.color} />
              <Tag label={meta.label} color={meta.color} bg={meta.bg} />
            </div>

            {due && (
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: due.days <= 10 ? '#B93A3A' : C.textMuted, marginBottom: 10 }}>
                {due.days < 0
                  ? `Deadline passed — ${due.label}`
                  : `${due.days} ${due.days === 1 ? 'day' : 'days'} left · ${due.label}`}
                {due.estimated ? ' · est.' : ''}
              </div>
            )}

            <SchoolTaskList
              app={app}
              onChange={(tasks: AppTask[]) => {
                const wasComplete = prog.total > 0 && prog.done === prog.total
                const nowComplete = tasks.length > 0 && tasks.every((t) => t.done)
                if (nowComplete && !wasComplete) setCelebrateKey((k) => (k ?? 0) + 1)
                onUpdate(app.collegeId, { tasks })
              }}
            />
          </motion.div>
        )
      })}

      {celebrateKey != null && <Celebration key={celebrateKey} onDone={() => setCelebrateKey(null)} />}
    </div>
  )
}
