/**
 * StatusInsights — the execution-focused view for the Application Status page:
 *  • Submission pipeline: where every application currently stands (a segmented
 *    bar across Prep → Submitted → Decisions).
 *  • What's left: undone tasks aggregated across all schools, so it reads as an
 *    actionable shared to-do list.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { C, MODULE_COLORS, EASE_OUT } from '../lib/designTokens'
import { SecLabel, Bar } from './moduleUI'
import type { ApplicationEntry, AppStatus } from '../data/applicationsChecklist'
import { remainingByLabel } from '../data/applicationTasks'

const MC = MODULE_COLORS.applications

const STAGE_DEFS: Array<{ key: string; label: string; color: string; statuses: AppStatus[] }> = [
  { key: 'prep', label: 'In progress', color: '#C47A12', statuses: ['not-started', 'in-progress'] },
  { key: 'submitted', label: 'Submitted', color: '#1D7FC4', statuses: ['submitted'] },
  { key: 'decision', label: 'Decisions', color: '#2D9E72', statuses: ['accepted', 'waitlisted', 'deferred', 'rejected'] },
  { key: 'withdrawn', label: 'Withdrawn', color: '#7A6D5C', statuses: ['withdrawn'] },
]

const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', boxShadow: C.shadow1 } as const

export default function StatusInsights({ apps }: { apps: ApplicationEntry[] }) {
  const [showAll, setShowAll] = useState(false)
  const stages = STAGE_DEFS.map((s) => ({ ...s, n: apps.filter((a) => s.statuses.includes(a.status)).length })).filter((s) => s.key !== 'withdrawn' || s.n > 0)
  const total = apps.length || 1

  const remaining = remainingByLabel(apps)
  const totalRemaining = remaining.reduce((a, r) => a + r.count, 0)
  const maxCount = Math.max(1, ...remaining.map((r) => r.count))
  const shown = showAll ? remaining : remaining.slice(0, 5)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 26 }}>
      {/* submission pipeline */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4, ease: EASE_OUT }} style={card}>
        <SecLabel style={{ marginBottom: 10 }}>Submission pipeline</SecLabel>
        <div style={{ display: 'flex', gap: 3, height: 14, borderRadius: 7, overflow: 'hidden', background: C.bg }}>
          {stages.map((s) => (s.n > 0 ? (
            <motion.div
              key={s.key}
              initial={{ width: 0 }} animate={{ width: `${(s.n / total) * 100}%` }} transition={{ duration: 0.7, ease: EASE_OUT }}
              title={`${s.label}: ${s.n}`}
              style={{ background: s.color, minWidth: 6 }}
            />
          ) : null))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 13, flexWrap: 'wrap' }}>
          {stages.map((s) => (
            <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.n > 0 ? s.color : C.borderStrong }} />
              <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5 }}>
                <b style={{ color: s.n > 0 ? s.color : C.textFaint }}>{s.n}</b> <span style={{ color: C.textMuted }}>{s.label}</span>
              </span>
            </span>
          ))}
        </div>
      </motion.div>

      {/* what's left */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.4, ease: EASE_OUT }} style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <SecLabel style={{ marginBottom: 0 }}>What&apos;s left</SecLabel>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted }}>{totalRemaining} {totalRemaining === 1 ? 'task' : 'tasks'}</span>
        </div>
        {remaining.length === 0 ? (
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: SUCCESS_TEXT, padding: '10px 0', fontWeight: 600 }}>🎉 Everything's checked off — nice work!</div>
        ) : (
          <>
            {shown.map((r) => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <span style={{ flex: 1, minWidth: 0, fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.label}>{r.label}</span>
                <div style={{ width: 64 }}><Bar value={r.count / maxCount} color={MC} height={5} /></div>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: C.textMuted, width: 14, textAlign: 'right' }}>{r.count}</span>
              </div>
            ))}
            {remaining.length > 5 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: MC }}
              >
                {showAll ? 'Show less' : `+${remaining.length - 5} more task type${remaining.length - 5 === 1 ? '' : 's'}`}
              </button>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}

const SUCCESS_TEXT = '#2D9E72'
