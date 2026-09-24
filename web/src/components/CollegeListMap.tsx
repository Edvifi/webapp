/**
 * CollegeListMap — geographic view of the student's college list, shown in the
 * "Your list" strip at the top of Discover.
 *
 * Read-only US map (baked Albers paths). Each school on the list is a pin at its
 * real location: coordinates are projected at add-time and stored on the list
 * entry (app.mapX / mapY), so a pin is just a <circle> — no lookup needed here.
 * Hovering a pin names the school; co-located pins fan out to stay visible.
 * A school added while the map is on screen drops its pin in, so adding from a
 * card below visibly lands somewhere.
 *
 * Bare by design: no card, title or legend. The strip around it carries the
 * reach / match / safety counts in the same colors.
 */

import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { C } from '../lib/designTokens'
import { CATEGORY_META, type ApplicationEntry, type AppCategory } from '../data/applicationsChecklist'
import { US_STATES, US_MAP_VIEWBOX } from '../data/usStatesGeo'
import { schoolDisplay } from '../lib/schoolDisplay'

// Theme-aware (see index.css): parchment land in light, warm dark in dark mode.
const LAND_FILL = 'var(--map-land)'
const STROKE = 'var(--map-stroke)'

interface Pin {
  id: string
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

export default function CollegeListMap({
  apps,
  selectedId = null,
  onPinHover,
  onPinClick,
}: {
  apps: ApplicationEntry[]
  /** Pin drawn enlarged, e.g. the school picked in the list strip. */
  selectedId?: string | null
  onPinHover?: (collegeId: string | null) => void
  onPinClick?: (collegeId: string) => void
}) {
  const { pins, unmapped } = useMemo(() => {
    const pins: Pin[] = []
    let unmapped = 0
    for (const app of apps) {
      if (app.mapX != null && app.mapY != null) {
        pins.push({
          id: app.collegeId,
          name: schoolDisplay(app).name,
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
    return { pins, unmapped }
  }, [apps])

  // Pins on the map when it first rendered just appear; ones added afterwards
  // drop in. The animation only plays when a circle mounts, so a pin keeps the
  // class harmlessly after landing.
  const [initialIds] = useState(() => new Set(pins.map((p) => p.id)))

  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null)

  const track = (e: ReactMouseEvent, i: number) => {
    const wrapper = (e.currentTarget as SVGElement).ownerSVGElement?.parentElement
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()
    setHover({ i, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const hoveredPin = hover ? pins[hover.i] : null

  return (
    <div>
      <div style={{ position: 'relative' }} onMouseLeave={() => { setHover(null); onPinHover?.(null) }}>
        <svg viewBox={US_MAP_VIEWBOX} width="100%" style={{ display: 'block' }} role="img" aria-label="US map of your college list">
          {/* base map */}
          <g>
            {US_STATES.map((s) => (
              <path key={s.code} d={s.d} fill={LAND_FILL} stroke={STROKE} strokeWidth={0.8} style={{ pointerEvents: 'none' }} />
            ))}
          </g>
          {/* leader lines for fanned-out (co-located) pins */}
          <g style={{ pointerEvents: 'none' }}>
            {pins.map((p) =>
              p.dx !== p.x || p.dy !== p.y ? (
                <line key={`l-${p.id}`} x1={p.x} y1={p.y} x2={p.dx} y2={p.dy} stroke="rgba(var(--line-rgb), 0.30)" strokeWidth={0.8} />
              ) : null,
            )}
          </g>
          {/* pins — colored by reach / match / safety */}
          <g>
            {pins.map((p, i) => {
              const active = hover?.i === i || selectedId === p.id
              return (
                <circle
                  key={p.id}
                  className={initialIds.has(p.id) ? undefined : 'map-pin-drop'}
                  cx={p.dx}
                  cy={p.dy}
                  r={active ? 11 : 9}
                  fill={CATEGORY_META[p.category].color}
                  stroke="var(--map-pin-ring)"
                  strokeWidth={2.5}
                  style={{ cursor: 'pointer', transition: 'r 0.12s ease', opacity: 0.92 }}
                  onMouseEnter={(e) => { track(e, i); onPinHover?.(p.id) }}
                  onClick={() => onPinClick?.(p.id)}
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
      {unmapped > 0 && (
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint, marginTop: 6 }}>
          {unmapped} {unmapped === 1 ? 'school is' : 'schools are'} off the map (e.g. Puerto Rico / territories).
        </div>
      )}
    </div>
  )
}
