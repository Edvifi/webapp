import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { readRoute, formatRoute, writeRoute, clearRoute, routedTab, useRoutedTab } from './hashRoute'

vi.mock('./features', () => ({ moduleEnabled: (key: string) => key !== 'College Essays' }))

const TABS = ['overview', 'discover', 'status'] as const

beforeEach(() => { window.location.hash = '' })

describe('readRoute / formatRoute', () => {
  it('round-trips a page, module and tab', () => {
    const route = { page: 'dashboard' as const, module: 'Application Tracking', tab: 'discover', item: null }
    expect(formatRoute(route)).toBe('#/dashboard/application-tracking/discover')
    expect(readRoute(formatRoute(route))).toEqual(route)
  })
  it('round-trips a page open inside a tab', () => {
    const route = { page: 'dashboard' as const, module: 'Application Tracking', tab: 'status', item: 'sc-170976' }
    expect(formatRoute(route)).toBe('#/dashboard/application-tracking/status/sc-170976')
    expect(readRoute(formatRoute(route))).toEqual(route)
  })
  it('falls back to the dashboard for an empty, unknown or foreign hash', () => {
    const home = { page: 'dashboard', module: null, tab: null, item: null }
    expect(readRoute('')).toEqual(home)
    expect(readRoute('#/nowhere/nothing')).toEqual(home)
    expect(readRoute('#access_token=abc&type=recovery')).toEqual(home)
  })
  it('reads a switched-off module as none', () => {
    expect(readRoute('#/dashboard/college-essays/drafts')).toEqual({ page: 'dashboard', module: null, tab: null, item: null })
  })
})

describe('writeRoute', () => {
  it('never overwrites a Supabase token or recovery hash', () => {
    window.location.hash = '#access_token=abc&type=recovery'
    writeRoute({ page: 'calendar', module: null, tab: null })
    expect(window.location.hash).toBe('#access_token=abc&type=recovery')
  })
  it('writes our own route', () => {
    writeRoute({ page: 'calendar', module: null, tab: null })
    expect(window.location.hash).toBe('#/calendar')
  })
})

describe('clearRoute', () => {
  it('drops our route, and leaves a Supabase hash alone', () => {
    window.location.hash = '#/dashboard/financial-aid/deadlines'
    clearRoute()
    expect(window.location.hash).toBe('')
    window.location.hash = '#access_token=abc&type=recovery'
    clearRoute()
    expect(window.location.hash).toBe('#access_token=abc&type=recovery')
  })
})

