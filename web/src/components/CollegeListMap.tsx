/**
 * CollegeListMap — geographic view of the student's college list.
 *
 * Read-only US map (baked Albers paths, no mapping dependency). States that
 * have schools on the list are shaded in the module accent by count; hovering a
 * state shows the schools located there. Purely a visualization of spread.
 */

import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { C } from '../lib/designTokens'
import { getCollegeById, type CollegeInfo } from '../data/collegeData'
import type { ApplicationEntry } from '../data/applicationsChecklist'
import { useCollegesReady } from '../lib/useColleges'
import { US_STATES, US_MAP_VIEWBOX } from '../data/usStatesGeo'

const EMPTY_FILL = '#E7DECF' // parchment neutral for states with no schools
const STROKE = '#FAF6EE'

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t)

/** Light purple tint → module accent, as t goes 0 → 1. */
function shadeAt(t: number): string {
  const light = [222, 211, 242]
  const accent = [112, 72, 200] // MODULE_COLORS.applications (#7048C8)
  const c = clamp01(t)
  return `rgb(${lerp(light[0], accent[0], c)},${lerp(light[1], accent[1], c)},${lerp(light[2], accent[2], c)})`
}
function shadeFor(count: number, max: number): string {
  if (count <= 0) return EMPTY_FILL
  return shadeAt(max <= 1 ? 1 : count / max)
}

export default function CollegeListMap({ apps }: { apps: ApplicationEntry[] }) {
  const collegesReady = useCollegesReady()

  const byState = useMemo(() => {
    const m = new Map<string, CollegeInfo[]>()
    for (const app of apps) {
      const c = getCollegeById(app.collegeId)
      if (!c || !c.state) continue
      const code = c.state.toUpperCase()
      const arr = m.get(code) ?? []
      arr.push(c)
      m.set(code, arr)
    }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps -- collegesReady signals the module-level colleges cache is populated
  }, [apps, collegesReady])

  const maxCount = useMemo(() => {
    let mx = 0
    for (const list of byState.values()) mx = Math.max(mx, list.length)
    return mx
  }, [byState])

  const [hover, setHover] = useState<{ code: string; x: number; y: number } | null>(null)
  const stateCount = byState.size
  const hoveredSchools = hover ? byState.get(hover.code) ?? [] : []
  const hoveredName = hover ? (US_STATES.find((s) => s.code === hover.code)?.name ?? hover.code) : ''

  const track = (e: ReactMouseEvent<SVGPathElement>, code: string) => {
    const wrapper = e.currentTarget.ownerSVGElement?.parentElement
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()
    setHover({ code, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div style={{ marginBottom: 22, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>Where your schools are</h3>
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted }}>
          {stateCount} {stateCount === 1 ? 'state' : 'states'}
        </span>
      </div>

      <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }} onMouseLeave={() => setHover(null)}>
        <svg viewBox={US_MAP_VIEWBOX} width="100%" style={{ display: 'block' }} role="img" aria-label="US map of your college list">
          {US_STATES.map((s) => {
            const count = byState.get(s.code)?.length ?? 0
            const dim = hover != null && hover.code !== s.code
            return (
              <path
                key={s.code}
                d={s.d}
                fill={shadeFor(count, maxCount)}
                stroke={STROKE}
                strokeWidth={0.8}
                style={{ cursor: count ? 'pointer' : 'default', transition: 'fill 0.2s ease, opacity 0.2s ease', opacity: dim ? 0.88 : 1 }}
                onMouseEnter={(e) => track(e, s.code)}
                onMouseMove={(e) => track(e, s.code)}
              />
            )
          })}
        </svg>

        {hover && (
          <div
            style={{
              position: 'absolute', left: hover.x + 14, top: hover.y + 14, pointerEvents: 'none', zIndex: 5,
              background: C.white, border: `1px solid ${C.borderStrong}`, borderRadius: 8, boxShadow: C.shadow2,
              padding: '8px 10px', maxWidth: 220,
            }}
          >
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, color: C.text, marginBottom: hoveredSchools.length ? 5 : 0 }}>
              {hoveredName}{hoveredSchools.length ? ` · ${hoveredSchools.length}` : ''}
            </div>
            {hoveredSchools.length === 0 ? (
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>No schools on your list</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {hoveredSchools.slice(0, 6).map((c) => (
                  <span key={c.id} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>{c.name}</span>
                ))}
                {hoveredSchools.length > 6 && (
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint }}>+{hoveredSchools.length - 6} more</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint }}>Fewer</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <span key={t} style={{ width: 18, height: 10, borderRadius: 2, background: shadeAt(t) }} />
          ))}
        </div>
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint }}>More</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 10, borderRadius: 2, background: EMPTY_FILL, border: `1px solid ${C.border}` }} />
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint }}>No schools</span>
        </span>
      </div>
    </div>
  )
}
