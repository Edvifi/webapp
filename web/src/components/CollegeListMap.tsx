/**
 * CollegeListMap — geographic view of the student's college list, shown in the
 * "Your list" strip at the top of Discover.
 *
 * Read-only US map (baked Albers paths). Each school on the list is a pin at its
 * real location: coordinates are projected at add-time and stored on the list
 * entry (app.mapX / mapY), so a pin is just a <circle> — no lookup needed here.
 * Hovering a pin names the school; co-located pins fan out to stay visible.
 * States holding schools from the list are faintly tinted; hovering one
 * deepens the tint and lists its schools. `highlightState` deepens one state
 * from outside (the in-state pill); `highlightAll`, every state with schools.
 * A school added while the map is on screen drops its pin in, so adding from a
 * card below visibly lands somewhere.
 *
 * Bare by design: no card, title or legend. The strip around it carries the
 * reach / match / safety counts in the same colors.
 */

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { C, MODULE_COLORS } from '../lib/designTokens'
import { CATEGORY_META, type ApplicationEntry, type AppCategory } from '../data/applicationsChecklist'
import { US_STATES, US_MAP_VIEWBOX, STATE_NAMES } from '../data/usStatesGeo'
import { schoolDisplay } from '../lib/schoolDisplay'
import { CollegeLogo } from './moduleUI'

// Theme-aware (see index.css): parchment land in light, warm dark in dark mode.
const LAND_FILL = 'var(--map-land)'
const STROKE = 'var(--map-stroke)'
// States with schools on the list, tinted toward the Applications purple:
// faintly at rest, deeper when highlighted.
const LAND_LISTED = `color-mix(in srgb, var(--map-land), ${MODULE_COLORS.applications} 12%)`
const LAND_ACTIVE = `color-mix(in srgb, var(--map-land), ${MODULE_COLORS.applications} 30%)`
/** Grace period before a pin's hover clears, so crossing the gaps between fanned-out pins doesn't flicker. */
const PIN_LEAVE_MS = 150
const MAX_STATE_LIST = 6
const TIP_MAX_W = 260


