/**
 * JourneyStepper — a compact 3-stage path for one application:
 * Prep → Submitted → Decision. The current stage is highlighted; earlier
 * stages read as complete.
 */

import type { AppStatus } from '../data/applicationsChecklist'
import { C } from '../lib/designTokens'

const STAGES = ['Prep', 'Submitted', 'Decision'] as const

/** Map a status to its stage index (0-based). */
function stageOf(status: AppStatus): number {
  if (['accepted', 'waitlisted', 'deferred', 'rejected', 'withdrawn'].includes(status)) return 2
  if (status === 'submitted') return 1
  return 0
}

const ACCENT = 'var(--c-jun)'
/** Channel twin of ACCENT — a var() cannot take a concatenated hex alpha. */
const ACCENT_RGB = 'var(--c-jun-rgb)'

export default function JourneyStepper({ status }: { status: AppStatus }) {
  const current = stageOf(status)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {STAGES.map((label, i) => {
        const done = i < current
        const active = i === current
        const on = done || active
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: active ? 9 : 7, height: active ? 9 : 7, borderRadius: '50%', flexShrink: 0,
                background: on ? ACCENT : 'transparent',
                border: on ? 'none' : `1.5px solid ${C.borderStrong}`,
                boxShadow: active ? `0 0 0 3px rgba(${ACCENT_RGB}, 0.13)` : 'none',
              }} />
              <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10.5, fontWeight: active ? 700 : 500, color: on ? (active ? ACCENT : C.textMuted) : C.textFaint }}>{label}</span>
            </div>
            {i < STAGES.length - 1 && (
              <span style={{ width: 22, height: 2, borderRadius: 2, margin: '0 8px', background: i < current ? ACCENT : C.border }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
