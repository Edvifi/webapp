/**
 * Discover tab (Application Tracking module). First-run gate → onboarding form;
 * then fit-led match cards, a pathway filter, and two discovery surfaces:
 * an affordable-CC nudge and a "path to your dream school" transfer pairing.
 * Fit and admission chance are shown as SEPARATE signals; admission is a warm
 * band (never a bare %), with the estimate available on expand.
 *
 * Community colleges are ranked by ZIP-radius proximity to the student
 * (geocoded from their profile ZIP); the home state is derived from the ZIP if
 * they didn't set one, so local CC/transfer options appear automatically.
 */
import { useMemo, useState, useEffect, memo, type CSSProperties } from 'react'
import { C } from '../lib/designTokens'
import { useAuth } from '../contexts/AuthContext'
import {
  scoreCollegeForProfile,
  isUndergradTarget,
  collegeAppId,
  suggestTransferPath,
  pickAffordableAlternatives,
  collegeDistanceMi,
  formatNetPrice,
  BAND_META,
  type College,
  type CollegeMatch,
  type AdmissionBand,
  type PathwayType,
  type GeoPoint,
  type StudentCollegeProfile,
} from '../lib/collegeMatch'
import { geocodeZip } from '../lib/geoZip'
import { useCollegePrefs } from '../lib/useCollegePrefs'
import { useColleges } from '../lib/useColleges'
import { searchCollegesDb } from '../lib/collegeSearch'
import { domainOf, logoUrlForDomain } from '../lib/collegeLogo'
import { fetchSchoolDetail } from '../lib/scorecard'
import { CollegeLogo } from './moduleUI'
import CollegePrefsForm from './CollegePrefsForm'
import CollegeDetailModal from './CollegeDetailModal'

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

const miLabel = (mi: number) => (mi < 1 ? '<1 mi away' : `${Math.round(mi)} mi away`)

/* ─── band chip with expandable estimate ─── */

