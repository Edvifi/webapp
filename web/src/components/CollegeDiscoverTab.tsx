/**
 * Discover tab (Application Tracking module). First-run gate → onboarding form;
 * then the student's list (map + balance, see YourListStrip), a "Picked for
 * you" row — a transfer path to a dream school, an affordable nearby option,
 * and strong-fit likely admits, each tagged and colored by why it was picked —
 * and fit-led match cards with a pathway filter.
 * Fit and admission chance are shown as SEPARATE signals; admission is a warm
 * band (never a bare %), with the estimate available on expand. The band is
 * colored like the list category it becomes when added (reach / match / safety).
 *
 * Community colleges are ranked by ZIP-radius proximity to the student
 * (geocoded from their profile ZIP); the home state is derived from the ZIP if
 * they didn't set one, so local CC/transfer options appear automatically.
 */
import { useMemo, useState, useEffect, memo, type CSSProperties } from 'react'
import { C, fitScoreColor } from '../lib/designTokens'
import { CATEGORY_META } from '../data/applicationsChecklist'
import { useAuth } from '../contexts/AuthContext'
import {
  scoreCollegeForProfile,
  BAND_META,
  isUndergradTarget,
  collegeAppId,
  suggestTransferPath,
  pickAffordableAlternatives,
  collegeDistanceMi,
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
import YourListStrip from './YourListStrip'
import type { ApplicationEntry } from '../data/applicationsChecklist'

const ACCENT = '#7048C8'
/** Soft warm white: lifts cards off the beige page and keeps chip tints clean. */
const CARD_BG = 'var(--card-soft)'

/**
 * "Private · Princeton, NJ". Four-year schools are the default, so they're
 * described by public/private; community colleges and trade schools say what
 * they are, since that's the more useful fact about them.
 */
const typeSubtitle = (c: College) => {
  const kind = c.institution_type === '2yr' ? 'Community college'
    : c.institution_type === 'trade' ? 'Trade school'
    : (c.ownership ?? '').toLowerCase().includes('public') ? 'Public' : 'Private'
  return [kind, [c.city, c.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
}

/** Net price as the card's headline figure: the number, with "after aid" under it. */
const PriceFigure = ({ cents, size = 20 }: { cents: number | null; size?: number }) => {
  if (cents == null) return <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted }}>Net price varies</div>
  const free = cents <= 0
  return (
    <div>
      <div style={{ fontFamily: "'Young Serif',serif", fontSize: size, lineHeight: 1.1, color: free ? '#2D9E72' : C.text }}>
        {free ? 'Free' : `$${Math.round(cents / 100).toLocaleString()}`}
        {!free && <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted }}>/yr</span>}
      </div>
      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>after aid</div>
    </div>
  )
}

