import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { readRoute, formatRoute, writeRoute, clearRoute, routedTab, useRoutedTab } from './hashRoute'

vi.mock('./features', () => ({ moduleEnabled: (key: string) => key !== 'College Essays' }))

const TABS = ['overview', 'discover', 'status'] as const

beforeEach(() => { window.location.hash = '' })

describe('readRoute / formatRoute', () => {
  it('round-trips a page, module and tab', () => {
    const route = { page: 'dashboard' as const, module: 'Application Tracking', tab: 'discover' }
    expect(formatRoute(route)).toBe('#/dashboard/application-tracking/discover')
    expect(readRoute(formatRoute(route))).toEqual(route)
  })
  it('falls back to the dashboard for an empty, unknown or foreign hash', () => {
    const home = { page: 'dashboard', module: null, tab: null }
    expect(readRoute('')).toEqual(home)
    expect(readRoute('#/nowhere/nothing')).toEqual(home)
    expect(readRoute('#access_token=abc&type=recovery')).toEqual(home)
  })
  it('reads a switched-off module as none', () => {
    expect(readRoute('#/dashboard/college-essays/drafts')).toEqual({ page: 'dashboard', module: null, tab: null })
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
})
