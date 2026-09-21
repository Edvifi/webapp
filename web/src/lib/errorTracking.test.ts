import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const H = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
}))
vi.mock('posthog-js', () => ({
  default: { init: H.init, captureException: H.captureException },
}))

/** The module holds `live` at module scope, so each test needs a fresh copy. */
async function load(env: Record<string, string | undefined>) {
  vi.resetModules()
  vi.stubEnv('VITE_POSTHOG_KEY', env.VITE_POSTHOG_KEY ?? '')
  if (env.VITE_POSTHOG_HOST) vi.stubEnv('VITE_POSTHOG_HOST', env.VITE_POSTHOG_HOST)
  return import('./errorTracking')
}

describe('errorTracking', () => {
  beforeEach(() => { H.init.mockReset(); H.captureException.mockReset() })
  afterEach(() => vi.unstubAllEnvs())

  it('stays inert without a key, and keeps errors on the console', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { initErrorTracking, reportError } = await load({})
    initErrorTracking()

    // Nothing leaves the browser on a deploy that was never configured.
    expect(H.init).not.toHaveBeenCalled()
    reportError(new Error('boom'))
    expect(H.captureException).not.toHaveBeenCalled()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('never builds a person profile', async () => {
    // This app holds a minor's income, race, religion and immigration status.
    // An error says a crash happened and where; it must not say who.
    const { initErrorTracking } = await load({ VITE_POSTHOG_KEY: 'phc_test' })
    initErrorTracking()

    const opts = H.init.mock.calls[0][1]
    expect(opts.person_profiles).toBe('never')
    // Nor collect the student's browsing as a side effect of error reporting.
    expect(opts.autocapture).toBe(false)
    expect(opts.capture_pageview).toBe(false)
    expect(opts.capture_pageleave).toBe(false)
    expect(opts.disable_session_recording).toBe(true)
  })

  it('reports an error with the context it was given', async () => {
    const { initErrorTracking, reportError } = await load({ VITE_POSTHOG_KEY: 'phc_test' })
    initErrorTracking()

    const err = new Error('module exploded')
    reportError(err, { kind: 'module-boundary' })
    expect(H.captureException).toHaveBeenCalledWith(err, { kind: 'module-boundary' })
  })

  it('catches unhandled rejections, which nothing listened for before', async () => {
    const { initErrorTracking } = await load({ VITE_POSTHOG_KEY: 'phc_test' })
    initErrorTracking()

    window.dispatchEvent(
      Object.assign(new Event('unhandledrejection'), { reason: new Error('dropped') }),
    )
    expect(H.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'dropped' }),
      { kind: 'unhandledrejection' },
    )
  })

  it('wraps a non-Error rejection reason rather than dropping it', async () => {
    const { initErrorTracking } = await load({ VITE_POSTHOG_KEY: 'phc_test' })
    initErrorTracking()

    window.dispatchEvent(
      Object.assign(new Event('unhandledrejection'), { reason: 'just a string' }),
    )
    expect(H.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'just a string' }),
      { kind: 'unhandledrejection' },
    )
  })

  it('does not become a second error when the tracker itself fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    H.captureException.mockImplementation(() => { throw new Error('posthog down') })
    const { initErrorTracking, reportError } = await load({ VITE_POSTHOG_KEY: 'phc_test' })
    initErrorTracking()

    expect(() => reportError(new Error('boom'))).not.toThrow()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('initialises once however often it is called', async () => {
    const { initErrorTracking } = await load({ VITE_POSTHOG_KEY: 'phc_test' })
    initErrorTracking()
    initErrorTracking()
    expect(H.init).toHaveBeenCalledTimes(1)
  })
})
