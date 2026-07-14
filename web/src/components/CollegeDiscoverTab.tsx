/**
 * Discover tab (Application Tracking module). First-run gate → onboarding form;
 * then fit-led match cards, a pathway filter, and two discovery surfaces:
 * an affordable-CC nudge and a "path to your dream school" transfer pairing.
 * Fit and admission chance are shown as SEPARATE signals; admission is a warm
 * band (never a bare %), with the estimate available on expand.
 */
import { useMemo, useState, type CSSProperties } from 'react'
import { C } from '../lib/designTokens'
import {
  scoreCollegeForProfile,
  isUndergradTarget,
  suggestTransferPath,
  pickAffordableAlternatives,
  formatNetPrice,
  BAND_META,
  type College,
  type AdmissionBand,
  type PathwayType,
} from '../lib/collegeMatch'
import { useCollegePrefs } from '../lib/useCollegePrefs'
import { useColleges } from '../lib/useColleges'
import CollegePrefsForm from './CollegePrefsForm'

const ACCENT = '#7048C8'

const PATHWAY_META: Record<PathwayType, { label: string; icon: string }> = {
  '4yr_direct': { label: '4-year', icon: '🎓' },
  community_transfer: { label: 'Community & transfer', icon: '🌉' },
  career_technical: { label: 'Trade & career', icon: '🔧' },
}
const bandColor = (tone: 'positive' | 'neutral' | 'aspirational') =>
  tone === 'positive' ? '#2D9E72' : tone === 'neutral' ? '#1D7FC4' : '#C47A12'

const typeSubtitle = (c: College) =>
  [PATHWAY_META[c.institution_type === '2yr' ? 'community_transfer' : c.institution_type === 'trade' ? 'career_technical' : '4yr_direct'].label,
    [c.city, c.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')

/* ─── band chip with expandable estimate ─── */

function BandChip({ band, estAdmitPct }: { band: AdmissionBand; estAdmitPct: number | null }) {
  const [open, setOpen] = useState(false)
  const meta = BAND_META[band]
  const color = bandColor(meta.tone)
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999,
          border: `1px solid ${color}`, background: `${color}14`, color, cursor: 'pointer',
          fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600 }}>
        {meta.label} <span style={{ opacity: 0.7, fontWeight: 400 }}>ⓘ</span>
      </button>
      {open && (
        <span style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 5, width: 220,
          background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px',
          boxShadow: C.shadow3, fontFamily: "'Outfit',sans-serif" }}>
          <span style={{ display: 'block', fontSize: 12.5, color: C.text, marginBottom: 4 }}>{meta.blurb}</span>
          <span style={{ display: 'block', fontSize: 12, color: C.textMuted }}>
            {estAdmitPct == null ? 'Open admission — all eligible applicants are accepted.' : `Estimated admit chance for your profile: ~${estAdmitPct}%.`}
          </span>
        </span>
      )}
    </span>
  )
}

/* ─── match card ─── */

