/**
 * DeadlineTimeline — the application season as one horizontal line, with each
 * school's logo pinned on its deadline and a marker for today. Shows at a
 * glance whether deadlines are spread out or bunched into the same fortnight.
 *
 * The line covers the season itself: from the month before the first deadline
 * to the end of the month holding the last, at least three months wide. When
 * the season is still a long way off (a junior looking at next year), today
 * gets a short stub on the left with the gap written across it, instead of a
 * year of empty axis pushing every deadline into the right-hand corner.
 *
 * Deadlines closer together than a pin's width stack; past MAX_STACK, the top
 * of the stack becomes a "+N" bubble that opens a list of the whole group.
 */

import { useEffect, useRef, useState } from 'react'
import { C, MODULE_COLORS } from '../lib/designTokens'
import { CollegeLogo } from './moduleUI'
import { daysLabel, urgencyColor } from '../data/applicationDeadlines'

const MC = MODULE_COLORS.applications
const font = "'Outfit',sans-serif"

export interface TimelineItem {
  id: string
  name: string
  logoUrl?: string | null
  emoji: string
  date: Date
  dateDisplay: string
  typeLabel: string
  days: number
  /** No date on file for this school; we placed it on the round's usual date. */
  guessed: boolean
}

const MIN_MONTHS = 3
/** First deadline at least this many months out → collapse the gap before it. */
const BREAK_AFTER_MONTHS = 4
/** Width (% of the line) given to the today stub when the gap is collapsed. */
const STUB_PCT = 15
const LANE_H = 34
const PIN = 30
/** Pins closer than this many pixels stack instead of overlapping. */
const MIN_GAP_PX = PIN + 6
/** Most pins stacked in one spot; beyond it the top one becomes "+N". */
const MAX_STACK = 3

const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)
const monthsBetween = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth()

type Placed = TimelineItem & { x: number }

