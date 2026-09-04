/**
 * Shared presentational primitives for module shells.
 *
 * These small building blocks (progress bar, section label, status tag,
 * checklist ring, check glyph) were previously copy-pasted across every
 * module. Keep them here so a visual tweak applies everywhere at once.
 */

import { useState, type CSSProperties, type ReactNode } from 'react'
import type { ChecklistItemStatus } from '../lib/moduleProgress'

/**
 * School logo with graceful emoji fallback. Shows the DB logo_url when it
 * loads; on error (or when absent) falls back to the college's emoji glyph.
 */
export const CollegeLogo = ({
  logoUrl,
  emoji,
  size = 24,
}: {
  logoUrl?: string | null
  emoji: string
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

export const SecLabel = ({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) => (
  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, color: 'rgba(var(--ink-rgb), 0.40)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, ...style }}>{children}</div>
)

export const Tag = ({ label, color, bg }: { label: string; color: string; bg?: string }) => (
  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 600, color, background: bg || `${color}15`, padding: '2px 8px', borderRadius: 99, border: `1px solid ${color}28`, whiteSpace: 'nowrap' }}>{label}</span>
)

export const Ring = ({ status, color }: { status: ChecklistItemStatus; color: string }) => {
  if (status === 'completed') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: color, color: '#fff', flexShrink: 0, fontSize: 12 }}>✓</span>
  )
  if (status === 'in-progress') return (
    <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: `2.5px solid ${color}`, borderTopColor: 'transparent', display: 'inline-block', animation: 'module-spin 1s linear infinite' }} />
  )
  return <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: '1.5px solid rgba(var(--line-rgb), 0.18)', display: 'inline-block' }} />
}

export const Check = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7l3 3 5-5" />
  </svg>
)
