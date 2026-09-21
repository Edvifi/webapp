/// <reference types="vite/client" />

// Typed view of the env vars this app reads. Vite only exposes `VITE_*` keys
// to the client bundle; document each one in web/.env.example as well.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Publishable logo.dev token for school logos. Optional; no logos without it. */
  readonly VITE_LOGODEV_TOKEN?: string
  /** PostHog project key. Unset means no error reporting leaves the browser;
   *  errors go to the console as before. */
  readonly VITE_POSTHOG_KEY?: string
  /** PostHog ingestion host. Defaults to US cloud. */
  readonly VITE_POSTHOG_HOST?: string
  /** Cloudflare Turnstile site key. Unset means no captcha widget and no token,
   *  which must match CAPTCHA being disabled in Supabase Auth. */
  readonly VITE_TURNSTILE_SITE_KEY?: string
}
