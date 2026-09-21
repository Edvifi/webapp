/**
 * Error tracking, through PostHog.
 *
 * Until now a crash reached `console.error` and stopped there, which means it
 * reached nobody: the students this is for are sixteen and will not open a
 * console, let alone report what it said. An unhandled promise rejection did
 * not even get that far — nothing was listening for them at all.
 *
 * Everything routes through `reportError` so there is one place that decides
 * what leaves the browser.
 *
 * **What is deliberately not sent.** `person_profiles: 'never'` and no
 * `identify` call, so PostHog never builds a profile keyed to a student. This
 * app holds a minor's zip code, school, GPA, household income, race, religion
 * and immigration status; none of that belongs in a third-party error tool,
 * and the cheapest way to guarantee that is to never send anything that could
 * be joined back to a person. An error tells us a crash happened and where —
 * it does not need to say who.
 *
 * Without VITE_POSTHOG_KEY the whole module is inert: `init` does nothing and
 * `reportError` falls back to the console, so development and any deploy
 * without the key behave exactly as before.
 */

import posthog from 'posthog-js'

let live = false

/** Start tracking, if this deploy is configured for it. Safe to call twice. */
export function initErrorTracking(): void {
  if (live) return
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) return

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    // No profile, no identify: see the note above.
    person_profiles: 'never',
    // This is an error channel, not analytics. Pageviews and autocapture would
    // send the student's navigation and clicks, which is not what was asked
    // for and is a much larger disclosure than a stack trace.
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: false,
    disable_session_recording: true,
  })
  live = true

  // Errors that reach the window, which nothing was listening for before.
  window.addEventListener('error', (e) => {
    reportError(e.error ?? new Error(e.message), { kind: 'window.onerror' })
  })
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason
    reportError(
      reason instanceof Error ? reason : new Error(String(reason)),
      { kind: 'unhandledrejection' },
    )
  })
}

/**
 * Report one error. `context` should say where it came from, never what the
 * student typed.
 */
export function reportError(error: Error, context: Record<string, string> = {}): void {
  if (!live) {
    console.error('[error]', error, context)
    return
  }
  try {
    posthog.captureException(error, context)
  } catch {
    // The tracker failing must never become a second error on the way out.
    console.error('[error]', error, context)
  }
}