/** Add button, or a quiet "On your list" once it's there (not a dead grey button). */
const AddControl = ({ added, onAdd }: { added: boolean; onAdd: () => void }) =>
  added ? (
    <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: ACCENT }}>✓ On your list</span>
  ) : (
    <button type="button" className="dc-add" onClick={(e) => { e.stopPropagation(); onAdd() }}
      style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${ACCENT}`, background: 'transparent', color: ACCENT, cursor: 'pointer', whiteSpace: 'nowrap',
        fontFamily: "'Outfit',sans-serif", fontSize: 12.5, fontWeight: 600 }}>
      + Add to list
    </button>
  )

/**
 * One color per pathway filter. A chip about the same thing uses the same color
 * (transfer rate → Community teal; Affordable → the money green on both); every
 * other chip color is unique, so a color never means two things on this page.
 */
const FILTER_COLOR: Record<PathwayType, string> = {
  '4yr_direct': '#A0457E',
  community_transfer: '#2A8C8C',
  career_technical: '#C47A12',
}

/**
 * Admission band colors = the list category the school becomes when added
 * (reach red, target → match blue, likely/open → safety green), so the pill
 * and the "Your list" strip agree.
 */
const BAND_COLOR: Record<AdmissionBand, string> = {
  open: CATEGORY_META.safety.color,
  likely: CATEGORY_META.safety.color,
  target: CATEGORY_META.match.color,
  reach: CATEGORY_META.reach.color,
  unknown: '#8C7E6A',
}

/* ─── band chip with expandable estimate ─── */

function BandChip({ band, estAdmitPct }: { band: AdmissionBand; estAdmitPct: number | null }) {
  const [open, setOpen] = useState(false)
  const meta = BAND_META[band]
  const color = BAND_COLOR[band]
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }} aria-expanded={open}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999,
          border: `1px solid ${color}`, background: `${color}14`, color, cursor: 'pointer',
          fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600 }}>
        {meta.label} <span style={{ opacity: 0.7, fontWeight: 400 }}>ⓘ</span>
      </button>
      {open && (
        <span style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 5, width: 220,
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

const miLabel = (mi: number) => (mi < 1 ? '<1 mi away' : `${Math.round(mi)} mi away`)

/* ─── match card (match is precomputed by the tab) ─── */

// Memoized: with "Show all" rendering hundreds of cards, a search keystroke must not
// re-render every card. Props are referentially stable (college/match come from the
// scored memo, onAdd is the parent's useCallback'd handler), so memo actually skips work.
/** Condense a verbose match reason into a short phrase, tagged by kind. */
type ChipTone = 'money' | 'program' | 'outcome' | 'transfer' | 'neutral'
/** Net price at or under this counts as affordable (the filter and the chip). */
const AFFORDABLE_MAX_CENTS = 1_500_000
/** Chip color per kind of reason: money green, programs purple, outcomes indigo, transfer teal; the rest stay neutral. */
const CHIP_TONE: Record<ChipTone, string> = {
  money: '#2D9E72', // also the Affordable filter
  program: '#7048C8',
  outcome: '#4453A6', // indigo: blue belongs to "match" (the admission band)
  transfer: FILTER_COLOR.community_transfer,
  neutral: '',
}
function shortenReason(reason: string): { label: string; tone: ChipTone } {
  let m: RegExpMatchArray | null
  if (reason.startsWith('Free for you')) return { label: 'Free after aid', tone: 'money' }
  if ((m = reason.match(/about \$([\d,]+)\/yr/))) return { label: `~$${m[1]}/yr`, tone: 'money' }
  if ((m = reason.match(/^Strong (.+) program$/))) return { label: `Strong ${m[1]}`, tone: 'program' }
  if (reason.startsWith('Open admission')) return { label: 'Open admission', tone: 'outcome' }
  if ((m = reason.match(/^(\d+)% of students transfer/))) return { label: `${m[1]}% transfer`, tone: 'transfer' }
  if ((m = reason.match(/graduation rate \((\d+)%\)/))) return { label: `${m[1]}% grad rate`, tone: 'outcome' }
  if ((m = reason.match(/earn ~\$(\d+)k/))) return { label: `$${m[1]}k earnings`, tone: 'outcome' }
  if ((m = reason.match(/Matches your (.+)-campus/))) return { label: `${m[1]} campus`, tone: 'neutral' }
  if ((m = reason.match(/preferred (.+) setting/))) return { label: m[1], tone: 'neutral' }
  if (reason.startsWith('Close to home')) return { label: 'Close to home', tone: 'neutral' }
  return { label: reason, tone: 'neutral' }
}

const MatchCard = memo(function MatchCard({ college, match, distanceMi, onAdd, added, onOpen }: {
  college: College
  match: CollegeMatch
  distanceMi?: number | null
  onAdd: (college: College, band: AdmissionBand) => void
  added: boolean
  onOpen: (college: College, match: CollegeMatch) => void
}) {
  const showDist = college.institution_type === '2yr' && distanceMi != null
  // The price figure already shows the net price, and the band pill shows
  // admission, so drop reasons that would repeat either.
  // Under the Affordable filter's line (and not free, which the price already
  // says) earns a green "Affordable" chip up front, so the filter and the card
  // speak the same color.
  const net = match.netPriceForYouCents
  const affordable = net != null && net > 0 && net <= AFFORDABLE_MAX_CENTS
  const reasons = [
    ...(affordable ? [{ label: 'Affordable', tone: 'money' as ChipTone }] : []),
    ...match.reasons.map(shortenReason).filter((c) => c.tone !== 'money' && c.label !== 'Open admission'),
  ].slice(0, 3)
  return (
    <div
      onClick={() => onOpen(college, match)}
      onMouseEnter={() => { void fetchSchoolDetail(college.scorecard_id).catch(() => {}) }}
      className="dc-card"
      style={{ display: 'flex', flexDirection: 'column', gap: 14, background: CARD_BG, border: `1px solid ${added ? `${ACCENT}55` : C.border}`, borderRadius: 14, padding: 16, boxShadow: C.shadow1, cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
          <CollegeLogo logoUrl={logoUrlForDomain(domainOf(college.url))} name={college.name} size={30} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Young Serif',serif", fontSize: 16.5, color: C.text, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{college.name}</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted, marginTop: 3 }}>
              {typeSubtitle(college)}{showDist ? ` · ${miLabel(distanceMi!)}` : ''}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Young Serif',serif", fontSize: 22, color: fitScoreColor(match.fitScore), lineHeight: 1 }}>{match.fitScore}%</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>match</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
        <PriceFigure cents={match.netPriceForYouCents} />
        <BandChip band={match.band} estAdmitPct={match.estAdmitPct} />
      </div>

      {reasons.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {reasons.map((r) => {
            const col = CHIP_TONE[r.tone]
            return (
              <span key={r.label} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11.5, fontWeight: 600, color: col || C.text, background: col ? `${col}14` : C.bg, border: `1px solid ${col ? `${col}33` : C.border}`, borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                {r.label}
              </span>
            )
          })}
        </div>
      )}

      {/* footer pinned to the bottom so cards in a row line up */}
      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', minHeight: 44 }}>
        <AddControl added={added} onAdd={() => onAdd(college, match.band)} />
      </div>
    </div>
  )
})

/* ─── picked for you ─── */

type PickKind = 'transfer' | 'affordable' | 'gem'
/** Each kind of pick gets its own color and label, so the reason reads at a glance. */
/** Module scope so the sort memo doesn't depend on it. */
const ODDS_RANK: Record<AdmissionBand, number> = { open: 0, likely: 1, target: 2, unknown: 3, reach: 4 }

const PICK_META: Record<PickKind, { label: string; color: string }> = {
  transfer: { label: 'Path to your dream school', color: '#7048C8' },
  affordable: { label: 'Affordable, close to home', color: '#2D9E72' },
  gem: { label: 'Strong fit, likely admit', color: '#1D7FC4' },
}

interface Pick { kind: PickKind; college: College; match: CollegeMatch; why: string }

const PickCard = ({ pick, added, onAdd, onOpen }: {
  pick: Pick
  added: boolean
  onAdd: (college: College, band: AdmissionBand) => void
  onOpen: (college: College, match: CollegeMatch) => void
}) => {
  const meta = PICK_META[pick.kind]
  const { college, match } = pick
  return (
    <div
      onClick={() => onOpen(college, match)}
      className="pfy-card"
      style={{ flex: '0 0 250px', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', background: CARD_BG, border: `1px solid ${added ? `${ACCENT}55` : C.border}`, borderTop: `3px solid ${meta.color}`, borderRadius: 12, padding: '12px 14px 14px', cursor: 'pointer' }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Outfit',sans-serif", fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: meta.color }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color }} />
        {meta.label}
      </span>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 10 }}>
        <CollegeLogo logoUrl={logoUrlForDomain(domainOf(college.url))} name={college.name} size={28} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Young Serif',serif", fontSize: 15, color: C.text, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{college.name}</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted, marginTop: 2 }}>{typeSubtitle(college)}</div>
        </div>
      </div>
      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.text, lineHeight: 1.45, marginTop: 10 }}>{pick.why}</div>
      <div style={{ marginTop: 12 }}><PriceFigure cents={match.netPriceForYouCents} size={17} /></div>
      <div style={{ marginTop: 'auto', paddingTop: 12 }}>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, display: 'flex', alignItems: 'center', minHeight: 40 }}>
          <AddControl added={added} onAdd={() => onAdd(college, match.band)} />
        </div>
      </div>
    </div>
  )
}

/* ─── the tab ─── */

interface Scored { college: College; match: CollegeMatch; dist: number | null }

export default function CollegeDiscoverTab({
  open,
  apps,
  onAdd,
  onOpenSchool,
  onManageList,
}: {
  open: boolean
  /** The student's list, shown in the strip at the top. */
  apps: ApplicationEntry[]
  onAdd: (college: College, band: AdmissionBand) => void
  /** Open one school's page in Application Status. */
  onOpenSchool: (collegeId: string) => void
  onManageList: () => void
}) {
  const existingIds = useMemo(() => apps.map((a) => a.collegeId), [apps])
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
  // Distinct from "no results": a failed query must not read as a confident
  // "no colleges match".
  const [dbError, setDbError] = useState(false)
  // Everything search-related is read only while `searching`, so a short query
  // just leaves the last results unused. The loading flag is raised as the
  // student types (onSearchChange); the effect only runs the debounced query.
  const onSearchChange = (value: string) => {
    setSearch(value)
    setVisibleCount(40)
    if (value.trim().length >= 2) { setDbSearching(true); setDbError(false) }
  }
  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) return
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const r = await searchCollegesDb(q, 30)
        if (!cancelled) { setDbResults(r); setDbSearching(false) }
      } catch {
        if (!cancelled) { setDbResults([]); setDbError(true); setDbSearching(false) }
      }
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

  // While the first results of a search are loading, keep the ranked cards on
  // screen (dimmed) rather than emptying the grid; later keystrokes keep the
  // previous search's cards the same way. Swapping in a short loading line
  // shrank the page and threw the student's scroll position back up.
  const pendingSearch = searching && dbSearching
  const showSearchList = searching && !(pendingSearch && searchScored.length === 0)
  const visible = useMemo(
    () =>
      (showSearchList ? searchScored : scored).filter((s) => {
        // During an explicit name search, don't hide by pathway opt-in — the user
        // named the school, so show it regardless.
        if (!showSearchList) {
          if (s.match.pathway === 'community_transfer' && !prefs.openToTransfer) return false
          if (s.match.pathway === 'career_technical' && !prefs.openToTrade) return false
        }
        if (pathwayFilter !== 'all' && s.match.pathway !== pathwayFilter) return false
        if (affordableOnly && !(s.match.netPriceForYouCents != null && s.match.netPriceForYouCents <= AFFORDABLE_MAX_CENTS)) return false
        return true
      }),
    [showSearchList, searchScored, scored, prefs.openToTransfer, prefs.openToTrade, pathwayFilter, affordableOnly],
  )

  // "Best odds" ranks by how likely admission is (open first … reach last).
  const sortedVisible = useMemo(() => {
    const arr = [...visible]
    if (sortBy === 'odds') arr.sort((a, b) => ODDS_RANK[a.match.band] - ODDS_RANK[b.match.band] || b.match.fitScore - a.match.fitScore)
    else if (sortBy === 'price') arr.sort((a, b) => (a.match.netPriceForYouCents ?? Infinity) - (b.match.netPriceForYouCents ?? Infinity))
    else if (sortBy === 'distance') arr.sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity))
    return arr // 'fit' keeps the scored order
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

  // One row of picks, most specific reason first; a school only appears once.
  const picks: Pick[] = useMemo(() => {
    const out: Pick[] = []
    const seen = new Set<string>()
    const push = (p: Pick) => { if (!seen.has(p.college.id)) { seen.add(p.college.id); out.push(p) } }
    if (transferPath) {
      const cc = transferPath.communityCollege
      const rate = transferPath.transferRate != null ? ` ${Math.round(transferPath.transferRate * 100)}% transfer on to a 4-year.` : ''
      push({ kind: 'transfer', college: cc, match: scoreCollegeForProfile(cc, effectiveProfile, origin),
        why: `Start here, then transfer to ${transferPath.target.name}.${rate} Check the transfer agreement first.` })
    }
    if (affordableAlt) {
      const d = affordableAlt.dist
      push({ kind: 'affordable', college: affordableAlt.college, match: affordableAlt.match,
        why: `An open-door option${d != null ? `, ${miLabel(d).replace(' away', ' from you')}` : ' near you'}. A low-risk way to start.` })
    }
    for (const g of hiddenGems) {
      push({ kind: 'gem', college: g.college, match: g.match, why: `${g.match.fitScore}% match for you, and you’re likely to get in.` })
    }
    return out
  }, [transferPath, affordableAlt, hiddenGems, effectiveProfile, origin])

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

  const chipStyle = (active: boolean, color = ACCENT): CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 12.5, fontWeight: active ? 600 : 500,
    border: `1px solid ${active ? color : C.border}`,
    background: active ? color : C.white, color: active ? C.white : C.text,
  })
  const filterBtn = (key: 'all' | PathwayType): CSSProperties =>
    chipStyle(pathwayFilter === key, key === 'all' ? '#5E5446' : FILTER_COLOR[key])
  // Colored dot inside an inactive filter; white once it's switched on.
  const dot = (color: string, active: boolean) => (
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: active ? '#fff' : color, flexShrink: 0 }} />
  )

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

      <YourListStrip apps={apps} profile={effectiveProfile} origin={origin} onOpenSchool={onOpenSchool} onManage={onManageList} />

      {!effectiveProfile.homeState && (
        <div style={{ background: '#F5EDE5', border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.text }}>
          Add your{' '}
          <button type="button" onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', padding: 0, color: ACCENT, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 12.5 }}>home state or ZIP</button>
          {' '}to see nearby community-college and transfer options.
        </div>
      )}

      {/* picked for you — stays put during a search, so the search box doesn't jump */}
      {picks.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, color: 'rgba(var(--ink-rgb), 0.40)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Picked for you</span>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted }}>Based on your preferences, cost and location</span>
          </div>
          <div className="pfy-row" style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 6 }}>
            {picks.map((p) => <PickCard key={p.college.id} pick={p} added={added(p.college)} onAdd={onAdd} onOpen={openDetail} />)}
          </div>
        </section>
      )}

      {/* filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <button type="button" style={filterBtn('all')} onClick={() => { setPathwayFilter('all'); setVisibleCount(40) }}>All paths</button>
        <button type="button" style={filterBtn('4yr_direct')} onClick={() => { setPathwayFilter('4yr_direct'); setVisibleCount(40) }}>{dot(FILTER_COLOR['4yr_direct'], pathwayFilter === '4yr_direct')}4-year</button>
        {prefs.openToTransfer && <button type="button" style={filterBtn('community_transfer')} onClick={() => { setPathwayFilter('community_transfer'); setVisibleCount(40) }}>{dot(FILTER_COLOR.community_transfer, pathwayFilter === 'community_transfer')}Community</button>}
        {prefs.openToTrade && <button type="button" style={filterBtn('career_technical')} onClick={() => { setPathwayFilter('career_technical'); setVisibleCount(40) }}>{dot(FILTER_COLOR.career_technical, pathwayFilter === 'career_technical')}Trade</button>}
        <button type="button" onClick={() => { setAffordableOnly((v) => !v); setVisibleCount(40) }} style={chipStyle(affordableOnly, CHIP_TONE.money)}>{dot(CHIP_TONE.money, affordableOnly)}Affordable</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setVisibleCount(40) }}
            style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.text, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', outline: 'none' }}>
            <option value="fit">Sort: Best fit</option>
            <option value="price">Sort: Lowest net price</option>
            <option value="odds">Sort: Best admission odds</option>
            <option value="distance">Sort: Nearest</option>
          </select>
          <input type="search" value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search by name…"
            style={{ minWidth: 170, fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 11px', outline: 'none' }} />
        </div>
      </div>

      {/* results grid — held at a minimum height while searching so a short
          result list can't collapse the page under the student's scroll */}
      <div style={{ minHeight: searching ? '70vh' : undefined }}>
      {pendingSearch && (
        <div role="status" style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted, margin: '0 0 10px 2px' }}>Searching all colleges…</div>
      )}
      {!searching && loading ? (
        <div style={{ fontFamily: "'Outfit',sans-serif", color: C.textMuted, padding: 8 }}>Finding your matches…</div>
      ) : (searching ? dbError && !pendingSearch : error) ? (
        <div style={{ fontFamily: "'Outfit',sans-serif", color: '#B93A3A', padding: 8 }}>
          {searching ? "Couldn't run that search. Check your connection and try again." : "Couldn't load colleges. Try again."}
        </div>
      ) : topMatches.length === 0 && !pendingSearch ? (
        <div style={{ fontFamily: "'Outfit',sans-serif", color: C.textMuted, padding: 8 }}>
          {searching ? `No colleges match "${search.trim()}".` : 'No matches with these filters. Try widening your preferences.'}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, alignItems: 'stretch', opacity: pendingSearch ? 0.45 : 1, transition: 'opacity 0.15s ease' }}>
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
      </div>

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
