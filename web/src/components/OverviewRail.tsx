/**
 * OverviewRail — the deadline rail beside a module's Overview, collapsible the
 * same way the dashboard's is.
 *
 * Open state is the dashboard's own, passed down, so collapsing the rail in a
 * module collapses it on the dashboard too and the student meets one setting,
 * not four.
 *
 * Collapsed, the aside keeps rendering at zero width so the toggle has an edge
 * to sit on. On a phone the rail stacks under the checklist and there is no
 * edge to collapse toward, so `index.css` shows it regardless.
 */

import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onToggle: () => void
  children: ReactNode
}

/** The round edge button that collapses a rail. Shared with the dashboard's. */
export function RailToggle({ open, onClick, className }: { open: boolean; onClick: () => void; className: string }) {
  return (
    <button
      className={className}
      onClick={onClick}
      aria-expanded={open}
      title={open ? 'Collapse sidebar' : 'Expand sidebar'}
      aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        {open ? (
          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M9 3l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  )
}

export default function OverviewRail({ open, onToggle, children }: Props) {
  return (
    <aside className={`mov-aside ${open ? '' : 'mov-aside--collapsed'}`}>
      <RailToggle className="mov-rail-toggle" open={open} onClick={onToggle} />
      <div className="mov-aside-body">{children}</div>
    </aside>
  )
}
