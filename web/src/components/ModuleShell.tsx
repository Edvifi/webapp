/**
 * ModuleShell — the full-screen chrome shared by module views.
 *
 * Renders the overlay, the "← Dashboard / <label> · <tab> / <page>" breadcrumb,
 * the sidebar (passed in as `nav`) beside a scrollable content area, and the
 * module tour overlay. Owns Escape: it steps back out of an open page, else
 * closes the module. Modules supply their own nav, content, and tour element.
 *
 * The layout is inline-styled, which a media query cannot reach, so the parts
 * that have to change shape on a phone carry class names too. The inline rules
 * stay the desktop truth; `index.css` overrides only what a narrow screen
 * needs — the nav going from a column beside the content to a strip above it.
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { C, YEARS } from '../lib/designTokens'
import { MODULE_ICONS } from './moduleIcons'
import { useIsNarrow } from '../lib/useMediaQuery'

interface Props {
  open: boolean
  onClose: () => void
  breadcrumbLabel: string
  /** The open tab, after the module's name, as Financial Aid shows it. */
  tabLabel?: string
  /** A page open inside the tab (one school's), after the tab. */
  pageLabel?: string
  /** Close that page. The tab's crumb and Escape both do this, rather than
   *  closing the module. */
  onBack?: () => void
  /** Sidebar. Omit for a nav-less module (content fills the full width). */
  nav?: ReactNode
  children: ReactNode
  tour?: ReactNode
  /** When true the content area is a flex column (for full-height panes like editors). */
  fillContent?: boolean
  /** The student's grade (9–12), shown as a badge at the right of the header. */
  year?: number
  /** The open tab. A new tab starts at its top rather than at the last one's scroll. */
  scrollKey?: string
}

/** The right end of a module header: the year badge and a close button.
 *  Shared with Financial Aid, which draws the rest of its header itself. */
/** A field that takes typing, where Escape belongs to the field (closing a
 *  select's list, abandoning an edit). Not a checkbox or a button: Escape on
 *  one of those still leaves. */
export const TEXT_FIELD = 'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), select, textarea, [contenteditable="true"]'

export function ModuleHeaderEnd({ year, onClose }: { year?: number; onClose: () => void }) {
  const y = year == null ? null : YEARS[year] ?? YEARS[11]
  return (
    <>
      {y && (
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: y.color, background: y.tint, padding: '3px 10px', borderRadius: 99, border: `1px solid ${y.color}20`, whiteSpace: 'nowrap' }}>
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: y.color }} />
          <span>{y.label}<span className="msh-year-word"> Year</span></span>
        </span>
      )}
      <button
        onClick={onClose}
        aria-label="Close"
        style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, width: 30, height: 30, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: y ? 8 : 'auto' }}
      >
        {MODULE_ICONS.close}
      </button>
    </>
  )
}

export default function ModuleShell({ open, onClose, breadcrumbLabel, tabLabel, pageLabel, onBack, nav, children, tour, fillContent, year, scrollKey }: Props) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      // Escape in a field is the field's (closing a select's list, abandoning
      // an edit), not a request to leave: on a school's page it closed the
      // whole module from the status dropdown.
      const t = e.target
      if (t instanceof HTMLElement && t.closest(TEXT_FIELD)) return
      ;(onBack ?? onClose)()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose, onBack])
  // On a phone the tab strip right below already says which tab.
  const narrow = useIsNarrow()

  // The content scrolls on a desktop and the body (nav strip and content
  // together) on a phone, so both go back to the top.
  const bodyRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [scrollKey])

  if (!open) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ position: 'fixed', inset: 0, background: C.bg, zIndex: 100, display: 'flex', flexDirection: 'column' }}
    >
      <div className="msh" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div data-tour="breadcrumb" style={{ padding: '13px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, background: C.surface, flexShrink: 0 }}>
          <button onClick={onClose} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 500, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Dashboard</button>
          <span style={{ color: C.textFaint }}>/</span>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>{breadcrumbLabel}</span>
          {tabLabel && !narrow && <>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textFaint }}>·</span>
            {pageLabel && onBack
              ? <button onClick={onBack} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>{tabLabel}</button>
              : <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, whiteSpace: 'nowrap' }}>{tabLabel}</span>}
            {pageLabel && <>
              <span style={{ color: C.textFaint }}>/</span>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pageLabel}</span>
            </>}
          </>}
          <ModuleHeaderEnd year={year} onClose={onClose} />
        </div>

        <div ref={bodyRef} className="msh-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {nav}
          <div
            ref={contentRef}
            className="msh-content mov-scroll"
            data-tour="content"
            style={{ flex: 1, overflowY: 'auto', ...(fillContent ? { display: 'flex', flexDirection: 'column' } : {}) }}
          >
            {children}
          </div>
        </div>
      </div>

      <AnimatePresence>{tour}</AnimatePresence>
    </motion.div>
  )
}
