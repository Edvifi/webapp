/**
 * A panel that opens beside the thing that triggered it.
 *
 * Used by every surface that shows a deadline — the Overview rail, the
 * calendar's day panel, the week strip — because each has a different trigger
 * (a full-width row, a chip a few characters wide) and the same panel.
 *
 * The panel opens beside its anchor rather than under it: lists live in narrow
 * rails and grid cells, and pushing everything below down by the height of a
 * panel moves whatever the student was reading. The caller portals it to the
 * body, since rails scroll and their ancestors carry transforms, either of
 * which would clip the panel or leave it behind.
 *
 * Position is measured in the click handler, not in an effect after mount: the
 * trigger is already on screen when it is clicked, so there is nothing to wait
 * for and no frame where the panel is drawn in the wrong place.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/** Width of the panel, and the gap between it and its anchor. */
export const PANEL_W = 320
const PANEL_GAP = 10
/** Below this there is no room beside anything; the panel becomes a sheet. */
const SHEET_MAX = 760

export interface PanelPos { top: number; left: number }

/**
 * Where the panel goes, given what it opens from. Null means "no room beside
 * it" — the caller's CSS lays it out as a sheet instead.
 */
function place(anchor: HTMLElement | null): PanelPos | null {
  if (!anchor || typeof window === 'undefined' || window.innerWidth <= SHEET_MAX) return null
  const r = anchor.getBoundingClientRect()
  // Rails sit on the right, so the natural side is the left. Falls back to the
  // right, then to whatever fits.
  let left = r.left - PANEL_W - PANEL_GAP
  if (left < 8) left = Math.min(r.right + PANEL_GAP, window.innerWidth - PANEL_W - 8)
  return { top: Math.max(8, Math.min(r.top, window.innerHeight - 280)), left }
}

export function useAnchoredPanel<T extends HTMLElement>() {
  const anchorRef = useRef<T | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<PanelPos | null>(null)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => {
    setPos(place(anchorRef.current))
    setOpen((v) => !v)
  }, [])

  useEffect(() => {
    if (!open) return
    const reposition = () => setPos(place(anchorRef.current))
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !anchorRef.current?.contains(t)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', reposition)
    // Capture: the rail is what actually scrolls, not the window.
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open])

  return { anchorRef, panelRef, open, pos, toggle, close, setOpen }
}
