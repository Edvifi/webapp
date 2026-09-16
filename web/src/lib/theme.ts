/**
 * Theme application — sets `data-theme` on <html> so CSS variables can
 * switch palettes. 'system' follows the OS preference live.
 */

import { useEffect, useState } from 'react'
import type { ThemePref } from '../types/user'

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(pref: ThemePref) {
  const resolved = pref === 'system' ? systemTheme() : pref
  document.documentElement.dataset.theme = resolved
}

/** The theme currently applied to <html>, tracked live. Reads the resolved
 *  `data-theme` (not the preference) so it reflects 'system' too, and updates
 *  when the attribute changes (e.g. the user switches theme in Settings). */
export function useResolvedTheme(): 'light' | 'dark' {
  const read = (): 'light' | 'dark' =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  const [theme, setTheme] = useState<'light' | 'dark'>(read)
  useEffect(() => {
    // Initial value comes from the useState initializer; the observer catches
    // every later change, including App's theme effect setting data-theme after
    // this mounts (parent effects run after children's).
    const obs = new MutationObserver(() => setTheme(read()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return theme
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
