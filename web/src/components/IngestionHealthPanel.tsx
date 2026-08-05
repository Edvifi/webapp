import { useEffect, useState } from 'react'
import { C } from '../lib/designTokens'
import { getIngestHealth, getIngestRuns, type IngestHealth, type IngestRun } from '../lib/fafsaData'

// Admin-only health panel for the scholarship ingestion pipeline. Renders
// nothing for non-admins (the backing RPCs deny them, so health stays null).

const fmtDate = (iso: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const STATUS_COLOR: Record<string, string> = {
  success: 'var(--c-fresh)',
  running: '#B26A00',
  error: 'var(--c-danger)',
}

const Stat = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', minWidth: 120 }}>
    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint, marginBottom: 3 }}>{label}</div>
    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 600, color: color ?? C.text }}>{value}</div>
  </div>
)

export default function IngestionHealthPanel() {
  const [health, setHealth] = useState<IngestHealth | null>(null)
  const [runs, setRuns] = useState<IngestRun[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const h = await getIngestHealth()
      if (cancelled) return
      if (h) {
        const r = await getIngestRuns(10)
        if (cancelled) return
        setRuns(r)
      }
      setHealth(h)
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [])

  // Non-admins (or an error) get nothing.
  if (!loaded || !health) return null

  return (
    <div style={{ marginTop: 24, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>⚙️ Scholarship ingestion</span>
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 600, color: C.textFaint, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 99, padding: '2px 8px' }}>ADMIN</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: runs.length ? 14 : 0 }}>
        <Stat
          label="Last run"
          value={health.last_run_status ? `${health.last_run_status} · ${fmtDate(health.last_run_at)}` : 'never'}
          color={health.last_run_status ? STATUS_COLOR[health.last_run_status] : C.textMuted}
        />
        <Stat label="Last success" value={fmtDate(health.last_success_at)} />
        <Stat label="Published (ingested)" value={String(health.ingested_published)} />
        <Stat label="Archived" value={String(health.ingested_archived)} />
        <Stat label="Total runs" value={String(health.runs_total)} />
      </div>

      {runs.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Outfit',sans-serif", fontSize: 12 }}>
            <thead>
              <tr style={{ color: C.textFaint, textAlign: 'left' }}>
                {['Started', 'Status', 'Fetched', 'Ins', 'Upd', 'Arch', 'Skip'].map((h) => (
                  <th key={h} style={{ padding: '6px 8px', fontWeight: 500, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} style={{ color: C.text }}>
                  <td style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{fmtDate(r.started_at)}</td>
                  <td style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}`, color: STATUS_COLOR[r.status] ?? C.text, fontWeight: 600 }}>{r.status}</td>
                  <td style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}` }}>{r.fetched}</td>
                  <td style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}` }}>{r.inserted}</td>
                  <td style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}` }}>{r.updated}</td>
                  <td style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}` }}>{r.archived}</td>
                  <td style={{ padding: '6px 8px', borderBottom: `1px solid ${C.border}` }}>{r.skipped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
