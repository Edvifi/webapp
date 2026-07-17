/**
 * DeadlineTimeline — a horizontal "runway" of the student's application
 * deadlines: each school is a logo-pin placed on its date between now and the
 * last deadline, with month ticks and a "now" marker. Read-only visual.
 */

import { motion } from 'framer-motion'
import { C } from '../lib/designTokens'
import { CollegeLogo, SecLabel } from './moduleUI'

export interface DeadlinePin {
  key: string
  name: string
  logoUrl?: string | null
  emoji: string
  date: Date
  dateDisplay: string
  color: string
  estimated: boolean
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function DeadlineTimeline({ pins, now }: { pins: DeadlinePin[]; now: Date }) {
  if (pins.length === 0) return null

  const min = now.getTime()
  const maxPin = Math.max(...pins.map((p) => p.date.getTime()))
  const span = Math.max(maxPin - min, 1000 * 60 * 60 * 24 * 45) // at least ~6 weeks of runway
  const end = min + span * 1.08 // right padding so the last pin isn't flush to the edge
  const pos = (t: number) => Math.max(0, Math.min(100, ((t - min) / (end - min)) * 100))

  // Month ticks from the start of this month through the end.
  const ticks: Array<{ label: string; left: number }> = []
  const cur = new Date(now.getFullYear(), now.getMonth(), 1)
  while (cur.getTime() <= end) {
    if (cur.getTime() >= min - 1000 * 60 * 60 * 24 * 31) ticks.push({ label: MONTHS[cur.getMonth()], left: pos(Math.max(min, cur.getTime())) })
    cur.setMonth(cur.getMonth() + 1)
  }

  const sorted = [...pins].sort((a, b) => a.date.getTime() - b.date.getTime())

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 20px 12px', marginBottom: 26, boxShadow: C.shadow1 }}
    >
      <SecLabel style={{ marginBottom: 6 }}>Deadline runway</SecLabel>
      <div style={{ position: 'relative', height: 78 }}>
        {/* axis */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 52, height: 2, background: C.border, borderRadius: 2 }} />
        {/* month ticks */}
        {ticks.map((t, i) => (
          <div key={i} style={{ position: 'absolute', top: 46, left: `${t.left}%` }}>
            <div style={{ width: 1, height: 8, background: C.borderStrong, opacity: 0.5 }} />
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, color: C.textFaint, marginTop: 4, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>{t.label}</div>
          </div>
        ))}
        {/* now marker */}
        <div style={{ position: 'absolute', top: 40, left: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 9, fontWeight: 700, color: MODULE_ACCENT, letterSpacing: '0.04em' }}>NOW</div>
          <div style={{ width: 2, height: 14, background: MODULE_ACCENT, borderRadius: 2, marginTop: 1 }} />
        </div>
        {/* pins */}
        {sorted.map((p, i) => {
          const left = pos(p.date.getTime())
          return (
            <div key={p.key} title={`${p.name} — ${p.dateDisplay}${p.estimated ? ' (est.)' : ''}`}
              style={{ position: 'absolute', top: 0, left: `${left}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}
                style={{ width: 30, height: 30, borderRadius: 8, background: C.white, border: `2px solid ${p.color}`, boxShadow: C.shadow1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <CollegeLogo logoUrl={p.logoUrl} emoji={p.emoji} size={20} />
              </motion.div>
              <div style={{ width: 2, height: 22, background: p.color, opacity: 0.5 }} />
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

const MODULE_ACCENT = '#7048C8'
