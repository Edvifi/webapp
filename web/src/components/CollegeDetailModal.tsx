/**
 * CollegeDetailModal — full school detail for a Discover card. Shows the match
 * reasons + everything we store (cost/aid, admissions, outcomes, top programs)
 * plus student-body data fetched live from College Scorecard (diversity,
 * retention, women, first-gen).
 */

import { useEffect, useState } from 'react'
import { C } from '../lib/designTokens'
import { CollegeLogo } from './moduleUI'
import { domainOf, logoUrlForDomain } from '../lib/collegeLogo'
import { BAND_META, formatNetPrice, type College, type CollegeMatch, type AdmissionBand } from '../lib/collegeMatch'
import { fetchSchoolDetail, getCachedDetail, type SchoolDetail } from '../lib/scorecard'

const ACCENT = '#7048C8'
const bandColor = (b: AdmissionBand) => (b === 'reach' ? '#C47A12' : b === 'target' ? '#1D7FC4' : '#2D9E72')
const pct = (x: number | null | undefined) => (x == null ? null : `${Math.round(x * 100)}%`)
const dollars = (cents: number | null | undefined) => (cents == null ? null : `$${Math.round(cents / 100).toLocaleString()}`)
const prettyField = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
const typeWord = (c: College) => (c.institution_type === '2yr' ? 'Community college' : c.institution_type === 'trade' ? 'Trade / career' : '4-year')

function satRange(c: College): string | null {
  const lo = (c.sat_reading_25 ?? 0) + (c.sat_math_25 ?? 0)
  const hi = (c.sat_reading_75 ?? 0) + (c.sat_math_75 ?? 0)
  return lo > 0 && hi > 0 ? `${lo}–${hi}` : null
}