export default function DeadlineTimeline({
  items,
  now,
  onSelect,
}: {
  items: TimelineItem[]
  now: Date
  onSelect: (id: string) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)
  const [openGroup, setOpenGroup] = useState<number | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width || 800))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Close the "+N" list on any click outside it.
  useEffect(() => {
    if (openGroup == null) return
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest?.('.dtl-group')) setOpenGroup(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [openGroup])

  if (items.length === 0) return null

  const sorted = [...items].sort((a, b) => a.date.getTime() - b.date.getTime())
  const thisMonth = monthStart(now)
  const firstMonth = monthStart(sorted[0].date)
  const lastMonth = monthStart(sorted[sorted.length - 1].date)

  const gapMonths = monthsBetween(thisMonth, firstMonth)
  const broken = gapMonths >= BREAK_AFTER_MONTHS
  const start = broken ? addMonths(firstMonth, -1) : thisMonth
  const end = addMonths(start, Math.max(MIN_MONTHS, monthsBetween(start, lastMonth) + 1))
  const axisL = broken ? STUB_PCT : 0
  const span = end.getTime() - start.getTime()
  const pct = (d: Date) => axisL + ((d.getTime() - start.getTime()) / span) * (100 - axisL)
  const months = Array.from({ length: monthsBetween(start, end) }, (_, i) => addMonths(start, i))

  // Group pins that would overlap (each within a pin's width of the previous).
  const gapPct = (MIN_GAP_PX / width) * 100
  const groups: Placed[][] = []
  for (const it of sorted) {
    const x = pct(it.date)
    const g = groups[groups.length - 1]
    if (g && x - g[g.length - 1].x < gapPct) g.push({ ...it, x })
    else groups.push([{ ...it, x }])
  }
  const lanes = Math.min(MAX_STACK, Math.max(...groups.map((g) => g.length)))
  const lineY = lanes * LANE_H + 14
  const todayX = broken ? 2 : pct(now)

  const pin = (it: Placed, lane: number) => {
    const urgent = urgencyColor(it.days)
    const top = lineY - (lane + 1) * LANE_H
    return (
      <button
        key={it.id}
        onClick={() => onSelect(it.id)}
        className="dtl-marker"
        aria-label={`${it.name}, ${it.typeLabel}, ${it.dateDisplay}`}
        title={`${it.name} · ${it.typeLabel} · ${it.dateDisplay} (${daysLabel(it.days)})${it.guessed ? ' · typical date' : ''}`}
        style={{ position: 'absolute', left: `${it.x}%`, top, marginLeft: -PIN / 2, width: PIN, height: lineY - top + 3, padding: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <span style={{ width: PIN, height: PIN, borderRadius: '50%', background: C.white, border: `${urgent ? 2 : 1}px ${it.guessed ? 'dashed' : 'solid'} ${urgent ?? C.borderStrong}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, boxShadow: C.shadow1 }}>
          <CollegeLogo logoUrl={it.logoUrl} emoji={it.emoji} size={18} />
        </span>
        <span style={{ flex: 1, width: 1, background: urgent ?? C.borderStrong }} />
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: urgent ?? C.text, flexShrink: 0 }} />
      </button>
    )
  }

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 22px 12px' }}>
      <div ref={wrapRef} style={{ position: 'relative', height: lineY + 30 }}>
        {broken ? (
          <>
            {/* today stub, then the collapsed gap before the season starts */}
            <div style={{ position: 'absolute', left: `${todayX}%`, width: `${axisL - todayX - 1}%`, top: lineY, borderTop: `1.5px dashed ${C.borderStrong}` }} />
            <span style={{ position: 'absolute', left: `${(todayX + axisL) / 2}%`, top: lineY - 22, transform: 'translateX(-50%)', fontFamily: font, fontSize: 11, color: C.textMuted, whiteSpace: 'nowrap', background: C.surface, padding: '0 4px' }}>
              {gapMonths} months
            </span>
            <span style={{ position: 'absolute', left: 0, top: lineY + 10, fontFamily: font, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', color: MC, textTransform: 'uppercase' }}>Today</span>
            <div style={{ position: 'absolute', left: `${axisL}%`, right: 0, top: lineY, height: 1, background: C.borderStrong }} />
          </>
        ) : (
          <>
            {/* the part of the season already behind you */}
            <div style={{ position: 'absolute', left: 0, width: `${todayX}%`, top: lineY - 1, height: 3, borderRadius: 2, background: `${MC}55` }} />
            <div style={{ position: 'absolute', left: `${todayX}%`, right: 0, top: lineY, height: 1, background: C.borderStrong }} />
          </>
        )}

        {/* month ticks; the year shows on the first month and on each January */}
        {months.map((m, i) => {
          const x = pct(m)
          const withYear = i === 0 || m.getMonth() === 0
          return (
            <div key={m.getTime()} style={{ position: 'absolute', left: `${x}%`, top: lineY - 4, height: 9, width: 1, background: C.borderStrong }}>
              <span style={{ position: 'absolute', top: 14, left: x === 0 ? 0 : -14, fontFamily: font, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', color: C.textMuted, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                {m.toLocaleString('en-US', { month: 'short' })}
                {withYear && <span style={{ fontWeight: 500, color: C.textFaint }}> ’{String(m.getFullYear()).slice(2)}</span>}
              </span>
            </div>
          )
        })}

        {/* today */}
        <div style={{ position: 'absolute', left: `${todayX}%`, top: lineY - 5, width: 11, height: 11, marginLeft: -5.5, borderRadius: '50%', background: MC, boxShadow: `0 0 0 3px ${MC}26` }} title="Today" />

        {/* deadlines */}
        {groups.map((g, gi) => {
          if (g.length <= MAX_STACK) return g.map((it, lane) => pin(it, lane))
          const shown = g.slice(0, MAX_STACK - 1)
          const anchor = shown[shown.length - 1].x
          const top = lineY - MAX_STACK * LANE_H
          const hidden = g.length - shown.length
          const open = openGroup === gi
          return [
            ...shown.map((it, lane) => pin(it, lane)),
            <div key={`group-${gi}`} className="dtl-group" style={{ position: 'absolute', left: `${anchor}%`, top, zIndex: open ? 5 : 1 }}>
              <button
                onClick={() => setOpenGroup(open ? null : gi)}
                aria-expanded={open}
                aria-label={`${hidden} more schools with deadlines around ${g[0].dateDisplay}`}
                className="dtl-marker"
                style={{ marginLeft: -PIN / 2, width: PIN, height: PIN, borderRadius: '50%', border: 'none', background: MC, color: '#fff', fontFamily: font, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', boxShadow: C.shadow1 }}
              >
                +{hidden}
              </button>
              {open && (
                <div
                  role="dialog"
                  aria-label={`Deadlines around ${g[0].dateDisplay}`}
                  style={{ position: 'absolute', top: PIN + 8, left: 0, transform: `translateX(-${anchor}%)`, width: 250, background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: C.shadow3, padding: 6 }}
                >
                  {g.map((it) => {
                    const urgent = urgencyColor(it.days)
                    return (
                      <button
                        key={it.id}
                        onClick={() => { setOpenGroup(null); onSelect(it.id) }}
                        className="ast-row"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}
                      >
                        <CollegeLogo logoUrl={it.logoUrl} emoji={it.emoji} size={20} />
                        <span style={{ flex: 1, minWidth: 0, fontFamily: font, fontSize: 12.5, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</span>
                        <span style={{ fontFamily: font, fontSize: 11.5, color: urgent ?? C.textMuted, fontWeight: urgent ? 600 : 400, whiteSpace: 'nowrap' }}>{it.dateDisplay.replace(/,\s*\d{4}$/, '')}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>,
          ]
        })}
      </div>
    </div>
  )
}
