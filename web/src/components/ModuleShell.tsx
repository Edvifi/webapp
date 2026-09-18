/**
 * ModuleShell — the full-screen chrome shared by module views.
 *
 * Renders the overlay, the "← Dashboard / <label>" breadcrumb, the sidebar
 * (passed in as `nav`) beside a scrollable content area, and the module tour
 * overlay. Owns Escape-to-close. Modules supply their own nav, content, and
 * tour element.
 *
 * The layout is inline-styled, which a media query cannot reach, so the parts
 * that have to change shape on a phone carry class names too. The inline rules
 * stay the desktop truth; `index.css` overrides only what a narrow screen
 * needs — the nav going from a column beside the content to a strip above it.
 */

import { useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { C } from '../lib/designTokens'

interface Props {
  open: boolean
  onClose: () => void
  breadcrumbLabel: string
  /** Sidebar. Omit for a nav-less module (content fills the full width). */
  nav?: ReactNode
  children: ReactNode
  tour?: ReactNode
  /** When true the content area is a flex column (for full-height panes like editors). */
  fillContent?: boolean
}

export default function ModuleShell({ open, onClose, breadcrumbLabel, nav, children, tour, fillContent }: Props) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

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
        </div>

        <div className="msh-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {nav}
          <div
            className="msh-content"
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
