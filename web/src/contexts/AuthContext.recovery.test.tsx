import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

/**
 * The seam the first two attempts at this feature both broke: the recovery
 * flag and the session it guards must agree across a remount. Every other test
 * here mocks one side or the other, which is exactly why neither caught it.
 */
type Handler = (event: string, session: unknown) => void

const H = vi.hoisted(() => ({
  handlers: [] as Handler[],
  onAuthStateChange: vi.fn(),
  getProfile: vi.fn(),
}))
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: Handler) => {
        H.handlers.push(cb)
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
    },
  },
}))
vi.mock('../lib/profiles', () => ({ getProfile: H.getProfile }))

// jsdom's Storage is not reliably present here; the gate walks a real one.
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size },
})

import { AuthProvider, useAuth } from './AuthContext'

const SESSION = { user: { id: 'student-1', email: 's@example.com' } }

function Probe() {
  const { recovering } = useAuth()
  return <div data-testid="state">{recovering ? 'recovering' : 'normal'}</div>
}

const emit = async (event: string, session: unknown) => {
  for (const h of H.handlers) await h(event, session)
}

describe('AuthContext recovery gate', () => {
  beforeEach(() => {
    H.handlers.length = 0
    H.getProfile.mockResolvedValue({ id: 'student-1', onboarding_complete: true })
    localStorage.clear()
  })

  it('stays up across a remount, because the session it guards is persisted', async () => {
    const first = render(<AuthProvider><Probe /></AuthProvider>)
    await emit('PASSWORD_RECOVERY', SESSION)
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('recovering'))

    // The student reloads. PASSWORD_RECOVERY never fires again: supabase
    // consumed the URL fragment on the first load.
    first.unmount()
    H.handlers.length = 0
    render(<AuthProvider><Probe /></AuthProvider>)
    await emit('INITIAL_SESSION', SESSION)

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('recovering'))
  })

  it('does not apply a stale mark to a different account', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await emit('PASSWORD_RECOVERY', SESSION)
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('recovering'))

    H.handlers.length = 0
    render(<AuthProvider><Probe /></AuthProvider>)
    await emit('INITIAL_SESSION', { user: { id: 'someone-else', email: 'other@example.com' } })

    const states = screen.getAllByTestId('state')
    expect(states[states.length - 1]).toHaveTextContent('normal')
  })

  it('comes down on sign-out, so an expired link cannot strand the tab', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await emit('PASSWORD_RECOVERY', SESSION)
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('recovering'))

    await emit('SIGNED_OUT', null)
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('normal'))
  })
})