interface Pin {
  id: string
  name: string
  logoUrl?: string | null
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

/**
 * The state outlines: ~140k characters of path data, so this layer is memoized
 * and only re-renders when the highlighted state (or the listed set) changes,
 * never on mouse movement. Handlers must be stable for that to hold.
 */
const StatesLayer = memo(function StatesLayer({ listed, activeCode, onEnter, onMove, onLeave }: {
  listed: Set<string>
  /** A state code, or 'all' for every listed state. */
  activeCode: string | null
  onEnter: (code: string, e: ReactMouseEvent) => void
  onMove: (e: ReactMouseEvent) => void
  onLeave: () => void
}) {
  return (
    <g>
      {US_STATES.map((s) => {
        const isListed = listed.has(s.code)
        return (
          <path
            key={s.code}
            d={s.d}
            fill={!isListed ? LAND_FILL : activeCode === 'all' || s.code === activeCode ? LAND_ACTIVE : LAND_LISTED}
            stroke={STROKE}
            strokeWidth={0.8}
            style={{ pointerEvents: isListed ? 'auto' : 'none', transition: 'fill 0.15s ease' }}
            onMouseEnter={isListed ? (e) => onEnter(s.code, e) : undefined}
            onMouseMove={isListed ? onMove : undefined}
            onMouseLeave={isListed ? onLeave : undefined}
          />
        )
      })}
    </g>
  )
})

export default function CollegeListMap({
  apps,
  selectedId = null,
  highlightState = null,
  highlightAll = false,
  schoolStates,
  onPinHover,
  onPinClick,
}: {
  apps: ApplicationEntry[]
  /** Two-letter state to highlight, e.g. the home state from its pill. */
  highlightState?: string | null
  /** Highlight every state with schools on the list (the states pill). */
  highlightAll?: boolean
  /** collegeId → state, as resolved by the caller (so the map and the strip agree on each school's state). */
  schoolStates?: Map<string, string>
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
          logoUrl: schoolDisplay(app).logoUrl,
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

  // Schools on the list, grouped by state, for the state hover.
  const byState = useMemo(() => {
    const m = new Map<string, Array<{ id: string; name: string; logoUrl?: string | null }>>()
    for (const app of apps) {
      const st = (schoolStates?.get(app.collegeId) ?? app.state ?? '').toUpperCase()
      if (!st) continue
      const list = m.get(st) ?? []
      const d = schoolDisplay(app)
      list.push({ id: app.collegeId, name: d.name, logoUrl: d.logoUrl })
      m.set(st, list)
    }
    return m
  }, [apps, schoolStates])
  const listed = useMemo(() => new Set(byState.keys()), [byState])

  // Pins on the map when it first rendered just appear; ones added afterwards
  // drop in. The animation only plays when a circle mounts, so a pin keeps the
  // class harmlessly after landing.
  const [initialIds] = useState(() => new Set(pins.map((p) => p.id)))

  // What's hovered lives in state (it changes rarely). Where the cursor is
  // lives in a ref and moves the tooltip directly, at most once per frame, so
  // mouse movement never re-renders the map.
  const [hoverPinId, setHoverPinId] = useState<string | null>(null) // by id, so list changes can't shift it
  const [hoverCode, setHoverCode] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const cursor = useRef({ x: 0, y: 0 }) // viewport coordinates
  const frame = useRef<number | null>(null)

  // Position the tooltip beside the cursor. Measures the map and the tooltip
  // each time (once per frame at most), so scrolling or resizing mid-hover
  // can't leave it offset. Flips left or up when it would overflow the map.
  const place = useCallback(() => {
    const el = tipRef.current
    const wrap = wrapRef.current
    if (!el || !wrap) return
    const r = wrap.getBoundingClientRect()
    const x = cursor.current.x - r.left
    const y = cursor.current.y - r.top
    const flipX = x + 14 + el.offsetWidth > r.width
    const flipY = y + 14 + el.offsetHeight > r.height && y - 14 - el.offsetHeight >= 0
    el.style.left = `${flipX ? x - 14 : x + 14}px`
    el.style.top = `${flipY ? y - 14 : y + 14}px`
    el.style.transform = `translate(${flipX ? '-100%' : '0'}, ${flipY ? '-100%' : '0'})`
  }, [])
  const onFrame = useCallback(() => { frame.current = null; place() }, [place])
  const moveTo = useCallback((e: ReactMouseEvent) => {
    cursor.current = { x: e.clientX, y: e.clientY }
    if (frame.current == null) frame.current = requestAnimationFrame(onFrame)
  }, [onFrame])
  // A tooltip that just mounted (or changed content) starts at the cursor.
  useLayoutEffect(place, [place, hoverPinId, hoverCode])

  const enterState = useCallback((code: string, e: ReactMouseEvent) => { moveTo(e); setHoverCode(code) }, [moveTo])
  const leaveState = useCallback(() => setHoverCode(null), [])

  // Leaving a pin clears its hover after a short grace period; entering another
  // pin (or leaving the map) cancels it.
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelPinLeave = () => { if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null } }
  const schedulePinLeave = () => {
    cancelPinLeave()
    leaveTimer.current = setTimeout(() => { leaveTimer.current = null; setHoverPinId(null); onPinHover?.(null) }, PIN_LEAVE_MS)
  }
  useEffect(() => () => {
    cancelPinLeave()
    if (frame.current != null) cancelAnimationFrame(frame.current)
  }, [])

  // A hover on something that has since left the list counts as no hover.
  const hoveredPin = hoverPinId ? pins.find((p) => p.id === hoverPinId) ?? null : null
  const hoveredCode = hoverCode && listed.has(hoverCode) ? hoverCode : null
  const stateList = !hoveredPin && hoveredCode ? byState.get(hoveredCode) : undefined
  const activeCode = hoveredCode ?? (highlightAll ? 'all' : highlightState)

  return (
    <div>
      <div
        ref={wrapRef}
        style={{ position: 'relative' }}
        onMouseLeave={() => { cancelPinLeave(); setHoverPinId(null); setHoverCode(null); onPinHover?.(null) }}
      >
        <svg viewBox={US_MAP_VIEWBOX} width="100%" style={{ display: 'block' }} role="img" aria-label="US map of your college list">
          {/* base map */}
          <StatesLayer listed={listed} activeCode={activeCode} onEnter={enterState} onMove={moveTo} onLeave={leaveState} />
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
            {pins.map((p) => {
              const active = hoverPinId === p.id || selectedId === p.id
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
                  onMouseEnter={(e) => { cancelPinLeave(); moveTo(e); setHoverPinId(p.id); onPinHover?.(p.id) }}
                  onClick={() => onPinClick?.(p.id)}
                  onMouseLeave={schedulePinLeave}
                  onMouseMove={moveTo}
                />
              )
            })}
          </g>
        </svg>

        {(hoveredPin || stateList) && (
          <div
            ref={tipRef}
            style={{
              position: 'absolute', width: 'max-content', maxWidth: TIP_MAX_W, minWidth: stateList ? 160 : undefined,
              pointerEvents: 'none', zIndex: 5,
              background: C.white, border: `1px solid ${C.borderStrong}`, borderRadius: 8, boxShadow: C.shadow2,
              padding: '8px 10px',
            }}
          >
            {hoveredPin ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <CollegeLogo logoUrl={hoveredPin.logoUrl} name={hoveredPin.name} size={20} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, color: C.text }}>{hoveredPin.name}</div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: CATEGORY_META[hoveredPin.category].color, marginTop: 1 }}>
                    {CATEGORY_META[hoveredPin.category].label}
                  </div>
                  {(hoveredPin.city || hoveredPin.state) && (
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted, marginTop: 1 }}>
                      {[hoveredPin.city, hoveredPin.state].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ) : stateList && hoveredCode ? (
              <>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, color: C.text }}>
                  {STATE_NAMES[hoveredCode] ?? hoveredCode} <span style={{ fontWeight: 400, color: C.textMuted }}>· {stateList.length} {stateList.length === 1 ? 'school' : 'schools'}</span>
                </div>
                {stateList.slice(0, MAX_STATE_LIST).map((sc) => (
                  <div key={sc.id} style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5, fontFamily: "'Outfit',sans-serif", fontSize: 11.5, color: C.text }}>
                    <CollegeLogo logoUrl={sc.logoUrl} name={sc.name} size={16} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sc.name}</span>
                  </div>
                ))}
                {stateList.length > MAX_STATE_LIST && (
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted, marginTop: 4 }}>+{stateList.length - MAX_STATE_LIST} more</div>
                )}
              </>
            ) : null}
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
