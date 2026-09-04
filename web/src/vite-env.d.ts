/// <reference types="vite/client" />

// Typed view of the env vars this app reads. Vite only exposes `VITE_*` keys
// to the client bundle; document each one in web/.env.example as well.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** "true" enables AI essay feedback (see lib/featureFlags.ts). Off when unset. */
  readonly VITE_FEATURE_ESSAY_FEEDBACK?: string
}
