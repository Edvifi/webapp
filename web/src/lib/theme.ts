/**
 * Theme application — sets `data-theme` on <html> so CSS variables can
 * switch palettes. 'system' follows the OS preference live.
 */

import { useEffect } from 'react'
import type { ThemePref } from '../types/user'

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(pref: ThemePref) {
  const resolved = pref === 'system' ? systemTheme() : pref
  document.documentElement.dataset.theme = resolved
}

/** Keep the document theme in sync with a preference, following OS changes
 *  while the preference is 'system'. */
export function useThemePref(pref: ThemePref) {
  useEffect(() => {
    applyTheme(pref)
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])
}
