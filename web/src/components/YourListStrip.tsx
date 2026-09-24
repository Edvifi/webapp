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

import { useEffect, useMemo, useState } from 'react'
import { C, MODULE_COLORS, fitScoreColor } from '../lib/designTokens'
import { CollegeLogo, SecLabel } from './moduleUI'
import CollegeListMap from './CollegeListMap'
import { schoolDisplay } from '../lib/schoolDisplay'
import { CATEGORY_META, type AppCategory, type ApplicationEntry } from '../data/applicationsChecklist'
import { fetchSavedColleges } from '../lib/collegeSearch'
import { scoreCollegeForProfile, type College, type GeoPoint, type StudentCollegeProfile } from '../lib/collegeMatch'

const MC = MODULE_COLORS.applications
const font = "'Outfit',sans-serif"
const COLLAPSED_KEY = 'discover-list-collapsed'
/** Logos shown before "+N more": fewer beside the map, more when it's hidden. */
const MAX_LOGOS = { map: 10, noMap: 20 }
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

interface Costs { fit: number; net: number | null; sticker: number | null }

/** Fit and costs for one saved school, from its DB row. */
function costsFor(college: College, profile: StudentCollegeProfile, origin: GeoPoint | null): Costs {
  const match = scoreCollegeForProfile(college, profile, origin)
  const net = match.netPriceForYouCents ?? college.avg_net_price_cents
  return { fit: match.fitScore, net: net == null ? null : Math.max(0, net), sticker: college.cost_of_attendance_cents }
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
  const toggle = () => { writeCollapsed(!collapsed); setCollapsed(!collapsed) }
  // Hover previews a school in the cost box; a click keeps it there.
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [pinnedId, setPinnedId] = useState<string | null>(null)
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
  // Roughly the same height for the averages and for one school, so swapping
  // between them on hover barely resizes the box.
  const boxStyle = { padding: '14px 16px', borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`, minHeight: 150, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' } as const

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
          <Figure label="Net price for you" value={loading ? '…' : c?.net != null ? perYear(c.net) : '—'} note="after typical aid" />
          <Figure label="Cost of attendance" value={loading ? '…' : c?.sticker != null ? perYear(c.sticker) : '—'} note="tuition, housing, food" />
        </div>
        <button onClick={() => onOpenSchool(focusApp.collegeId)} style={{ marginTop: 'auto', paddingTop: 10, alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font, fontSize: 12.5, fontWeight: 600, color: MC }}>
          Open its application →
        </button>
      </div>
    )
  } else {
    const withNet = [...costs.values()].filter((c) => c.net != null)
    const withSticker = [...costs.values()].filter((c) => c.sticker != null)
    const avgNet = average(withNet.map((c) => c.net!))
    const avgSticker = average(withSticker.map((c) => c.sticker!))
    const personal = profile.familyIncomeCents != null
    // Cheapest and priciest for this student, named, so the average has context.
    const priced = apps.flatMap((a) => {
      const net = costs.get(a.collegeId)?.net
      return net == null ? [] : [{ name: schoolDisplay(a).name, net }]
    }).sort((a, b) => a.net - b.net)
    const low = priced[0]
    const high = priced.length > 1 ? priced[priced.length - 1] : undefined
    costBox = (
      <div style={boxStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Figure
            label="Avg. net price"
            value={loading ? '…' : avgNet != null ? perYear(avgNet) : '—'}
            note={personal ? 'for you, after typical aid' : 'after aid · add income to personalize'}
          />
          <Figure label="Avg. cost of attendance" value={loading ? '…' : avgSticker != null ? perYear(avgSticker) : '—'} note="before aid" />
        </div>
        {!loading && low && high && (
          <div style={{ fontFamily: font, fontSize: 12.5, color: C.text, marginTop: 12, lineHeight: 1.5 }}>
            <span style={{ color: C.textMuted }}>Lowest</span> {low.name} <b style={{ fontWeight: 600 }}>{perYear(low.net)}</b>
            <span style={{ color: C.textFaint }}>{'  ·  '}</span>
            <span style={{ color: C.textMuted }}>Highest</span> {high.name} <b style={{ fontWeight: 600 }}>{perYear(high.net)}</b>
          </div>
        )}
        <div style={{ fontFamily: font, fontSize: 11.5, color: C.textFaint, marginTop: 'auto', paddingTop: 10 }}>
          {!loading && withNet.length < apps.length ? `Across the ${withNet.length} of ${apps.length} schools with cost data. ` : ''}Hover or tap a school for its numbers.
        </div>
      </div>
    )
  }

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
          {costBox}
        </div>
      ) : (
        <div className="yls-grid">
          <CollegeListMap apps={apps} selectedId={focusId} onPinHover={setHoverId} onPinClick={togglePinned} />
          <div style={{ minWidth: 0 }}>
            {listSide}
            <div style={{ marginTop: 14 }}>{costBox}</div>
          </div>
        </div>
      )}
      {footer}
    </section>
  )
}
