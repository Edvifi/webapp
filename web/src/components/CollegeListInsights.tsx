/**
 * CollegeListInsights — a "your list at a glance" dashboard for the College List
 * tab. Fetches the saved schools' full DB rows, scores them through the match
 * engine (net price for the student's income, admission odds), and renders:
 *   • list-balance donut (reach / match / safety)
 *   • cost × selectivity portfolio map (scatter)
 *   • net price per school (bars)
 *   • admission odds per school (bars)
 */

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { C, EASE_OUT } from '../lib/designTokens'
import { SecLabel } from './moduleUI'
import { CATEGORY_META, type ApplicationEntry, type AppCategory } from '../data/applicationsChecklist'
import { fetchCollegesByScorecardIds } from '../lib/collegeSearch'
import { useCollegePrefs } from '../lib/useCollegePrefs'
import { scoreCollegeForProfile, type College, type CollegeMatch, type AdmissionBand } from '../lib/collegeMatch'

interface Scored {
  name: string
  category: AppCategory
  college: College
  match: CollegeMatch
}

const BAND_COLOR: Record<AdmissionBand, string> = {
  open: 'var(--c-fresh)', likely: 'var(--c-fresh)', target: 'var(--c-soph)', reach: 'var(--c-danger)', unknown: '#7A6D5C',
}
const BAND_LABEL: Record<AdmissionBand, string> = {
  open: 'Open', likely: 'Likely', target: 'Target', reach: 'Reach', unknown: 'Unknown',
}
const dollarsK = (cents: number) => `$${Math.round(cents / 100 / 1000)}k`
const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', boxShadow: C.shadow1 } as const
const scId = (id: string) => (id.startsWith('sc-') ? Number(id.slice(3)) : NaN)

export default function CollegeListInsights({ apps }: { apps: ApplicationEntry[] }) {
  const { studentProfile } = useCollegePrefs(true)

  const ids = useMemo(() => apps.map((a) => scId(a.collegeId)).filter((n) => Number.isFinite(n)), [apps])
  const idsKey = ids.join(',')
  const [colleges, setColleges] = useState<College[]>([])
  useEffect(() => {
    if (ids.length === 0) { setColleges([]); return }
    let cancelled = false
    fetchCollegesByScorecardIds(ids)
      .then((rows) => { if (!cancelled) setColleges(rows) })
      // Insight graphs are supplementary; on failure they stay empty rather
      // than taking the College List down with an unhandled rejection.
      .catch(() => { if (!cancelled) setColleges([]) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idsKey captures the id set
  }, [idsKey])

  const scored: Scored[] = useMemo(() => {
    const byId = new Map(colleges.map((c) => [c.scorecard_id, c]))
    return apps
      .map((app) => {
        const c = byId.get(scId(app.collegeId))
        if (!c) return null
        return { name: app.name ?? c.name, category: app.category, college: c, match: scoreCollegeForProfile(c, studentProfile, null) }
      })
      .filter((x): x is Scored => x != null)
  }, [apps, colleges, studentProfile])

  if (scored.length < 1) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <SecLabel style={{ marginBottom: 10 }}>Your list at a glance</SecLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, marginBottom: 12 }}>
        <BalanceDonut apps={apps} />
        <PortfolioMap scored={scored} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
        <NetPriceBars scored={scored} hasIncome={studentProfile.familyIncomeCents != null} />
        <OddsBars scored={scored} />
      </div>
    </div>
  )
}

/* ─── balance donut ─── */

function BalanceDonut({ apps }: { apps: ApplicationEntry[] }) {
  const cats: AppCategory[] = ['reach', 'match', 'safety', 'unranked']
  const counts = cats.map((cat) => ({ cat, n: apps.filter((a) => a.category === cat).length })).filter((x) => x.n > 0)
  const total = apps.length || 1
  const size = 108, stroke = 16, r = (size - stroke) / 2, circ = 2 * Math.PI * r
  let offset = 0
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }} style={card}>
      <SecLabel style={{ marginBottom: 10 }}>List balance</SecLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.bg} strokeWidth={stroke} />
            {counts.map(({ cat, n }) => {
              const len = (n / total) * circ
              const el = (
                <circle key={cat} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={CATEGORY_META[cat].color} strokeWidth={stroke}
                  strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
              )
              offset += len
              return el
            })}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Young Serif',serif", fontSize: 22, color: C.text }}>{apps.length}</span>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, color: C.textMuted }}>schools</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {cats.map((cat) => {
            const n = apps.filter((a) => a.category === cat).length
            return (
              <span key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: n > 0 ? C.text : C.textFaint }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: n > 0 ? CATEGORY_META[cat].color : C.borderStrong }} />
                <b>{n}</b> {CATEGORY_META[cat].label}
              </span>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

/* ─── cost × selectivity scatter ─── */

