/**
 * Shared presentational primitives for module shells.
 *
 * These small building blocks (progress bar, section label, status tag,
 * checklist ring, check glyph) were previously copy-pasted across every
 * module. Keep them here so a visual tweak applies everywhere at once.
 */

import { useState, type CSSProperties, type ReactNode } from 'react'
import type { ChecklistItemStatus } from '../lib/moduleProgress'
import { C } from '../lib/designTokens'
import { MODULE_ICONS } from './moduleIcons'

const SANS = "'Outfit',sans-serif"

/**
 * School logo with graceful emoji fallback. There is no logo column anywhere —
 * `logoUrl` is built client-side from the school's domain (see lib/collegeLogo),
 * so it is null whenever the domain or the logo.dev token is missing, and the
 * image can still 404 for a school the service has never seen. Both paths land
 * on the fallback: the emoji when the caller passes one, otherwise the first
 * letter of `name` on a soft tile (for surfaces that avoid emoji).
 */
export const CollegeLogo = ({
  logoUrl,
  emoji,
  name,
  size = 24,
}: {
  logoUrl?: string | null
  emoji?: string
  /** Used for a letter monogram when there's no logo and no emoji. */
  name?: string
  size?: number
}) => {
  const [failed, setFailed] = useState(false)
  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: 5, flexShrink: 0 }}
      />
    )
  }
  if (!emoji) {
    return (
      <span aria-hidden style={{ width: size, height: size, borderRadius: Math.max(5, size * 0.22), flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(var(--line-rgb), 0.08)', color: 'rgba(var(--ink-rgb), 0.55)', fontFamily: "'Young Serif',serif", fontSize: Math.round(size * 0.52), lineHeight: 1 }}>
        {(name ?? '').replace(/^(the|university of)\s+/i, '').trim().charAt(0).toUpperCase() || '·'}
      </span>
    )
  }
  return <span style={{ fontSize: size - 2, lineHeight: 1, width: size, textAlign: 'center', flexShrink: 0 }}>{emoji}</span>
}

/** Condense the DB's verbose ownership string ("Private nonprofit") to a label. */
const shortSchoolType = (type: string): string => {
  const t = (type || '').toLowerCase()
  if (t.includes('public')) return 'Public'
  if (t.includes('for-profit')) return 'For-profit'
  return 'Private'
}

/** One readable meta pill (used for school type and state). */
export const MetaChip = ({ children, size = 11 }: { children: ReactNode; size?: number }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', fontFamily: "'Outfit',sans-serif", fontSize: size, fontWeight: 500, color: 'rgba(var(--ink-rgb), 0.66)', background: 'rgba(var(--line-rgb), 0.055)', border: '1px solid rgba(var(--line-rgb), 0.09)', borderRadius: 6, padding: '1px 7px', whiteSpace: 'nowrap', lineHeight: 1.5 }}>
    {children}
  </span>
)

/**
 * School ownership and state as two separate, readable chips. Replaces the
 * faint inline "Private nonprofit · CT" text that was hard to read on cards.
 */
export const CollegeMeta = ({ type, state, size = 11 }: { type: string; state: string; size?: number }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
    <MetaChip size={size}>{shortSchoolType(type)}</MetaChip>
    {state ? <MetaChip size={size}>{state}</MetaChip> : null}
  </span>
)

/** Thin progress bar. `value` is 0–1 and is clamped so it never overflows. */
export const Bar = ({ value, color, height = 4 }: { value: number; color: string; height?: number }) => (
  <div style={{ width: '100%', height, borderRadius: height, background: 'rgba(var(--line-rgb), 0.10)', overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(value * 100, 100)}%`, height: '100%', borderRadius: height, background: color, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
  </div>
)

export const SecLabel = (
  { children, style = {}, className }:
  { children: ReactNode; style?: CSSProperties; className?: string },
) => (
  <div className={className} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, color: 'rgba(var(--ink-rgb), 0.40)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, ...style }}>{children}</div>
)

export const Tag = ({ label, color, bg }: { label: string; color: string; bg?: string }) => (
  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 600, color, background: bg || `${color}15`, padding: '2px 8px', borderRadius: 99, border: `1px solid ${color}28`, whiteSpace: 'nowrap' }}>{label}</span>
)

export const Ring = ({ status, color }: { status: ChecklistItemStatus; color: string }) => {
  if (status === 'completed') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: color, color: '#fff', flexShrink: 0, fontSize: 12 }}>✓</span>
  )
  if (status === 'in-progress') return (
    // Started: half filled, standing still. It used to spin, which read as loading.
    <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: `2px solid ${color}`, background: `linear-gradient(90deg, ${color} 50%, transparent 50%)`, display: 'inline-block' }} />
  )
  return <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: '1.5px solid rgba(var(--line-rgb), 0.18)', display: 'inline-block' }} />
}

export const Check = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7l3 3 5-5" />
  </svg>
)

/** A tinted note with an icon: a grade's priority, a nudge to finish the profile. */
export const Callout = ({ icon, title, body, color, bg }: { icon: ReactNode; title?: string | null; body: ReactNode; color: string; bg?: string }) => (
  <div style={{ padding: '12px 15px', borderRadius: 10, background: bg || `${color}0D`, border: `1px solid ${color}22`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
    <span style={{ display: 'flex', flexShrink: 0, marginTop: 2, color }}>{icon}</span>
    <div>
      {title && <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color, marginBottom: 2 }}>{title}</div>}
      <div style={{ fontFamily: SANS, fontSize: 12, color: C.text, lineHeight: 1.55 }}>{body}</div>
    </div>
  </div>
)

/**
 * A box of key dates: Financial Aid's FAFSA and CSS Profile, Application
 * Tracking's rounds. With `open` it expands onto `children`; without, it
 * doesn't, and the click goes wherever those details live.
 */
export const DateBox = ({ color, title, dates, summary, open, onClick, children }: {
  color: string
  title: string
  dates: string
  summary: string
  open?: boolean
  onClick: () => void
  children?: ReactNode
}) => (
  // Longhands only, as in GuideRow: the shorthand would wipe the colored edge.
  <div style={{ borderStyle: 'solid', borderWidth: '1px 1px 1px 3px', borderColor: `${C.border} ${C.border} ${C.border} ${color}`, borderRadius: 10, overflow: 'hidden', background: C.surface, boxShadow: C.shadow1 }}>
    <button
      onClick={onClick}
      aria-expanded={open}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', background: open ? `${color}0D` : C.surface, border: 'none', borderBottom: open ? `1px solid ${color}25` : 'none', cursor: 'pointer', textAlign: 'left' }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: "'Young Serif',serif", fontSize: 16, color }}>{title}</span>
        <span style={{ display: 'block', fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: C.text, marginTop: 3 }}>{dates}</span>
        <span style={{ display: 'block', fontFamily: SANS, fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 1.45 }}>{summary}</span>
      </span>
      <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease', color: C.textMuted, display: 'flex', flexShrink: 0 }}>{MODULE_ICONS.chevron}</span>
    </button>
    {open && <div style={{ padding: '0 14px 12px' }}>{children}</div>}
  </div>
)

/* ─── guide rows: the Overview tabs' "know your …" sections ─── */

export const ExtLink = ({ href, children, color }: { href: string; children: ReactNode; color: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color, textDecoration: 'none', whiteSpace: 'nowrap' }}>
    {children} ↗
  </a>
)

/** One entry inside an open row: name and figure on top, the explanation under it. */
export const GuideItem = ({ title, figure, children, links, color, chip }: {
  title: string
  figure?: string
  children: ReactNode
  links?: ReactNode
  color: string
  /** Render the title as a colored chip instead of bold text. */
  chip?: boolean
}) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: SANS, fontSize: 13, lineHeight: 1.4 }}>
        {chip
          ? <span style={{ display: 'inline-block', fontWeight: 700, fontSize: 12, color, background: `${color}15`, border: `1px solid ${color}30`, padding: '1px 9px', borderRadius: 99 }}>{title}</span>
          : <span style={{ fontWeight: 700, color: C.text }}>{title}</span>}
        {figure && <span style={{ fontWeight: 600, color }}> · {figure}</span>}
      </div>
      <div style={{ fontFamily: SANS, fontSize: 12, color: C.textMuted, lineHeight: 1.5, marginTop: 2 }}>{children}</div>
    </div>
    {links && <div style={{ display: 'flex', gap: 10, flexShrink: 0, paddingTop: 1 }}>{links}</div>}
  </div>
)

/** "Edvifi can ___" — one line at the foot of a row, pointing at the tool that does it. */
export const EdvifiCan = ({ can, cta, onClick, color }: { can: string; cta: string; onClick: () => void; color: string }) => (
  // A quiet tinted strip rather than a banner: it should read as the next step,
  // not as an ad, but still be the first thing the eye lands on at the bottom.
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 12, padding: '10px 12px', borderRadius: 9, background: `${color}10`, border: `1px solid ${color}2E`, fontFamily: SANS, fontSize: 13, color: C.text }}>
    <span style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.surface, border: `1px solid ${color}26` }}>
        <img src="/logos/logo-color.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
      </span>
      <span style={{ lineHeight: 1.45 }}><strong style={{ color: C.text, fontWeight: 700 }}>Edvifi</strong> can {can}</span>
    </span>
    <button onClick={onClick} style={{ flexShrink: 0, padding: '7px 13px', borderRadius: 8, border: 'none', background: color, color: '#fff', cursor: 'pointer', fontFamily: SANS, fontSize: 12, fontWeight: 600 }}>
      {cta} →
    </button>
  </div>
)

/** A collapsible row in the same shape as the checklist sections. */
export const GuideRow = ({ color, icon, title, summary, tag, open, onToggle, children }: {
  color: string
  icon: ReactNode
  title: string
  summary: string
  tag?: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) => {
  const [hover, setHover] = useState(false)
  const edge = open || hover ? `${color}45` : C.border
  return (
    // Longhands only. Mixing the `border` shorthand with `borderLeft` lets React
    // re-apply the shorthand on toggle and wipe the colored edge.
    <div style={{ marginBottom: 10, borderStyle: 'solid', borderWidth: '1px 1px 1px 3px', borderColor: `${edge} ${edge} ${edge} ${color}`, transition: 'border-color 0.15s ease', borderRadius: 10, overflow: 'hidden', background: C.surface }}>
      <button
        onClick={onToggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-expanded={open}
        style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '11px 14px', background: open || hover ? `${color}0D` : C.surface, transition: 'background 0.15s ease', border: 'none', borderBottom: open ? `1px solid ${color}25` : 'none', cursor: 'pointer', gap: 12, textAlign: 'left' }}
      >
        <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color, background: `${color}18` }}>{icon}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: SANS, fontSize: 13.5, fontWeight: 700, color: C.text }}>{title}</span>
          <span style={{ display: 'block', fontFamily: SANS, fontSize: 12, color: C.textMuted, marginTop: 1 }}>{summary}</span>
        </span>
        {tag && <span style={{ flexShrink: 0, fontFamily: SANS, fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '3px 9px', borderRadius: 99 }}>{tag}</span>}
        <span style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s ease', color: open || hover ? color : C.textMuted, display: 'flex', flexShrink: 0 }}>{MODULE_ICONS.chevron}</span>
      </button>
      {open && <div style={{ padding: '2px 16px 12px' }}>{children}</div>}
    </div>
  )
}

export const GuideIntro = ({ children }: { children: ReactNode }) => (
  <p style={{ fontFamily: SANS, fontSize: 12.5, color: C.text, lineHeight: 1.55, margin: '10px 0 4px' }}>{children}</p>
)