export default function CollegeDetailModal({
  college, match, added, onAdd, onClose,
}: {
  college: College
  match: CollegeMatch
  added: boolean
  onAdd: (college: College, band: AdmissionBand) => void
  onClose: () => void
}) {
  // Seed from the session cache so a re-open shows instantly (no spinner).
  const cached = getCachedDetail(college.scorecard_id)
  const [detail, setDetail] = useState<SchoolDetail | null>(cached ?? null)
  const [loadingDetail, setLoadingDetail] = useState(cached === undefined)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (getCachedDetail(college.scorecard_id) !== undefined) return
    let cancelled = false
    fetchSchoolDetail(college.scorecard_id).then((d) => { if (!cancelled) { setDetail(d); setLoadingDetail(false) } })
    return () => { cancelled = true }
  }, [college.scorecard_id])

  const facts: Array<{ label: string; value: string }> = []
  const openAdm = college.admit_rate == null && (college.institution_type === '2yr' || college.institution_type === 'trade')
  facts.push({ label: 'Acceptance rate', value: openAdm ? 'Open admission' : pct(college.admit_rate) ?? '—' })
  const sat = satRange(college); if (sat) facts.push({ label: 'SAT range (25–75)', value: sat })
  if (college.act_25 && college.act_75) facts.push({ label: 'ACT range (25–75)', value: `${college.act_25}–${college.act_75}` })
  if (college.size != null) facts.push({ label: 'Undergrad size', value: college.size.toLocaleString() })
  if (college.grad_rate != null) facts.push({ label: 'Graduation rate', value: pct(college.grad_rate)! })
  if (college.institution_type === '2yr' && college.transfer_rate != null) facts.push({ label: 'Transfer-on rate', value: pct(college.transfer_rate)! })
  if (college.pell_pct != null) facts.push({ label: 'Pell (low-income)', value: pct(college.pell_pct)! })
  if (college.median_earnings_10yr_cents != null) facts.push({ label: 'Median earnings (10y)', value: `$${Math.round(college.median_earnings_10yr_cents / 100 / 1000)}k` })
  if (college.cost_of_attendance_cents != null) facts.push({ label: 'Cost of attendance', value: `${dollars(college.cost_of_attendance_cents)}/yr` })

  const programs = college.programs && typeof college.programs === 'object'
    ? Object.entries(college.programs as Record<string, number>).filter(([, v]) => typeof v === 'number' && v > 0).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : []

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(28,18,7,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div role="dialog" aria-modal="true" aria-label={college.name} onClick={(e) => e.stopPropagation()} style={{ width: 'min(600px, 100%)', maxHeight: '88vh', overflowY: 'auto', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: C.shadow3 }}>
        {/* header */}
        <div style={{ position: 'sticky', top: 0, background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '18px 20px', borderRadius: '16px 16px 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <CollegeLogo logoUrl={logoUrlForDomain(domainOf(college.url))} emoji="🎓" size={38} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Young Serif',serif", fontSize: 20, color: C.text, lineHeight: 1.2 }}>{college.name}</div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted, marginTop: 3 }}>
                  {typeWord(college)}{college.city ? ` · ${[college.city, college.state].filter(Boolean).join(', ')}` : ''}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'Young Serif',serif", fontSize: 22, color: ACCENT, lineHeight: 1 }}>{match.fitScore}%</div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>match</div>
              </div>
              <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: C.textFaint, padding: 2, lineHeight: 1 }}>✕</button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: bandColor(match.band), background: `${bandColor(match.band)}14`, border: `1px solid ${bandColor(match.band)}`, borderRadius: 999, padding: '3px 10px' }}>
              {BAND_META[match.band].label}{match.estAdmitPct != null ? ` · ~${match.estAdmitPct}%` : ''}
            </span>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: match.netPriceForYouCents != null && match.netPriceForYouCents <= 0 ? '#2D9E72' : C.text }}>{formatNetPrice(match.netPriceForYouCents)}</span>
          </div>
        </div>

        <div style={{ padding: '16px 20px 20px' }}>
          {/* why it fits */}
          {match.reasons.length > 0 && (
            <Section title="Why it's a match">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {match.reasons.map((r, i) => <Chip key={i} text={r} />)}
              </div>
            </Section>
          )}

          {/* key facts */}
          <Section title="Key facts">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
              {facts.map((f) => (
                <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted }}>{f.label}</span>
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, fontWeight: 600, color: C.text }}>{f.value}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* student body (live) */}
          <Section title="Student body">
            {loadingDetail ? (
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted }}>Loading…</div>
            ) : detail == null ? (
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textFaint }}>Not available.</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 10 }}>
                  {detail.women != null && <MiniStat label="Women" value={pct(detail.women)!} />}
                  {detail.retention != null && <MiniStat label="Retention" value={pct(detail.retention)!} />}
                  {detail.firstGen != null && <MiniStat label="First-gen" value={pct(detail.firstGen)!} />}
                </div>
                {detail.diversity.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.textFaint, marginBottom: 2 }}>Race / ethnicity</div>
                    {detail.diversity.slice(0, 6).map((d) => (
                      <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 96, fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text }}>{d.label}</span>
                        <div style={{ flex: 1, height: 7, borderRadius: 5, background: C.bg, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.round(d.pct * 100)}%`, height: '100%', background: ACCENT, borderRadius: 5 }} />
                        </div>
                        <span style={{ width: 34, textAlign: 'right', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: C.textMuted }}>{Math.round(d.pct * 100)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </Section>

          {/* top programs */}
          {programs.length > 0 && (
            <Section title="Popular majors">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {programs.map(([field, share]) => (
                  <span key={field} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 999, padding: '4px 10px' }}>
                    {prettyField(field)} <span style={{ color: C.textMuted }}>{Math.round(share * 100)}%</span>
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
            <button type="button" onClick={() => onAdd(college, match.band)} disabled={added}
              style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: added ? C.surfaceHover : ACCENT, color: added ? C.textMuted : '#fff', cursor: added ? 'default' : 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 13.5, fontWeight: 600 }}>
              {added ? '✓ On your list' : '+ Add to list'}
            </button>
            <a href={`https://collegescorecard.ed.gov/school/?${college.scorecard_id}`} target="_blank" rel="noreferrer"
              style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted, textDecoration: 'none' }}>Full profile ↗</a>
            {college.npc_url && (
              <a href={/^https?:\/\//i.test(college.npc_url) ? college.npc_url : `https://${college.npc_url}`} target="_blank" rel="noreferrer"
                style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted, textDecoration: 'none' }}>Net price calculator ↗</a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginTop: 16 }}>
    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 8 }}>{title}</div>
    {children}
  </div>
)

const Chip = ({ text }: { text: string }) => (
  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 999, padding: '4px 11px' }}>{text}</span>
)

const MiniStat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div style={{ fontFamily: "'Young Serif',serif", fontSize: 18, color: C.text }}>{value}</div>
    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>{label}</div>
  </div>
)
