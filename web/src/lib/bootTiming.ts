/**
 * Where a cold load actually spends its time.
 *
 * The app shows a loading screen until sign-in resolves, and on a first visit
 * that takes seconds. Reading auth-js says the bulk of it is the refresh
 * round-trip it does before handing us a session — but that is inference from
 * its source, not a measurement of this app on a real connection.
 *
 * This measures it. Off unless asked for: `?timing` on the URL, or any dev
 * server. Nothing is sent anywhere; it prints one line to the console.
 */

type Mark = 'app-start' | 'auth-ready' | 'profile-ready'

const marks = new Map<Mark, number>()
let reported = false

function enabled(): boolean {
  if (typeof window === 'undefined') return false
  if (import.meta.env.DEV) return true
  try { return new URLSearchParams(window.location.search).has('timing') }
  catch { return false }
}

export function markBoot(name: Mark, detail?: string) {
  if (!enabled() || marks.has(name)) return
  marks.set(name, performance.now())
  if (name === 'profile-ready') report(detail)
}

function report(detail?: string) {
  if (reported) return
  reported = true
  const start = marks.get('app-start') ?? 0
  const auth = marks.get('auth-ready')
  const profile = marks.get('profile-ready')
  if (auth == null || profile == null) return
  const ms = (n: number) => `${Math.round(n)}ms`
  // The first figure is everything before our code runs: the client booting
  // and, on a cold load, swapping the refresh token for a live one. The second
  // is our own profile query. If the wait is the round-trip, the first number
  // is nearly all of it.
  console.info(
    `[edvifi boot] session ${ms(auth - start)} · profile ${ms(profile - auth)}`
    + `${detail ? ` (${detail})` : ''} · total ${ms(profile - start)}`,
  )
}
