/**
 * Modal keyboard/focus behaviour, shared by the College List and Discover
 * popups so the two can't drift apart.
 *
 * Handles the three things a `role="dialog"` needs beyond the ARIA attributes:
 * Escape to close, focus moved into the dialog on open (and restored to the
 * trigger on close), and Tab cycling kept inside it.
 */

import { useEffect, useRef } from 'react'

/** Elements that can hold focus, in DOM order. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useModalA11y<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null)

  // Move focus in on open; put it back where it came from on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    // Focus the container (it carries tabIndex={-1}), not the first control.
    // Both dialogs hold substantial scrollable content, which is the case the
    // ARIA APG says to focus the container for — it also means a screen reader
    // announces the dialog's aria-label instead of opening on "Close, button".
    ref.current?.focus()
    return () => previous?.focus?.()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const node = ref.current
      if (!node) return
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (items.length === 0) { e.preventDefault(); node.focus(); return }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      // Wrap at both ends, and pull focus back in if it has escaped the dialog.
      if (e.shiftKey && (active === first || !node.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !node.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return ref
}