describe('useRoutedTab', () => {
  it('opens on the tab in the URL, and ignores one for another module', () => {
    window.location.hash = '#/dashboard/application-tracking/discover'
    expect(renderHook(() => useRoutedTab('Application Tracking', true, TABS, 'status')).result.current[0]).toBe('discover')
    expect(routedTab('Financial Aid', TABS)).toBeNull()
  })
  it('writes a chosen tab, but leaves the default implied', () => {
    window.location.hash = '#/dashboard/application-tracking'
    const { result } = renderHook(() => useRoutedTab('Application Tracking', true, TABS, 'status'))
    expect(window.location.hash).toBe('#/dashboard/application-tracking')
    act(() => { result.current[1]('discover') })
    expect(window.location.hash).toBe('#/dashboard/application-tracking/discover')
  })
  it('follows back/forward, returning to the default on an entry without a tab', () => {
    window.location.hash = '#/dashboard/application-tracking/discover'
    const { result } = renderHook(() => useRoutedTab('Application Tracking', true, TABS, 'status'))
    act(() => {
      window.location.hash = '#/dashboard/application-tracking'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(result.current[0]).toBe('status')
  })
  it('puts an opened school under its tab, so Back closes it, and a tab change drops it', () => {
    window.location.hash = '#/dashboard/application-tracking'
    const { result } = renderHook(() => useRoutedTab('Application Tracking', true, TABS, 'status'))
    act(() => { result.current[3]('sc-1') })
    expect(window.location.hash).toBe('#/dashboard/application-tracking/status/sc-1')
    act(() => {
      window.location.hash = '#/dashboard/application-tracking'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(result.current[2]).toBeNull()
    act(() => { result.current[3]('sc-1') })
    act(() => { result.current[1]('discover') })
    expect([result.current[0], result.current[2]]).toEqual(['discover', null])
    expect(window.location.hash).toBe('#/dashboard/application-tracking/discover')
  })
  it('drops the open page when the tab it is already on is picked again', () => {
    // What makes the sidebar work while reading an article. Clicking the tab
    // you are already on changes no tab id, so if this did not clear the item
    // nothing would re-render and the reader would stay up — which is exactly
    // how the sidebar came to look live and do nothing.
    window.location.hash = '#/dashboard/application-tracking'
    const { result } = renderHook(() => useRoutedTab('Application Tracking', true, TABS, 'status'))
    act(() => { result.current[3]('sr-5') })
    expect(result.current[2]).toBe('sr-5')
    act(() => { result.current[1]('status') }) // the tab it is already on
    expect([result.current[0], result.current[2]]).toEqual(['status', null])
    // The URL as well: clearing only the state would leave the hash pointing
    // at the closed article, so a refresh or a Back press reopens it.
    expect(window.location.hash).toBe('#/dashboard/application-tracking/status')
  })
  it('keeps an item set in the same tick as the tab it belongs to', () => {
    // Financial Aid's Overview links into an article with
    // `setTab('financial-aid-101'); setPage(id)`. setTab clears the item, so
    // this only works if the later setItem wins within the batch — if it did
    // not, every link from Overview would land on the tab and drop the
    // article it was meant to open.
    window.location.hash = '#/dashboard/application-tracking'
    const { result } = renderHook(() => useRoutedTab('Application Tracking', true, TABS, 'status'))
    act(() => { result.current[1]('discover'); result.current[3]('sr-5') })
    expect([result.current[0], result.current[2]]).toEqual(['discover', 'sr-5'])
    expect(window.location.hash).toBe('#/dashboard/application-tracking/discover/sr-5')
  })
  it('replaces rather than pushes when asked, so a step inside a page costs no entry', () => {
    window.location.hash = '#/dashboard/application-tracking'
    const { result } = renderHook(() => useRoutedTab('Application Tracking', true, TABS, 'status'))
    act(() => { result.current[3]('sc-1') })
    const afterOpen = window.history.length
    // Paging on: the same page, a different item. Pushing here is what made
    // Back walk back item by item instead of leaving the module.
    act(() => { result.current[3]('sc-2', { replace: true }) })
    expect(window.history.length).toBe(afterOpen)
    expect(window.location.hash).toBe('#/dashboard/application-tracking/status/sc-2')
    expect(result.current[2]).toBe('sc-2')
    // Without it, a move to a new page still earns its entry.
    act(() => { result.current[3]('sc-3') })
    expect(window.history.length).toBe(afterOpen + 1)
  })
  it('does not let a replace leak into the next write', () => {
    // Asking to replace with the value already held is a no-op React skips, so
    // anything carrying the intent outside state is never cleared and the next
    // write silently replaces — deleting the Back exit this is meant to keep.
    window.location.hash = '#/dashboard/application-tracking'
    const { result } = renderHook(() => useRoutedTab('Application Tracking', true, TABS, 'status'))
    act(() => { result.current[3]('sc-1') })
    act(() => { result.current[3]('sc-1', { replace: true }) }) // same value: React skips it
    const before = window.history.length
    act(() => { result.current[1]('discover') }) // a different writer: must push
    expect(window.history.length).toBe(before + 1)
  })
  it('opens on the school in the URL', () => {
    window.location.hash = '#/dashboard/application-tracking/status/sc-1'
    expect(renderHook(() => useRoutedTab('Application Tracking', true, TABS, 'status')).result.current[2]).toBe('sc-1')
  })
})