function PortfolioMap({ scored }: { scored: Scored[] }) {
  const W = 100, H = 100 // percentage viewBox
  const pts = scored
    .map((s) => {
      const admit = s.college.admit_rate // 0..1, null = open
      const rawNet = s.match.netPriceForYouCents ?? s.college.avg_net_price_cents
      if (rawNet == null) return null
      return { s, x: admit == null ? 1 : admit, net: Math.max(0, rawNet) }
    })
    .filter((p): p is { s: Scored; x: number; net: number } => p != null)
  const maxNet = Math.max(1, ...pts.map((p) => p.net))
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.35, ease: EASE_OUT }} style={card}>
      <SecLabel style={{ marginBottom: 6 }}>Cost × selectivity</SecLabel>
      {pts.length === 0 ? (
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted, padding: '18px 0' }}>Not enough cost/admission data yet.</div>
      ) : (
        <div style={{ position: 'relative', height: 150 }}>
          <div style={{ position: 'absolute', left: 26, right: 6, top: 6, bottom: 22, border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
              <line x1="50" y1="0" x2="50" y2={H} stroke={C.border} strokeWidth={0.4} strokeDasharray="2 2" />
              <line x1="0" y1="50" x2={W} y2="50" stroke={C.border} strokeWidth={0.4} strokeDasharray="2 2" />
            </svg>
            {pts.map((p, i) => (
              <div key={i} title={`${p.s.name} · ${p.x < 1 ? `${Math.round(p.x * 100)}% admit` : 'open'} · ${dollarsK(p.net)}/yr`}
                style={{ position: 'absolute', left: `${p.x * 100}%`, top: `${(1 - p.net / maxNet) * 100}%`, transform: 'translate(-50%,-50%)', width: 11, height: 11, borderRadius: '50%', background: CATEGORY_META[p.s.category].color, border: '2px solid #fff', boxShadow: C.shadow1 }} />
            ))}
          </div>
          {/* axis labels */}
          <div style={{ position: 'absolute', left: 26, right: 6, bottom: 4, display: 'flex', justifyContent: 'space-between', fontFamily: "'Outfit',sans-serif", fontSize: 9.5, color: C.textFaint }}>
            <span>More selective</span><span>Open</span>
          </div>
          <div style={{ position: 'absolute', left: 0, top: 6, bottom: 22, width: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', fontFamily: "'Outfit',sans-serif", fontSize: 9.5, color: C.textFaint }}>
            <span>{dollarsK(maxNet)}</span><span>$0</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

/* ─── net price bars ─── */

function NetPriceBars({ scored, hasIncome }: { scored: Scored[]; hasIncome: boolean }) {
  const rows = scored
    .map((s) => {
      const raw = s.match.netPriceForYouCents ?? s.college.avg_net_price_cents
      return { s, net: raw == null ? null : Math.max(0, raw) } // aid can exceed cost → floor at $0
    })
    .filter((r): r is { s: Scored; net: number } => r.net != null)
    .sort((a, b) => a.net - b.net)
  const maxNet = Math.max(1, ...rows.map((r) => r.net))
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.35, ease: EASE_OUT }} style={card}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <SecLabel style={{ marginBottom: 0 }}>Net price for you</SecLabel>
        {!hasIncome && <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint }}>avg (add income to personalize)</span>}
      </div>
      {rows.length === 0 ? (
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted, padding: '14px 0' }}>No cost data yet.</div>
      ) : rows.slice(0, 6).map(({ s, net }) => (
        <div key={s.college.scorecard_id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7 }}>
          <span style={{ flex: 1, minWidth: 0, fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.name}>{s.name}</span>
          <div style={{ width: 110, height: 8, borderRadius: 5, background: C.bg, overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${(net / maxNet) * 100}%` }} transition={{ duration: 0.7, ease: EASE_OUT }} style={{ height: '100%', borderRadius: 5, background: CATEGORY_META[s.category].color }} />
          </div>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: C.textMuted, width: 42, textAlign: 'right' }}>{dollarsK(net)}</span>
        </div>
      ))}
    </motion.div>
  )
}

/* ─── admission odds bars ─── */

function OddsBars({ scored }: { scored: Scored[] }) {
  // estAdmitPct is the personalized chance (0–100) from the match engine — the
  // same number the Discover cards show. Open admission = null band 'open'.
  const oddsKey = (s: Scored) => (s.match.band === 'open' ? 100 : s.match.estAdmitPct ?? -1)
  const rows = [...scored].sort((a, b) => oddsKey(b) - oddsKey(a))
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.35, ease: EASE_OUT }} style={card}>
      <SecLabel style={{ marginBottom: 6 }}>Your admission odds</SecLabel>
      {rows.slice(0, 6).map((s) => {
        const pct = s.match.estAdmitPct // 0–100 or null
        const band = s.match.band
        const fill = pct != null ? pct / 100 : band === 'open' ? 1 : 0.5
        return (
          <div key={s.college.scorecard_id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7 }}>
            <span style={{ flex: 1, minWidth: 0, fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.name}>{s.name}</span>
            <div style={{ width: 90, height: 8, borderRadius: 5, background: C.bg, overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(0.04, fill) * 100}%` }} transition={{ duration: 0.7, ease: EASE_OUT }} style={{ height: '100%', borderRadius: 5, background: BAND_COLOR[band] }} />
            </div>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: BAND_COLOR[band], width: 62, textAlign: 'right' }}>
              {pct != null ? `~${Math.round(pct)}%` : BAND_LABEL[band]}
            </span>
          </div>
        )
      })}
    </motion.div>
  )
}
