import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

/**
 * The cold load: a returning student whose access token expired while they
 * were away. The client refreshes it inside its own startup lock and tells the
 * listener TOKEN_REFRESHED from inside that lock — so a profile query the
 * listener waits on, which needs the session, waits on the lock that is waiting
 * on the listener. The page sat blank until every attempt timed out.
 *
 * Every other auth test mocks the client, which is why none of them could see
 * this. Here the client is the real one; only the network is fake.
 */
const H = vi.hoisted(() => ({
  releaseRefresh: () => {},
  client: null as null | import('@supabase/supabase-js').SupabaseClient,
}))

vi.mock('../lib/supabase', async () => {
  const { createClient } = await import('@supabase/supabase-js')
  const now = Math.floor(Date.now() / 1000)
  const user = { id: 'student-1', aud: 'authenticated', email: 's@example.com', app_metadata: {}, user_metadata: {}, created_at: '' }
  const session = (exp: number) => ({ access_token: `at-${exp}`, refresh_token: 'rt', token_type: 'bearer', expires_in: 3600, expires_at: exp, user })
  // Saved an hour and a half ago, so the client must refresh before anything else.
  const store = new Map([['sb-test-auth-token', JSON.stringify(session(now - 1800))]])
  const refreshHeld = new Promise<void>((r) => { H.releaseRefresh = r })

  const fakeFetch = async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/auth/v1/token')) {
      // A real refresh is a network round trip, still out when React subscribes.
      await refreshHeld
      return Response.json(session(now + 3600))
    }
    if (url.includes('/rest/v1/profiles')) {
      return Response.json({ id: 'student-1', email: 's@example.com', display_name: 'Sam', onboarding_complete: true, settings: {} })
    }
    return new Response('{}', { status: 404 })
  }

  H.client = createClient('https://test.supabase.co', 'anon-key', {
    auth: {
      storageKey: 'sb-test-auth-token',
      detectSessionInUrl: false,
      storage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, v) },
        removeItem: (k: string) => { store.delete(k) },
      },
    },
    global: { fetch: fakeFetch as typeof fetch },
  })
  return { supabase: H.client }
})

import { AuthProvider, useAuth } from './AuthContext'

function Probe() {
  const { profileReady, profile } = useAuth()
  return <div data-testid="state">{profileReady ? `ready:${profile?.display_name}` : 'loading'}</div>
}

afterEach(async () => {
  await H.client?.auth.stopAutoRefresh()
})

describe('AuthContext cold load', () => {
  it('loads the profile when the saved token has to be refreshed first', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    // Subscribed; now let the refresh land, as it does on a real cold load.
    H.releaseRefresh()
    // Each stalled attempt used to cost 6s, five of them. Well inside one.
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('ready:Sam'), { timeout: 2000 })
  })
})
