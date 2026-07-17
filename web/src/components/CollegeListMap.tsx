/**
 * CollegeListMap — geographic view of the student's college list.
 *
 * Read-only US map (baked Albers paths, no mapping dependency). Each school on
 * the list is a pin at its real location: the ingest projects every school's
 * lon/lat onto this SVG's coordinate space once (colleges.map_x / map_y), so a
 * pin is just a <circle> at (mapX, mapY). Hovering a pin names the school.
 */

import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { C } from '../lib/designTokens'
import { getCollegeById, type CollegeInfo } from '../data/collegeData'
import { CATEGORY_META, type ApplicationEntry, type AppCategory } from '../data/applicationsChecklist'
import { useCollegesReady } from '../lib/useColleges'
import { US_STATES, US_MAP_VIEWBOX } from '../data/usStatesGeo'

const LAND_FILL = '#EDE4D5' // parchment land
const STROKE = '#FAF6EE'
/** Legend order: the three real bands, then unranked. */
const LEGEND_ORDER: AppCategory[] = ['reach', 'match', 'safety', 'unranked']

interface Pin {
  college: CollegeInfo
  x: number
  y: number
  category: AppCategory
}

export default function CollegeListMap({ apps }: { apps: ApplicationEntry[] }) {
  const collegesReady = useCollegesReady()

  const { pins, states, unmapped, usedCategories } = useMemo(() => {
    const pins: Pin[] = []
    const states = new Set<string>()
    const usedCategories = new Set<AppCategory>()
    let unmapped = 0
    for (const app of apps) {
      const c = getCollegeById(app.collegeId)
      if (!c) continue
      if (c.state) states.add(c.state.toUpperCase())
      usedCategories.add(app.category)
      if (c.mapX != null && c.mapY != null) pins.push({ college: c, x: c.mapX, y: c.mapY, category: app.category })
      else unmapped++
    }
    return { pins, states, unmapped, usedCategories }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- collegesReady signals the module-level colleges cache is populated
  }, [apps, collegesReady])

  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null)

  const track = (e: ReactMouseEvent, i: number) => {
    const wrapper = (e.currentTarget as SVGElement).ownerSVGElement?.parentElement
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()
    setHover({ i, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const hoveredPin = hover ? pins[hover.i] : null
  const hovered = hoveredPin?.college ?? null

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
          {/* pins — colored by reach / match / safety */}
          <g>
            {pins.map((p, i) => {
              const active = hover?.i === i
              return (
                <circle
                  key={p.college.id}
                  cx={p.x}
                  cy={p.y}
                  r={active ? 9 : 7}
                  fill={CATEGORY_META[p.category].color}
                  stroke="#fff"
                  strokeWidth={2}
                  style={{ cursor: 'pointer', transition: 'r 0.12s ease', opacity: 0.92 }}
                  onMouseEnter={(e) => track(e, i)}
                  onMouseMove={(e) => track(e, i)}
                />
              )
            })}
          </g>
        </svg>

        {hover && hovered && hoveredPin && (
          <div
            style={{
              position: 'absolute', left: hover.x + 14, top: hover.y + 14, pointerEvents: 'none', zIndex: 5,
              background: C.white, border: `1px solid ${C.borderStrong}`, borderRadius: 8, boxShadow: C.shadow2,
              padding: '8px 10px', maxWidth: 240,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_META[hoveredPin.category].color, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, color: C.text }}>{hovered.name}</span>
            </div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted, marginTop: 2, paddingLeft: 14 }}>
              {[CATEGORY_META[hoveredPin.category].label, hovered.city, hovered.state].filter(Boolean).join(' · ')}
            </div>
          </div>
        )}
      </div>

      {/* legend + territory note */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 12 }}>
        {LEGEND_ORDER.filter((cat) => usedCategories.has(cat)).map((cat) => (
          <span key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: CATEGORY_META[cat].color, border: '1.5px solid #fff', boxShadow: '0 0 0 1px rgba(60,35,10,0.12)' }} />
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
