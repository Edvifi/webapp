/**
 * CollegeListMap — geographic view of the student's college list.
 *
 * Read-only US map (baked Albers paths). Each school on the list is a pin at its
 * real location: coordinates are projected at add-time and stored on the list
 * entry (app.mapX / mapY), so a pin is just a <circle> — no lookup needed here.
 * Hovering a pin names the school; co-located pins fan out to stay visible.
 */

import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { C } from '../lib/designTokens'
import { CATEGORY_META, type ApplicationEntry, type AppCategory } from '../data/applicationsChecklist'
import { US_STATES, US_MAP_VIEWBOX } from '../data/usStatesGeo'

// Theme-aware (see index.css): parchment land in light, warm dark in dark mode.
const LAND_FILL = 'var(--map-land)'
const STROKE = 'var(--map-stroke)'
/** Legend order: the three real bands, then unranked. */
const LEGEND_ORDER: AppCategory[] = ['reach', 'match', 'safety', 'unranked']

interface Pin {
  name: string
  state: string
  city: string
  x: number // true projected location
  y: number
  dx: number // display location (fanned out when co-located)
  dy: number
  category: AppCategory
}

// Pins closer than this (SVG units) are treated as the same spot and fanned out.
const CLUSTER_THRESH = 12

/** Spread co-located pins onto a small ring around their shared point so each stays visible. */
function spreadPins(pins: Pin[]) {
  const clusters: Pin[][] = []
  for (const p of pins) {
    const cl = clusters.find((c) => {
      const cx = c.reduce((s, q) => s + q.x, 0) / c.length
      const cy = c.reduce((s, q) => s + q.y, 0) / c.length
      return Math.hypot(p.x - cx, p.y - cy) < CLUSTER_THRESH
    })
    if (cl) cl.push(p)
    else clusters.push([p])
  }
  for (const c of clusters) {
    if (c.length === 1) { c[0].dx = c[0].x; c[0].dy = c[0].y; continue }
    const cx = c.reduce((s, q) => s + q.x, 0) / c.length
    const cy = c.reduce((s, q) => s + q.y, 0) / c.length
    const r = Math.max(11, 7.5 / Math.sin(Math.PI / c.length)) // keep neighbors ~15u apart
    c.forEach((q, i) => {
      const a = (2 * Math.PI * i) / c.length - Math.PI / 2 // start at top
      q.dx = cx + r * Math.cos(a)
      q.dy = cy + r * Math.sin(a)
    })
  }
}

export default function CollegeListMap({ apps }: { apps: ApplicationEntry[] }) {
  const { pins, states, unmapped, usedCategories } = useMemo(() => {
    const pins: Pin[] = []
    const states = new Set<string>()
    const usedCategories = new Set<AppCategory>()
    let unmapped = 0
    for (const app of apps) {
      usedCategories.add(app.category)
      if (app.state) states.add(app.state.toUpperCase())
      if (app.mapX != null && app.mapY != null) {
        pins.push({
          name: app.name ?? 'College',
          state: app.state ?? '',
          city: app.city ?? '',
          x: app.mapX, y: app.mapY, dx: app.mapX, dy: app.mapY,
          category: app.category,
        })
      } else {
        unmapped++
      }
    }
    spreadPins(pins)
    return { pins, states, unmapped, usedCategories }
  }, [apps])

  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null)

  const track = (e: ReactMouseEvent, i: number) => {
    const wrapper = (e.currentTarget as SVGElement).ownerSVGElement?.parentElement
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()
    setHover({ i, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const hoveredPin = hover ? pins[hover.i] : null

  return (
    <div style={{ marginBottom: 22, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>Where your schools are</h3>
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted }}>
          {pins.length} {pins.length === 1 ? 'school' : 'schools'} · {states.size} {states.size === 1 ? 'state' : 'states'}
        </span>
      </div>

      <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }} onMouseLeave={() => setHover(null)}>
        <svg viewBox={US_MAP_VIEWBOX} width="100%" style={{ display: 'block' }} role="img" aria-label="US map of your college list">
          {/* base map */}
          <g>
            {US_STATES.map((s) => (
              <path key={s.code} d={s.d} fill={LAND_FILL} stroke={STROKE} strokeWidth={0.8} style={{ pointerEvents: 'none' }} />
            ))}
          </g>
          {/* leader lines for fanned-out (co-located) pins */}
          <g style={{ pointerEvents: 'none' }}>
            {pins.map((p, i) =>
              p.dx !== p.x || p.dy !== p.y ? (
                <line key={`l-${i}`} x1={p.x} y1={p.y} x2={p.dx} y2={p.dy} stroke="rgba(var(--line-rgb), 0.30)" strokeWidth={0.8} />
              ) : null,
            )}
          </g>
          {/* pins — colored by reach / match / safety */}
          <g>
            {pins.map((p, i) => {
              const active = hover?.i === i
              return (
                <circle
                  key={`${p.name}-${i}`}
                  cx={p.dx}
                  cy={p.dy}
                  r={active ? 9 : 7}
                  fill={CATEGORY_META[p.category].color}
                  stroke="var(--map-pin-ring)"
                  strokeWidth={2}
                  style={{ cursor: 'pointer', transition: 'r 0.12s ease', opacity: 0.92 }}
                  onMouseEnter={(e) => track(e, i)}
                  onMouseMove={(e) => track(e, i)}
                />
              )
            })}
          </g>
        </svg>

        {hover && hoveredPin && (
          <div
            style={{
              position: 'absolute', left: hover.x + 14, top: hover.y + 14, pointerEvents: 'none', zIndex: 5,
              background: C.white, border: `1px solid ${C.borderStrong}`, borderRadius: 8, boxShadow: C.shadow2,
              padding: '8px 10px', maxWidth: 240,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_META[hoveredPin.category].color, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, color: C.text }}>{hoveredPin.name}</span>
            </div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted, marginTop: 2, paddingLeft: 14 }}>
              {[CATEGORY_META[hoveredPin.category].label, hoveredPin.city, hoveredPin.state].filter(Boolean).join(' · ')}
            </div>
          </div>
        )}
      </div>

      {/* legend + territory note */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 12 }}>
        {LEGEND_ORDER.filter((cat) => usedCategories.has(cat)).map((cat) => (
          <span key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: CATEGORY_META[cat].color, border: '1.5px solid var(--card-bg)', boxShadow: '0 0 0 1px rgba(var(--line-rgb), 0.12)' }} />
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>{CATEGORY_META[cat].label}</span>
          </span>
        ))}
        {unmapped > 0 && (
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint, marginLeft: 'auto' }}>
            {unmapped} {unmapped === 1 ? 'school is' : 'schools are'} outside the map (e.g. Puerto Rico / territories).
          </span>
        )}
      </div>
    </div>
  )
}