function BandChip({ band, estAdmitPct }: { band: AdmissionBand; estAdmitPct: number | null }) {
  const [open, setOpen] = useState(false)
  const meta = BAND_META[band]
  const color = bandColor(meta.tone)
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
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

/* ─── match card (match is precomputed by the tab) ─── */

// Memoized: with "Show all" rendering hundreds of cards, a search keystroke must not
// re-render every card. Props are referentially stable (college/match come from the
// scored memo, onAdd is the parent's useCallback'd handler), so memo actually skips work.
/** Condense a verbose match reason into a short, scannable chip. */
function shortenReason(reason: string): { icon: string; label: string; good?: boolean } {
  let m: RegExpMatchArray | null
  if (reason.startsWith('Free for you')) return { icon: '💰', label: 'Free after aid', good: true }
  if ((m = reason.match(/about \$([\d,]+)\/yr/))) return { icon: '💰', label: `~$${m[1]}/yr`, good: true }
  if ((m = reason.match(/^Strong (.+) program$/))) return { icon: '🎓', label: `Strong ${m[1]}` }
  if (reason.startsWith('Open admission')) return { icon: '🎟️', label: 'Open admission', good: true }
  if ((m = reason.match(/^(\d+)% of students transfer/))) return { icon: '🔁', label: `${m[1]}% transfer` }
  if ((m = reason.match(/graduation rate \((\d+)%\)/))) return { icon: '📈', label: `${m[1]}% grad rate` }
  if ((m = reason.match(/earn ~\$(\d+)k/))) return { icon: '💵', label: `$${m[1]}k earnings` }
  if ((m = reason.match(/Matches your (.+)-campus/))) return { icon: '🏫', label: `${m[1]} campus` }
  if ((m = reason.match(/preferred (.+) setting/))) return { icon: '📍', label: m[1] }
  if (reason.startsWith('Close to home')) return { icon: '🏠', label: 'Close to home' }
  return { icon: '•', label: reason }
}

const MatchCard = memo(function MatchCard({ college, match, distanceMi, onAdd, added, onOpen }: {
  college: College
  match: CollegeMatch
  distanceMi?: number | null
  onAdd: (college: College, band: AdmissionBand) => void
  added: boolean
  onOpen: (college: College, match: CollegeMatch) => void
}) {
  const pm = PATHWAY_META[match.pathway]
  const showDist = college.institution_type === '2yr' && distanceMi != null
  return (
    <div onClick={() => onOpen(college, match)} onMouseEnter={() => fetchSchoolDetail(college.scorecard_id)} style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, boxShadow: C.shadow1, cursor: 'pointer' }}>
      {/* fixed-height header so the band + chips align across cards regardless of name length */}
      <div style={{ minHeight: 78 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
            <CollegeLogo logoUrl={logoUrlForDomain(domainOf(college.url))} emoji={pm.icon} size={30} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Young Serif',serif", fontSize: 16.5, color: C.text, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{college.name}</div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted, marginTop: 2 }}>
                {pm.icon} {typeSubtitle(college)}{showDist ? ` · ${miLabel(distanceMi!)}` : ''}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Young Serif',serif", fontSize: 22, color: ACCENT, lineHeight: 1 }}>{match.fitScore}%</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>match</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 10px', flexWrap: 'wrap' }}>
        <BandChip band={match.band} estAdmitPct={match.estAdmitPct} />
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: match.netPriceForYouCents != null && match.netPriceForYouCents <= 0 ? '#2D9E72' : C.text }}>
          {formatNetPrice(match.netPriceForYouCents)}
        </span>
      </div>

      {match.reasons.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0 0 12px' }}>
          {match.reasons.slice(0, 3).map((r, i) => {
            const c = shortenReason(r)
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: "'Outfit',sans-serif", fontSize: 11.5, fontWeight: 500, color: c.good ? '#2D9E72' : C.text, background: c.good ? '#2D9E7214' : C.bg, border: `1px solid ${c.good ? '#2D9E7233' : C.border}`, borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap' }}>
                {c.icon} {c.label}
              </span>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto', paddingTop: 12 }}>
        <button type="button" onClick={(e) => { e.stopPropagation(); onAdd(college, match.band) }} disabled={added}
          style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${added ? C.border : ACCENT}`, whiteSpace: 'nowrap', flexShrink: 0,
            background: added ? C.surfaceHover : ACCENT, color: added ? C.textMuted : C.white, cursor: added ? 'default' : 'pointer',
            fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600 }}>
          {added ? '✓ On your list' : '+ Add to list'}
        </button>
        <span style={{ marginLeft: 'auto', fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textFaint, whiteSpace: 'nowrap' }}>Details ›</span>
      </div>
    </div>
  )
})

/* ─── discovery surface wrapper ─── */

const Surface = ({ title, blurb, tint, children }: { title: string; blurb: string; tint: string; children: React.ReactNode }) => (
  <div style={{ background: tint, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 18 }}>
    <div style={{ fontFamily: "'Young Serif',serif", fontSize: 16, color: C.text }}>{title}</div>
    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted, margin: '3px 0 12px', lineHeight: 1.4 }}>{blurb}</div>
    {children}
  </div>
)

/* ─── the tab ─── */

interface Scored { college: College; match: CollegeMatch; dist: number | null }

export default function CollegeDiscoverTab({
  open,
  existingIds,
  onAdd,
}: {
  open: boolean
  existingIds: string[]
  onAdd: (college: College, band: AdmissionBand) => void
}) {
  const { profile } = useAuth()
  const { prefs, savePrefs, loaded, studentProfile } = useCollegePrefs(open)
  const [editing, setEditing] = useState(false)
  const [pathwayFilter, setPathwayFilter] = useState<'all' | PathwayType>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'fit' | 'price' | 'odds' | 'distance'>('fit')
  const [affordableOnly, setAffordableOnly] = useState(false)
  const [visibleCount, setVisibleCount] = useState(40)
  const [detail, setDetail] = useState<{ college: College; match: CollegeMatch } | null>(null)
  const openDetail = (college: College, match: CollegeMatch) => setDetail({ college, match })

  // Geocode the student's ZIP for community-college proximity; derive home state from it.
  const zip = profile?.demographics?.zipcode
  const [origin, setOrigin] = useState<GeoPoint | null>(null)
  const [geoState, setGeoState] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    geocodeZip(zip).then((loc) => {
      if (cancelled || !loc) return
      setOrigin({ lat: loc.lat, lng: loc.lng })
      setGeoState(loc.state || null)
    })
    return () => { cancelled = true }
  }, [zip])

  // Effective profile: fall back to the ZIP-derived state so local CCs load without an explicit pick.
  const effectiveProfile: StudentCollegeProfile = useMemo(
    () => ({ ...studentProfile, homeState: studentProfile.homeState ?? geoState }),
    [studentProfile, geoState],
  )

  // Don't fetch until the student has finished onboarding (avoids a shortlist that's never shown).
  const { rows, loading, error } = useColleges(open && prefs.completed, effectiveProfile, origin)

  const scored: Scored[] = useMemo(
    () =>
      rows
        .filter(isUndergradTarget)
        .map((college) => ({ college, match: scoreCollegeForProfile(college, effectiveProfile, origin), dist: collegeDistanceMi(college, origin) }))
        .sort((a, b) => b.match.fitScore - a.match.fitScore || b.match.dimensions.outcomes - a.match.dimensions.outcomes),
    [rows, effectiveProfile, origin],
  )

  // Name search queries the WHOLE colleges table (not just the ranked shortlist),
  // so any school is findable here — then scored through the same match engine so
  // it renders as a full match card. Empty box → the ranked matches above.
  const searching = search.trim().length >= 2
  const [dbResults, setDbResults] = useState<College[]>([])
  const [dbSearching, setDbSearching] = useState(false)
  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) { setDbResults([]); setDbSearching(false); return }
    let cancelled = false
    setDbSearching(true)
    const t = setTimeout(async () => {
      const r = await searchCollegesDb(q, 30)
      if (!cancelled) { setDbResults(r); setDbSearching(false) }
    }, 220)
    return () => { cancelled = true; clearTimeout(t) }
  }, [search])

  const searchScored: Scored[] = useMemo(
    () =>
      dbResults
        .filter(isUndergradTarget)
        .map((college) => ({ college, match: scoreCollegeForProfile(college, effectiveProfile, origin), dist: collegeDistanceMi(college, origin) }))
        .sort((a, b) => b.match.fitScore - a.match.fitScore),
    [dbResults, effectiveProfile, origin],
  )

  const visible = useMemo(
    () =>
      (searching ? searchScored : scored).filter((s) => {
        // During an explicit name search, don't hide by pathway opt-in — the user
        // named the school, so show it regardless.
        if (!searching) {
          if (s.match.pathway === 'community_transfer' && !prefs.openToTransfer) return false
          if (s.match.pathway === 'career_technical' && !prefs.openToTrade) return false
        }
        if (pathwayFilter !== 'all' && s.match.pathway !== pathwayFilter) return false
        if (affordableOnly && !(s.match.netPriceForYouCents != null && s.match.netPriceForYouCents <= 1_500_000)) return false
        return true
      }),
    [searching, searchScored, scored, prefs.openToTransfer, prefs.openToTrade, pathwayFilter, affordableOnly],
  )

  // "Best odds" ranks by how likely admission is (open first … reach last).
  const ODDS_RANK: Record<AdmissionBand, number> = { open: 0, likely: 1, target: 2, unknown: 3, reach: 4 }
  const sortedVisible = useMemo(() => {
    const arr = [...visible]
    if (sortBy === 'price') arr.sort((a, b) => (a.match.netPriceForYouCents ?? Infinity) - (b.match.netPriceForYouCents ?? Infinity))
    else if (sortBy === 'odds') arr.sort((a, b) => ODDS_RANK[a.match.band] - ODDS_RANK[b.match.band] || b.match.fitScore - a.match.fitScore)
    else if (sortBy === 'distance') arr.sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity))
    return arr // 'fit' keeps the scored order
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, sortBy])
  const topMatches = sortedVisible.slice(0, visibleCount)

  const affordableAlt: Scored | null = useMemo(() => {
    const c = pickAffordableAlternatives(rows, effectiveProfile, 1, origin)[0]
    return c ? { college: c, match: scoreCollegeForProfile(c, effectiveProfile, origin), dist: collegeDistanceMi(c, origin) } : null
  }, [rows, effectiveProfile, origin])

  const transferPath = useMemo(() => {
    if (!prefs.openToTransfer) return null
    const reach = scored.find((s) => s.match.pathway === '4yr_direct' && s.match.band === 'reach')?.college
    return reach ? suggestTransferPath(reach, rows, effectiveProfile, origin) : null
  }, [scored, rows, effectiveProfile, origin, prefs.openToTransfer])

  const hiddenGems = useMemo(() => {
    const topIds = new Set(topMatches.slice(0, 4).map((s) => s.college.id))
    return scored
      .filter((s) => s.match.fitScore >= 65 && (s.match.band === 'likely' || s.match.band === 'open') && (s.college.size ?? 1e9) < 20000 && !topIds.has(s.college.id))
      // Respect the pathway toggles (same as the main list) so this doesn't leak a
      // community/transfer or trade school the student opted out of.
      .filter((s) => !(s.match.pathway === 'community_transfer' && !prefs.openToTransfer) && !(s.match.pathway === 'career_technical' && !prefs.openToTrade))
      .slice(0, 3)
  }, [scored, topMatches, prefs.openToTransfer, prefs.openToTrade])

  const added = (c: College) => existingIds.includes(collegeAppId(c))
  const transferDist = transferPath ? collegeDistanceMi(transferPath.communityCollege, origin) : null

  /* first-run gate / editing */
  if (!loaded) return <div style={{ fontFamily: "'Outfit',sans-serif", color: C.textMuted, padding: 8 }}>Loading…</div>
  if (editing || !prefs.completed) {
    return (
      <div style={{ padding: '24px 28px' }}>
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

  const chipStyle = (active: boolean): CSSProperties => ({
    padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 12.5, fontWeight: 500,
    border: `1px solid ${active ? ACCENT : C.border}`,
    background: active ? ACCENT : C.white, color: active ? C.white : C.text,
  })
  const filterBtn = (key: 'all' | PathwayType): CSSProperties => chipStyle(pathwayFilter === key)

  return (
    <div style={{ padding: '24px 28px' }}>
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

      {!effectiveProfile.homeState && (
        <div style={{ background: '#F5EDE5', border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.text }}>
          💡 Add your{' '}
          <button type="button" onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', padding: 0, color: ACCENT, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 12.5 }}>home state or ZIP</button>
          {' '}to see nearby community-college and transfer options.
        </div>
      )}

      {/* discovery surfaces — hidden while name-searching the full catalog */}
      {!searching && transferPath && (
        <Surface title="🌉 A path to your dream school" tint="#EDEAF7"
          blurb={`Reaching for ${transferPath.target.name}? Here's a lower-cost, lower-risk route to the same degree.`}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13.5, color: C.text, lineHeight: 1.5 }}>
            <strong>{transferPath.communityCollege.name}</strong>
            {transferDist != null && <span style={{ color: C.textMuted }}> · {miLabel(transferDist)}</span>}
            {transferPath.transferRate != null && <> — {Math.round(transferPath.transferRate * 100)}% transfer on to a 4-year</>}
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

      {!searching && affordableAlt && (
        <Surface title="💡 You might not have considered" tint="#EBF5F0"
          blurb="An affordable, open-door option near you — a confident, low-risk way to start.">
          <MatchCard college={affordableAlt.college} match={affordableAlt.match} distanceMi={affordableAlt.dist} added={added(affordableAlt.college)} onAdd={onAdd} onOpen={openDetail} />
        </Surface>
      )}

      {!searching && hiddenGems.length > 0 && (
        <Surface title="✨ Strong-fit schools worth a look" tint={C.surfaceHover}
          blurb="High matches for you where you're likely to get in.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, gridAutoRows: '1fr' }}>
            {hiddenGems.map((s) => <MatchCard key={s.college.id} college={s.college} match={s.match} distanceMi={s.dist} added={added(s.college)} onAdd={onAdd} onOpen={openDetail} />)}
          </div>
        </Surface>
      )}

      {/* filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <button type="button" style={filterBtn('all')} onClick={() => setPathwayFilter('all')}>All paths</button>
        <button type="button" style={filterBtn('4yr_direct')} onClick={() => setPathwayFilter('4yr_direct')}>🎓 4-year</button>
        {prefs.openToTransfer && <button type="button" style={filterBtn('community_transfer')} onClick={() => setPathwayFilter('community_transfer')}>🌉 Community</button>}
        {prefs.openToTrade && <button type="button" style={filterBtn('career_technical')} onClick={() => setPathwayFilter('career_technical')}>🔧 Trade</button>}
        <button type="button" onClick={() => setAffordableOnly((v) => !v)} style={chipStyle(affordableOnly)}>💰 Affordable</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.text, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', outline: 'none' }}>
            <option value="fit">Sort: Best fit</option>
            <option value="price">Sort: Lowest net price</option>
            <option value="odds">Sort: Best admission odds</option>
            <option value="distance">Sort: Nearest</option>
          </select>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…"
            style={{ minWidth: 170, fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 11px', outline: 'none' }} />
        </div>
      </div>

      {/* results grid */}
      {(searching ? dbSearching : loading) ? (
        <div style={{ fontFamily: "'Outfit',sans-serif", color: C.textMuted, padding: 8 }}>{searching ? 'Searching all colleges…' : 'Finding your matches…'}</div>
      ) : error ? (
        <div style={{ fontFamily: "'Outfit',sans-serif", color: '#B93A3A', padding: 8 }}>Couldn't load colleges. Try again.</div>
      ) : topMatches.length === 0 ? (
        <div style={{ fontFamily: "'Outfit',sans-serif", color: C.textMuted, padding: 8 }}>
          {searching ? `No colleges match "${search.trim()}".` : 'No matches with these filters. Try widening your preferences.'}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, gridAutoRows: '1fr' }}>
            {topMatches.map((s) => <MatchCard key={s.college.id} college={s.college} match={s.match} distanceMi={s.dist} added={added(s.college)} onAdd={onAdd} onOpen={openDetail} />)}
          </div>
          <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {sortedVisible.length > topMatches.length && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button type="button" onClick={() => setVisibleCount((c) => c + 40)}
                  style={{ padding: '9px 20px', borderRadius: 10, border: `1px solid ${ACCENT}`, background: C.white, color: ACCENT, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 13.5, fontWeight: 600 }}>
                  Show more
                </button>
                <button type="button" onClick={() => setVisibleCount(sortedVisible.length)}
                  style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: 'transparent', color: C.textMuted, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 13 }}>
                  Show all {sortedVisible.length}
                </button>
              </div>
            )}
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted }}>
              Showing {topMatches.length} of {sortedVisible.length}
            </div>
          </div>
        </>
      )}

      {detail && (
        <CollegeDetailModal
          college={detail.college}
          match={detail.match}
          added={existingIds.includes(collegeAppId(detail.college))}
          onAdd={onAdd}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}
