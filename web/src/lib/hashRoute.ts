/**
 * Where the student is, kept in the URL hash so a refresh doesn't drop them
 * back on the dashboard, and the browser's back and forward buttons move
 * between pages, modules and tabs: `#/<page>[/<module>[/<tab>]]`, e.g.
 * `#/dashboard/application-tracking/discover`.
 *
 * A cheap stand-in for a router: deeper state (an open school, a calendar
 * day, a scholarship's detail) still resets on refresh.
 *
 * Only hashes starting with `#/` are ours. Supabase puts sign-in and
 * password-recovery tokens in the hash, and those are never touched.
 */
import { useEffect, useState } from 'react'

export const PAGES = ['dashboard', 'timeline', 'calendar', 'profile', 'settings'] as const
export type Page = (typeof PAGES)[number]

/** Module keys as Dashboard names them → their URL slug. */
const MODULE_SLUGS: Record<string, string> = {
  'Knowledge Library': 'knowledge-library',
  'Financial Aid': 'financial-aid',
  'College Essays': 'college-essays',
  'Application Tracking': 'application-tracking',
}

export interface Route {
  page: Page
  /** Dashboard's module key ('Financial Aid'), or null when none is open. */
  module: string | null
  tab: string | null
}

const ours = (hash: string) => hash === '' || hash === '#' || hash.startsWith('#/')

export function readRoute(hash: string = window.location.hash): Route {
  if (!hash.startsWith('#/')) return { page: 'dashboard', module: null, tab: null }
  const [page, slug, tab] = hash.slice(2).split('/').map(decodeURIComponent)
  const module = Object.keys(MODULE_SLUGS).find((k) => MODULE_SLUGS[k] === slug) ?? null
  return {
    page: (PAGES as readonly string[]).includes(page) ? (page as Page) : 'dashboard',
    module,
    tab: module && tab ? tab : null,
  }
}

export function formatRoute({ page, module, tab }: Route): string {
  const slug = module ? MODULE_SLUGS[module] : undefined
  return `#/${page}${slug ? `/${slug}${tab ? `/${encodeURIComponent(tab)}` : ''}` : ''}`
}

/** Write the route, adding a history entry. Leaves a hash that isn't ours alone. */
export function writeRoute(route: Route): void {
  const next = formatRoute(route)
  if (window.location.hash === next || !ours(window.location.hash)) return
  window.location.hash = next
}

/**
 * A module's tab, restored from and written to the URL while the module is
 * open. `routedTab` is what to open on: the URL's tab when it names this
 * module and a valid tab, else null (use the module's own default).
 */
export function routedTab<T extends string>(moduleKey: string, valid: readonly T[]): T | null {
  const r = readRoute()
  return r.module === moduleKey && (valid as readonly string[]).includes(r.tab ?? '') ? (r.tab as T) : null
}

export function useRoutedTab<T extends string>(
  moduleKey: string,
  open: boolean,
  valid: readonly T[],
  fallback: T,
): [T, (t: T) => void] {
  const [tab, setTab] = useState<T>(() => (open && routedTab(moduleKey, valid)) || fallback)
  useEffect(() => {
    if (!open) return
    const r = readRoute()
    // The default tab right after opening stays implied, or Back would need an
    // extra press to leave a tab nobody picked.
    if (r.module === moduleKey && r.tab !== tab && !(r.tab == null && tab === fallback)) writeRoute({ ...r, tab })
  }, [open, tab, moduleKey, fallback])
  useEffect(() => {
    if (!open) return
    // Back or forward within this module: its tab, or the default when the
    // entry has none (the one made when the module opened).
    const onHash = () => { if (readRoute().module === moduleKey) setTab(routedTab(moduleKey, valid) ?? fallback) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [open, moduleKey, valid, fallback])
  return [tab, setTab]
}
