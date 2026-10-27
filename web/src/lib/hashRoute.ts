/**
 * The page, open module, tab and one thing opened inside the tab, kept in the
 * URL hash so a refresh keeps the student's place and back/forward step
 * between them: `#/<page>[/<module>[/<tab>[/<item>]]]`, e.g.
 * `#/dashboard/application-tracking/status/sc-170976` for one school's page.
 * A cheap stand-in for a router; deeper state still resets on refresh.
 *
 * Only hashes starting with `#/` are ours: Supabase's sign-in and recovery
 * tokens also live in the hash, and are never touched.
 */
import { useCallback, useEffect, useState } from 'react'
import { moduleEnabled } from './features'

const PAGES = ['dashboard', 'timeline', 'calendar', 'profile', 'settings'] as const
export type Page = (typeof PAGES)[number]

/** Dashboard's module keys; each appears in the URL as its slug. One switched
 *  off in features.ts reads as no module, since the dashboard never renders it. */
const MODULES = ['Knowledge Library', 'Financial Aid', 'College Essays', 'Application Tracking']
const slug = (module: string) => module.toLowerCase().replace(/ /g, '-')

export interface Route {
  page: Page
  /** Dashboard's module key ('Financial Aid'), or null when none is open. */
  module: string | null
  tab: string | null
  /** What is open inside the tab (a school's page), or null for the tab itself. */
  item?: string | null
}

const ours = (hash: string) => hash === '' || hash === '#' || hash.startsWith('#/')

export function readRoute(hash: string = window.location.hash): Route {
  if (!hash.startsWith('#/')) return { page: 'dashboard', module: null, tab: null, item: null }
  const [page, moduleSlug, tab, item] = hash.slice(2).split('/')
  const module = MODULES.find((m) => slug(m) === moduleSlug && moduleEnabled(m)) ?? null
  return {
    page: (PAGES as readonly string[]).includes(page) ? (page as Page) : 'dashboard',
    module,
    tab: module && tab ? tab : null,
    item: module && tab && item ? item : null,
  }
}

export function formatRoute({ page, module, tab, item }: Route): string {
  return `#/${page}${module ? `/${slug(module)}${tab ? `/${tab}${item ? `/${item}` : ''}` : ''}` : ''}`
}

/** Write the route, adding a history entry. Leaves a hash that isn't ours alone. */
export function writeRoute(route: Route): void {
  const next = formatRoute(route)
  if (window.location.hash === next || !ours(window.location.hash)) return
  window.location.hash = next
}

/**
 * Drop our route without adding a history entry. On sign-out, so whoever signs
 * in next on this tab starts on the dashboard, not in the last student's module.
 */
export function clearRoute(): void {
  if (window.location.hash.startsWith('#/')) {
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  }
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

/** The item open inside that tab, by the same rule. */
export function routedItem(moduleKey: string, valid: readonly string[]): string | null {
  return routedTab(moduleKey, valid) ? readRoute().item ?? null : null
}

/**
 * The tab, plus one thing opened inside it (a school's page), so Back steps
 * from the page to its tab and a refresh reopens it. Changing tab closes it.
 */
export function useRoutedTab<T extends string>(
  moduleKey: string,
  open: boolean,
  valid: readonly T[],
  fallback: T,
): [T, (t: T) => void, string | null, (item: string | null) => void] {
  const [tab, setTabOnly] = useState<T>(() => (open && routedTab(moduleKey, valid)) || fallback)
  const [item, setItem] = useState<string | null>(() => (open ? routedItem(moduleKey, valid) : null))
  const setTab = useCallback((t: T) => { setTabOnly(t); setItem(null) }, [])
  useEffect(() => {
    if (!open) return
    const r = readRoute()
    // The default tab right after opening stays implied, or Back would need an
    // extra press to leave a tab nobody picked.
    if (r.module === moduleKey && (r.tab !== tab || r.item !== item) && !(r.tab == null && tab === fallback && item == null)) writeRoute({ ...r, tab, item })
  }, [open, tab, item, moduleKey, fallback])
  useEffect(() => {
    if (!open) return
    // Back or forward within this module: its tab, or the default when the
    // entry has none (the one made when the module opened).
    const onHash = () => {
      if (readRoute().module !== moduleKey) return
      setTabOnly(routedTab(moduleKey, valid) ?? fallback)
      setItem(routedItem(moduleKey, valid))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [open, moduleKey, valid, fallback])
  return [tab, setTab, item, setItem]
}
