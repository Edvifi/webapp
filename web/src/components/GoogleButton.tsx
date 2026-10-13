/**
 * GoogleButton — Google's own sign-in button (Google Identity Services).
 *
 * The redirect flow sends students through the Supabase project's callback,
 * so Google's consent screen names `<ref>.supabase.co`. This button gets an ID
 * token in a popup on our own origin and hands it to Supabase directly, so the
 * consent screen names us instead.
 *
 * Google draws its button inside an iframe, so no font or colour of ours can
 * reach it. Instead our own button face is shown and Google's is laid over it,
 * fully transparent: the student sees ours, and the click lands on Google's.
 * (Even 1% opacity lets Google's text show through as a ghost.)
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { GOOGLE_CLIENT_ID, makeGoogleNonce } from '../lib/auth'

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
/** Google's limits on the button width. Wider than our face is fine: the
 *  overflow is clipped, and every visible pixel is still Google's button. */
const MIN_WIDTH = 200
const MAX_WIDTH = 400

interface GsiApi {
  accounts: {
    id: {
      initialize: (opts: { client_id: string; nonce: string; callback: (r: { credential: string }) => void }) => void
      renderButton: (el: HTMLElement, opts: Record<string, string | number>) => void
    }
  }
}
declare global {
  interface Window { google?: GsiApi }
}

/** Resolves once the GIS script is on the page. Loaded at most once. */
let scriptPromise: Promise<void> | null = null
function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts) { resolve(); return }
    const el = document.createElement('script')
    el.src = SCRIPT_SRC
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => { scriptPromise = null; reject(new Error('google sign-in failed to load')) }
    document.head.appendChild(el)
  })
  return scriptPromise
}

interface Props {
  /** The ID token, and the raw nonce Supabase needs to check it. */
  onCredential: (token: string, nonce: string) => void
  /** The script could not load (blocked or offline); show the fallback. */
  onUnavailable: () => void
  disabled?: boolean
  /** What the student sees: icon and label. */
  children: ReactNode
}

export default function GoogleButton({ onCredential, onUnavailable, disabled, children }: Props) {
  const holder = useRef<HTMLDivElement>(null)
  // Google keeps the callback from initialize, so it reads the latest handler
  // through a ref rather than re-rendering the button on every parent render.
  const handlers = useRef({ onCredential, onUnavailable })
  useEffect(() => { handlers.current = { onCredential, onUnavailable } })

  useEffect(() => {
    let cancelled = false
    void Promise.all([loadScript(), makeGoogleNonce()])
      .then(([, nonce]) => {
        const el = holder.current
        const gsi = window.google?.accounts.id
        if (cancelled || !el || !GOOGLE_CLIENT_ID) return
        // A script that loads without the API would leave a face nothing can
        // click through; fall back rather than show a dead button.
        if (!gsi) { handlers.current.onUnavailable(); return }
        gsi.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: nonce.hashed,
          callback: ({ credential }) => { if (!cancelled) handlers.current.onCredential(credential, nonce.raw) },
        })
        gsi.renderButton(el, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'continue_with',
          logo_alignment: 'center',
          width: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, el.clientWidth)),
        })
      })
      .catch(() => { if (!cancelled) handlers.current.onUnavailable() })
    return () => { cancelled = true }
  }, [])

  return (
    <div className={`auth-sso-btn auth-sso-btn--google auth-google-gis${disabled ? ' is-disabled' : ''}`}>
      {/* Hidden from assistive tech: the iframe's own button carries the name. */}
      <span className="auth-google-gis-face" aria-hidden="true">{children}</span>
      <div ref={holder} className="auth-google-gis-hit" />
    </div>
  )
}
