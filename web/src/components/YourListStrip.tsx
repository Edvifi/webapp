/**
 * YourListStrip — the student's college list, compact, at the top of Discover.
 *
 * Replaces the old College List tab. The list is built here, so it lives here:
 * a map of where the schools are, the reach / match / safety balance, a logo
 * per school, and a cost box. The box shows the list's average net price and
 * sticker price; hovering or clicking a school (logo or pin) swaps it for that
 * school's fit, net price and cost of attendance, with a link to its page in
 * Application Status (where category, round and removal live). Collapses to
 * one line for browsing.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { C, MODULE_COLORS, fitScoreColor } from '../lib/designTokens'
import { CollegeLogo, SecLabel } from './moduleUI'
import CollegeListMap from './CollegeListMap'
import { STATE_NAMES } from '../data/usStatesGeo'
import { schoolDisplay } from '../lib/schoolDisplay'
import { CATEGORY_META, type AppCategory, type ApplicationEntry } from '../data/applicationsChecklist'
import { fetchSavedColleges } from '../lib/collegeSearch'
import { collegeDistanceMi, hasIncomeNetPrice, scoreCollegeForProfile, type College, type GeoPoint, type StudentCollegeProfile } from '../lib/collegeMatch'

const MC = MODULE_COLORS.applications
const font = "'Outfit',sans-serif"
const COLLAPSED_KEY = 'discover-list-collapsed'
/** Logos shown before "+N more": fewer beside the map, more when it's hidden. */
const MAX_LOGOS = { map: 10, noMap: 20 }
/* Small line icons for the "where" pills (stroke = currentColor). */
const svgProps = { width: 13, height: 13, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
const IconStates = () => (<svg {...svgProps}><path d="M8 14.5s4.5-4.1 4.5-7.7a4.5 4.5 0 1 0-9 0c0 3.6 4.5 7.7 4.5 7.7z" /><circle cx="8" cy="6.8" r="1.6" /></svg>)
const IconHome = () => (<svg {...svgProps}><path d="M2.5 7.5 8 3l5.5 4.5" /><path d="M4 6.5V13h8V6.5" /></svg>)
const IconRoute = () => (<svg {...svgProps}><circle cx="3.5" cy="12.5" r="1.5" /><circle cx="12.5" cy="3.5" r="1.5" /><path d="M5 12.5h4.5a2.5 2.5 0 0 0 0-5h-3a2.5 2.5 0 0 1 0-5H11" /></svg>)

const CATEGORY_ORDER: AppCategory[] = ['reach', 'match', 'safety', 'unranked']

const readCollapsed = (): boolean => {
  try { return localStorage.getItem(COLLAPSED_KEY) === '1' } catch { return false }
}
const writeCollapsed = (v: boolean) => {
  try { localStorage.setItem(COLLAPSED_KEY, v ? '1' : '0') } catch { /* private mode: just don't remember */ }
}

/** One gentle suggestion about the list's balance, or null when it looks fine. */
function balanceNote(counts: Record<AppCategory, number>, total: number): string | null {
  if (total >= 3 && counts.safety === 0) return 'No safety school yet. Add one you’re confident about.'
  if (total >= 4 && counts.reach > total / 2) return 'Mostly reaches. A couple more matches would balance it.'
  if (counts.unranked > 0) {
    return `${counts.unranked} ${counts.unranked === 1 ? 'school isn’t' : 'schools aren’t'} tagged reach, match or safety yet.`
  }
  return null
}

const perYear = (cents: number) => (cents <= 0 ? 'Free' : `$${Math.round(cents / 100).toLocaleString()}/yr`)

/** `personal`: the net price is for the student's income bracket, not the school average. */
interface Costs { fit: number; net: number | null; sticker: number | null; personal: boolean }

/** Fit and costs for one saved school, from its DB row. */
function costsFor(college: College, profile: StudentCollegeProfile, origin: GeoPoint | null): Costs {
  const match = scoreCollegeForProfile(college, profile, origin)
  const net = match.netPriceForYouCents // already falls back to the school average
  return { fit: match.fitScore, net: net == null ? null : Math.max(0, net), sticker: college.cost_of_attendance_cents, personal: hasIncomeNetPrice(college, profile) }
}

const average = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

/** One labelled figure in the cost box. */
const Figure = ({ label, value, note }: { label: string; value: string; note?: string }) => (
  <div style={{ minWidth: 0 }}>
    <SecLabel style={{ marginBottom: 4 }}>{label}</SecLabel>
    <div style={{ fontFamily: "'Young Serif',serif", fontSize: 20, color: C.text, lineHeight: 1.15 }}>{value}</div>
    {note && <div style={{ fontFamily: font, fontSize: 11.5, color: C.textMuted, marginTop: 3 }}>{note}</div>}
  </div>
)

export default function YourListStrip({
  apps,
  profile,
  origin,
  onOpenSchool,
  onManage,
}: {
  apps: ApplicationEntry[]
  /** The student's match profile, for fit % and income-adjusted net price. */
  profile: StudentCollegeProfile
  origin: GeoPoint | null
  /** Open one school's page in Application Status. */
  onOpenSchool: (collegeId: string) => void
  /** Go to Application Status. */
  onManage: () => void
}) {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const toggle = () => { writeCollapsed(!collapsed); setCollapsed(!collapsed); setHighlightState(null) }
  // Hover previews a school in the cost box; a click keeps it there.
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [pinnedId, setPinnedId] = useState<string | null>(null)
  const [highlightState, setHighlightState] = useState<string | null>(null)
  const togglePinned = (id: string) => setPinnedId((cur) => (cur === id ? null : id))

  // DB rows for the saved schools; refetched only when the set of ids changes.
  const idsKey = apps.map((a) => a.collegeId).sort().join(',')
  const [rows, setRows] = useState<Map<string, College> | null>(null)
  useEffect(() => {
    if (!idsKey) return
    let cancelled = false
    fetchSavedColleges(idsKey.split(','))
      .then((r) => { if (!cancelled) setRows(r) })
      // Costs are supplementary: on failure the box just says there's no data.
      .catch(() => { if (!cancelled) setRows(new Map()) })
    return () => { cancelled = true }
  }, [idsKey])

  const costs = useMemo(() => {
    const m = new Map<string, Costs>()
    for (const a of apps) {
      const row = rows?.get(a.collegeId)
      if (row) m.set(a.collegeId, costsFor(row, profile, origin))
    }
    return m
  }, [apps, rows, profile, origin])

  // Where the list is: each school's state (entry, else its DB row), how many
  // are in-state, and distances from home. Memoized: hovers re-render the strip.
  const where = useMemo(() => {
    const schoolStates = new Map<string, string>()
    for (const a of apps) {
      const st = (a.state ?? rows?.get(a.collegeId)?.state ?? '').toUpperCase()
      if (st) schoolStates.set(a.collegeId, st)
    }
    const home = profile.homeState?.toUpperCase() ?? null
    const inState = home ? apps.filter((a) => schoolStates.get(a.collegeId) === home).length : null
    const dists = apps.flatMap((a) => {
      const row = rows?.get(a.collegeId)
      const mi = row ? collegeDistanceMi(row, origin) : null
      return mi == null ? [] : [{ mi, name: schoolDisplay(a).name }]
    }).sort((x, y) => x.mi - y.mi)
    return { schoolStates, stateCount: new Set(schoolStates.values()).size, home, inState, dists }
  }, [apps, rows, origin, profile.homeState])

  if (apps.length === 0) {
    return (
      <div style={{ border: `1px dashed ${C.borderStrong}`, borderRadius: 14, padding: '14px 18px', marginBottom: 20, fontFamily: font, fontSize: 13, color: C.textMuted }}>
        <b style={{ color: C.text, fontWeight: 600 }}>Your list is empty.</b> Schools you add below land here, pinned on a map.
      </div>
    )
  }

  const counts = { reach: 0, match: 0, safety: 0, unranked: 0 } as Record<AppCategory, number>
  for (const a of apps) counts[a.category] += 1
  const note = balanceNote(counts, apps.length)
  const maxLogos = collapsed ? MAX_LOGOS.noMap : MAX_LOGOS.map
  const shown = apps.slice(0, maxLogos)

  const focusId = hoverId ?? pinnedId
  const focusApp = focusId ? apps.find((a) => a.collegeId === focusId) : undefined
  const loading = rows == null
  // Roughly the same height for the averages (with their lowest/highest rows)
  // and for one school, so swapping between them on hover barely resizes it.
  const boxStyle = { padding: '14px 16px', borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`, minHeight: 196, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' } as const

  let costBox
  if (focusApp) {
    const d = schoolDisplay(focusApp)
    const c = costs.get(focusApp.collegeId)
    const cat = CATEGORY_META[focusApp.category]
    costBox = (
      <div style={boxStyle} aria-live="polite">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <CollegeLogo logoUrl={d.logoUrl} name={d.name} size={26} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
            <div style={{ fontFamily: font, fontSize: 12, color: C.textMuted, marginTop: 1 }}>
              <span style={{ color: cat.color, fontWeight: 600 }}>{cat.label}</span>{d.sub ? ` · ${d.sub}` : ''}
            </div>
          </div>
          {c && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: "'Young Serif',serif", fontSize: 20, color: fitScoreColor(c.fit), lineHeight: 1 }}>{c.fit}%</div>
              <div style={{ fontFamily: font, fontSize: 11, color: C.textMuted }}>match</div>
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
          <Figure label="Net price for you" value={loading ? '…' : c?.net != null ? perYear(c.net) : '—'} note={c && !c.personal ? 'school average, after aid' : 'after typical aid'} />
          <Figure label="Cost of attendance" value={loading ? '…' : c?.sticker != null ? perYear(c.sticker) : '—'} note="tuition, housing, food" />
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 10, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <button onClick={() => onOpenSchool(focusApp.collegeId)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font, fontSize: 12.5, fontWeight: 600, color: MC }}>
            Open its application →
          </button>
          {/* A pinned school may have no visible logo or pin to unpin it from. */}
          {pinnedId === focusApp.collegeId && (
            <button onClick={() => setPinnedId(null)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font, fontSize: 12, color: C.textMuted }}>
              Back to averages
            </button>
          )}
        </div>
      </div>
    )
  } else {
    const withNet = [...costs.values()].filter((c) => c.net != null)
    const withSticker = [...costs.values()].filter((c) => c.sticker != null)
    const avgNet = average(withNet.map((c) => c.net!))
    const avgSticker = average(withSticker.map((c) => c.sticker!))
    // "For you" only when every priced school reports the student's bracket.
    const hasIncome = profile.familyIncomeCents != null
    const allPersonal = withNet.length > 0 && withNet.every((c) => c.personal)
    // Cheapest and priciest for this student, named, so the average has context.
    const priced = apps.flatMap((a) => {
      const net = costs.get(a.collegeId)?.net
      return net == null ? [] : [{ app: a, net }]
    }).sort((a, b) => a.net - b.net)
    const low = priced[0]
    const high = priced.length > 1 ? priced[priced.length - 1] : undefined
    costBox = (
      <div style={boxStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Figure
            label="Avg. net price"
            value={loading ? '…' : avgNet != null ? perYear(avgNet) : '—'}
            note={!hasIncome ? 'after aid · add income to personalize' : allPersonal ? 'for you, after typical aid' : 'after aid · some use school averages'}
          />
          <Figure label="Avg. cost of attendance" value={loading ? '…' : avgSticker != null ? perYear(avgSticker) : '—'} note="before aid" />
        </div>
        {!loading && low && high && (
          <div style={{ marginTop: 12, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
            {([['Lowest', low], ['Highest', high]] as const).map(([label, r]) => {
              const d = schoolDisplay(r.app)
              return (
                // Click, not hover: these rows live inside the box a hover swaps out.
                <button
                  key={label}
                  onClick={() => togglePinned(r.app.collegeId)}
                  className="yls-range"
                  aria-label={`${label} net price: ${d.name}, ${perYear(r.net)}`}
                  style={{ width: '100%', display: 'grid', gridTemplateColumns: '58px 20px minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '5px 4px', margin: '0 -4px', background: 'none', border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left', boxSizing: 'content-box' }}
                >
                  <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted }}>{label}</span>
                  <CollegeLogo logoUrl={d.logoUrl} name={d.name} size={18} />
                  <span style={{ fontFamily: font, fontSize: 12.5, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                  <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 600, color: r.net <= 0 ? '#2D9E72' : C.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{perYear(r.net)}</span>
                </button>
              )
            })}
          </div>
        )}
        <div style={{ fontFamily: font, fontSize: 11.5, color: C.textFaint, marginTop: 'auto', paddingTop: 10 }}>
          {!loading && withNet.length < apps.length ? `Across the ${withNet.length} of ${apps.length} schools with cost data. ` : ''}Hover or tap a school for its numbers.
        </div>
      </div>
    )
  }

  const { schoolStates, stateCount, home, inState, dists } = where
  const miles = (mi: number) => (mi < 1 ? '<1' : Math.round(mi).toLocaleString())
  const nearest = dists[0]
  const farthest = dists.length > 1 ? dists[dists.length - 1] : undefined

  // A row of soft pills: a lighter tier under the cost box. Hovering the
  // in-state pill highlights the home state on the map.
  const pill = (icon: ReactNode, body: ReactNode, extra: { title?: string; onEnter?: () => void; onLeave?: () => void } = {}) => (
    <span
      title={extra.title}
      onMouseEnter={extra.onEnter}
      onMouseLeave={extra.onLeave}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 11px', borderRadius: 99, background: 'rgba(var(--line-rgb), 0.05)', border: `1px solid ${C.border}`, fontFamily: font, fontSize: 12.5, color: C.textMuted, whiteSpace: 'nowrap' }}
    >
      <span style={{ display: 'inline-flex', color: MC }}>{icon}</span>
      {body}
    </span>
  )
  const strong = (t: string) => <b style={{ color: C.text, fontWeight: 600 }}>{t}</b>
  const whereLine = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
      {stateCount > 0 && pill(<IconStates />, <>{strong(`${stateCount} ${stateCount === 1 ? 'state' : 'states'}`)}</>, { title: `${apps.length} ${apps.length === 1 ? 'school' : 'schools'} across ${stateCount} ${stateCount === 1 ? 'state' : 'states'}` })}
      {inState != null && home && pill(<IconHome />, <>{strong(String(inState))} in {STATE_NAMES[home] ?? home}</>, collapsed || inState === 0 ? {} : {
        // Only with the map on screen: it's what the hover highlights.
        title: 'Hover to see them on the map',
        onEnter: () => setHighlightState(home),
        onLeave: () => setHighlightState(null),
      })}
      {nearest && pill(<IconRoute />, <>{strong(farthest ? `${miles(nearest.mi)}–${miles(farthest.mi)} mi` : `${miles(nearest.mi)} mi`)} from home</>, {
        title: farthest ? `Nearest: ${nearest.name}\nFarthest: ${farthest.name}` : nearest.name,
      })}
    </div>
  )

  const listSide = (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 12px', fontFamily: font, fontSize: 13.5 }}>
        {CATEGORY_ORDER.filter((c) => counts[c] > 0).map((c) => (
          <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.textMuted }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_META[c].color }} />
            <b style={{ color: CATEGORY_META[c].color, fontWeight: 700 }}>{counts[c]}</b> {CATEGORY_META[c].label.toLowerCase()}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 12 }}>
        {shown.map((a) => {
          const d = schoolDisplay(a)
          return (
            <button
              key={a.collegeId}
              onClick={() => togglePinned(a.collegeId)}
              onMouseEnter={() => setHoverId(a.collegeId)}
              onMouseLeave={() => setHoverId(null)}
              onFocus={() => setHoverId(a.collegeId)}
              onBlur={() => setHoverId(null)}
              title={d.name}
              aria-label={`Show ${d.name}`}
              aria-pressed={pinnedId === a.collegeId}
              className="yls-logo"
              style={{ width: 34, height: 34, borderRadius: '50%', padding: 0, background: C.white, border: `2px solid ${CATEGORY_META[a.category].color}`, boxShadow: pinnedId === a.collegeId ? `0 0 0 3px ${CATEGORY_META[a.category].color}40` : undefined, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}
            >
              <CollegeLogo logoUrl={d.logoUrl} name={d.name} size={20} />
            </button>
          )
        })}
        {apps.length > maxLogos && (
          <button onClick={onManage} style={{ background: 'none', border: 'none', padding: '0 4px', cursor: 'pointer', fontFamily: font, fontSize: 12.5, fontWeight: 600, color: C.textMuted }}>
            +{apps.length - maxLogos} more
          </button>
        )}
      </div>
    </div>
  )

  const footer = (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px 16px', flexWrap: 'wrap', marginTop: 14 }}>
      <span style={{ fontFamily: font, fontSize: 12.5, color: '#C47A12' }}>{note ?? ''}</span>
      <button onClick={onManage} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font, fontSize: 12.5, fontWeight: 600, color: MC }}>
        Manage in Application Status →
      </button>
    </div>
  )

  return (
    <section aria-label="Your list" style={{ background: 'var(--card-soft)', border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 18px 16px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <SecLabel style={{ marginBottom: 0 }}>Your list · {apps.length} {apps.length === 1 ? 'school' : 'schools'}</SecLabel>
        <button onClick={toggle} aria-expanded={!collapsed} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font, fontSize: 12, fontWeight: 600, color: C.textMuted }}>
          {collapsed ? 'Show map ▾' : 'Hide map ▴'}
        </button>
      </div>
      {collapsed ? (
        // Map hidden: the list on the left, the cost box beside it.
        <div className="yls-row">
          {listSide}
          <div style={{ minWidth: 0 }}>{costBox}{whereLine}</div>
        </div>
      ) : (
        <div className="yls-grid">
          <CollegeListMap apps={apps} selectedId={focusId} highlightState={highlightState === home ? highlightState : null} schoolStates={schoolStates} onPinHover={setHoverId} onPinClick={togglePinned} />
          <div style={{ minWidth: 0 }}>
            {listSide}
            <div style={{ marginTop: 14 }}>{costBox}</div>
            {whereLine}
          </div>
        </div>
      )}
      {footer}
    </section>
  )
}
