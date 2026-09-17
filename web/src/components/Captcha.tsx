/**
 * Captcha — Cloudflare Turnstile, dormant until a site key is configured.
 *
 * Enabling CAPTCHA in Supabase makes the server reject every sign-up, sign-in
 * and password reset that arrives without a token. This component exists so
 * that flipping the switch is a config change rather than an outage: with no
 * `VITE_TURNSTILE_SITE_KEY` it renders nothing and reports no token, and every
 * auth call behaves exactly as it does today.
 *
 * Tokens are single-use. A failed submit must remount this (change its `key`)
 * to get a fresh one, or the retry is rejected for reusing a spent token.
 */

import { useEffect, useRef } from 'react'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

interface TurnstileApi {
  render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void; 'error-callback'?: () => void; theme?: string }) => string
  remove: (id: string) => void
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

/** Resolves once the Turnstile script is on the page. Loaded at most once. */
let scriptPromise: Promise<void> | null = null
function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (existing) { resolve(); return }
    const el = document.createElement('script')
    el.src = SCRIPT_SRC
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => { scriptPromise = null; reject(new Error('turnstile failed to load')) }
    document.head.appendChild(el)
  })
  return scriptPromise
}

export default function Captcha({ onToken }: { onToken: (token: string) => void }) {
  const holder = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!SITE_KEY) return
    let widgetId: string | undefined
    let cancelled = false

    void loadScript()
      .then(() => {
        if (cancelled || !holder.current || !window.turnstile) return
        widgetId = window.turnstile.render(holder.current, {
          sitekey: SITE_KEY,
          callback: (token) => { if (!cancelled) onToken(token) },
          // A challenge that cannot complete must not block the form silently;
          // the server will reject the tokenless call with its own message.
          'error-callback': () => { if (!cancelled) onToken('') },
        })
      })
      .catch(() => { if (!cancelled) onToken('') })

    return () => {
      cancelled = true
      if (widgetId && window.turnstile) {
        try { window.turnstile.remove(widgetId) } catch { /* already gone */ }
      }
    }
  }, [onToken])

  if (!SITE_KEY) return null
  return <div ref={holder} style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }} />
}