function MatchCard({ college, onAdd, added }: { college: College; onAdd: () => void; added: boolean }) {
  const { studentProfile } = useCollegePrefs(true)
  const match = useMemo(() => scoreCollegeForProfile(college, studentProfile), [college, studentProfile])
  const pm = PATHWAY_META[match.pathway]
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, boxShadow: C.shadow1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Young Serif',serif", fontSize: 16.5, color: C.text, lineHeight: 1.2 }}>{college.name}</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted, marginTop: 2 }}>
            {pm.icon} {typeSubtitle(college)}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Young Serif',serif", fontSize: 22, color: ACCENT, lineHeight: 1 }}>{match.fitScore}%</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>match</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 10px', flexWrap: 'wrap' }}>
        <BandChip band={match.band} estAdmitPct={match.estAdmitPct} />
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: match.netPriceForYouCents != null && match.netPriceForYouCents <= 0 ? '#2D9E72' : C.text }}>
          {formatNetPrice(match.netPriceForYouCents)}
        </span>
      </div>

      {match.reasons.length > 0 && (
        <ul style={{ margin: '0 0 12px', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {match.reasons.slice(0, 3).map((r, i) => (
            <li key={i} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.text, lineHeight: 1.35 }}>{r}</li>
          ))}
        </ul>
      )}

      <button type="button" onClick={onAdd} disabled={added}
        style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${added ? C.border : ACCENT}`,
          background: added ? C.surfaceHover : ACCENT, color: added ? C.textMuted : C.white, cursor: added ? 'default' : 'pointer',
          fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600 }}>
        {added ? '✓ On your list' : '+ Add to list'}
      </button>
    </div>
  )
}

/* ─── discovery surface wrapper ─── */

const Surface = ({ title, blurb, tint, children }: { title: string; blurb: string; tint: string; children: React.ReactNode }) => (
  <div style={{ background: tint, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 18 }}>
    <div style={{ fontFamily: "'Young Serif',serif", fontSize: 16, color: C.text }}>{title}</div>
    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted, margin: '3px 0 12px', lineHeight: 1.4 }}>{blurb}</div>
    {children}
  </div>
)

/* ─── the tab ─── */

export default function CollegeDiscoverTab({
  open,
  existingIds,
  onAdd,
}: {
  open: boolean
  existingIds: string[]
  onAdd: (college: College, band: AdmissionBand) => void
}) {
  const { prefs, savePrefs, loaded, studentProfile } = useCollegePrefs(open)
  const { rows, loading, error } = useColleges(open, studentProfile)
  const [editing, setEditing] = useState(false)
  const [pathwayFilter, setPathwayFilter] = useState<'all' | PathwayType>('all')
  const [search, setSearch] = useState('')

  const scored = useMemo(
    () =>
      rows
        .filter(isUndergradTarget)
        .map((college) => ({ college, match: scoreCollegeForProfile(college, studentProfile) }))
        .sort((a, b) => b.match.fitScore - a.match.fitScore || b.match.dimensions.outcomes - a.match.dimensions.outcomes),
    [rows, studentProfile],
  )

  const visible = useMemo(
    () =>
      scored.filter((s) => {
        if (s.match.pathway === 'community_transfer' && !prefs.openToTransfer) return false
        if (s.match.pathway === 'career_technical' && !prefs.openToTrade) return false
        if (pathwayFilter !== 'all' && s.match.pathway !== pathwayFilter) return false
        if (search.trim() && !s.college.name.toLowerCase().includes(search.trim().toLowerCase())) return false
        return true
      }),
    [scored, prefs.openToTransfer, prefs.openToTrade, pathwayFilter, search],
  )
  const topMatches = visible.slice(0, 40)

  const affordableAlt = useMemo(() => pickAffordableAlternatives(rows, studentProfile, 1)[0] ?? null, [rows, studentProfile])
  const transferPath = useMemo(() => {
    if (!prefs.openToTransfer) return null
    const reach = scored.find((s) => s.match.pathway === '4yr_direct' && s.match.band === 'reach')?.college
    return reach ? suggestTransferPath(reach, rows, studentProfile) : null
  }, [scored, rows, studentProfile, prefs.openToTransfer])
  const hiddenGems = useMemo(() => {
    const topIds = new Set(topMatches.slice(0, 4).map((s) => s.college.id))
    return scored
      .filter((s) => s.match.fitScore >= 65 && (s.match.band === 'likely' || s.match.band === 'open') && (s.college.size ?? 1e9) < 20000 && !topIds.has(s.college.id))
      .slice(0, 3)
  }, [scored, topMatches])

  const added = (c: College) => existingIds.includes(c.slug)

  /* first-run gate / editing */
  if (!loaded) return <div style={{ fontFamily: "'Outfit',sans-serif", color: C.textMuted, padding: 8 }}>Loading…</div>
  if (editing || !prefs.completed) {
    return (
      <div>
        <CollegePrefsForm value={prefs} submitLabel={prefs.completed ? 'Update matches' : 'Find my matches'} onSave={(p) => { savePrefs(p); setEditing(false) }} />
        {editing && (
          <button type="button" onClick={() => setEditing(false)}
            style={{ marginTop: 10, background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 13 }}>
            Cancel
          </button>
        )}
      </div>
    )
  }

  const filterBtn = (key: 'all' | PathwayType): CSSProperties => ({
    padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 12.5, fontWeight: 500,
    border: `1px solid ${pathwayFilter === key ? ACCENT : C.border}`,
    background: pathwayFilter === key ? ACCENT : C.white, color: pathwayFilter === key ? C.white : C.text,
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div>
          <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, color: C.text, margin: 0 }}>Discover your matches</h2>
          <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13.5, color: C.textMuted, margin: '4px 0 0' }}>
            Scored for how well each school fits you — cost, major, size, and location. Add any to your list.
          </p>
        </div>
        <button type="button" onClick={() => setEditing(true)}
          style={{ flexShrink: 0, padding: '7px 13px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white,
            color: C.text, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 500 }}>
          Edit preferences
        </button>
      </div>

      {/* discovery surfaces */}
      {transferPath && (
        <Surface title="🌉 A path to your dream school" tint="#EDEAF7"
          blurb={`Reaching for ${transferPath.target.name}? Here's a lower-cost, lower-risk route to the same degree.`}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13.5, color: C.text, lineHeight: 1.5 }}>
            <strong>{transferPath.communityCollege.name}</strong>
            {transferPath.transferRate != null && <> — {Math.round(transferPath.transferRate * 100)}% of students transfer on to a 4-year</>}
            <div style={{ color: C.textMuted, fontSize: 12.5, marginTop: 4 }}>
              {formatNetPrice(transferPath.netPriceForYouCents)} · then transfer to {transferPath.target.name}. Verify the transfer agreement before enrolling.
            </div>
          </div>
          <button type="button" disabled={added(transferPath.communityCollege)} onClick={() => onAdd(transferPath.communityCollege, 'open')}
            style={{ marginTop: 10, padding: '6px 12px', borderRadius: 8, border: `1px solid ${ACCENT}`, background: added(transferPath.communityCollege) ? C.surfaceHover : ACCENT, color: added(transferPath.communityCollege) ? C.textMuted : C.white, cursor: added(transferPath.communityCollege) ? 'default' : 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 12.5, fontWeight: 600 }}>
            {added(transferPath.communityCollege) ? '✓ On your list' : `+ Add ${transferPath.communityCollege.name}`}
          </button>
        </Surface>
      )}

      {affordableAlt && (
        <Surface title="💡 You might not have considered" tint="#EBF5F0"
          blurb="An affordable, open-door option near you — a confident, low-risk way to start.">
          <MatchCard college={affordableAlt} added={added(affordableAlt)} onAdd={() => onAdd(affordableAlt, 'open')} />
        </Surface>
      )}

      {hiddenGems.length > 0 && (
        <Surface title="✨ Strong-fit schools worth a look" tint={C.surfaceHover}
          blurb="High matches for you where you're likely to get in.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {hiddenGems.map((s) => <MatchCard key={s.college.id} college={s.college} added={added(s.college)} onAdd={() => onAdd(s.college, s.match.band)} />)}
          </div>
        </Surface>
      )}

      {/* filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <button type="button" style={filterBtn('all')} onClick={() => setPathwayFilter('all')}>All paths</button>
        <button type="button" style={filterBtn('4yr_direct')} onClick={() => setPathwayFilter('4yr_direct')}>🎓 4-year</button>
        {prefs.openToTransfer && <button type="button" style={filterBtn('community_transfer')} onClick={() => setPathwayFilter('community_transfer')}>🌉 Community</button>}
        {prefs.openToTrade && <button type="button" style={filterBtn('career_technical')} onClick={() => setPathwayFilter('career_technical')}>🔧 Trade</button>}
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…"
          style={{ marginLeft: 'auto', minWidth: 180, fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 11px', outline: 'none' }} />
      </div>

      {/* results grid */}
      {loading ? (
        <div style={{ fontFamily: "'Outfit',sans-serif", color: C.textMuted, padding: 8 }}>Finding your matches…</div>
      ) : error ? (
        <div style={{ fontFamily: "'Outfit',sans-serif", color: '#B93A3A', padding: 8 }}>Couldn't load colleges. Try again.</div>
      ) : topMatches.length === 0 ? (
        <div style={{ fontFamily: "'Outfit',sans-serif", color: C.textMuted, padding: 8 }}>
          No matches with these filters. Try widening your preferences.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {topMatches.map((s) => <MatchCard key={s.college.id} college={s.college} added={added(s.college)} onAdd={() => onAdd(s.college, s.match.band)} />)}
          </div>
          {visible.length > topMatches.length && (
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted, textAlign: 'center', marginTop: 14 }}>
              Showing your top {topMatches.length} matches. Narrow with filters or search to see more.
            </div>
          )}
        </>
      )}
    </div>
  )
}
