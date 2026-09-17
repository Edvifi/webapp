# Deployment

Hosted on **Vercel**, project `webapp` under `danial-begs-projects`, deploying
from `main` in `Edvifi/webapp`.

| Setting | Value |
| --- | --- |
| Root directory | `web` |
| Framework | Vite |
| Build | `npm run build` (runs `tsc -b` first, so a type error fails the deploy) |
| Install | `npm ci` |
| Output | `dist` |

## Environment variables

Set on production, preview and development:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Deliberately **unset**: `VITE_FEATURE_ESSAY_FEEDBACK`. Unset means the AI essay
feedback feature stays hidden. Setting it to `true` turns it on, and it also
needs `ANTHROPIC_API_KEY` on the Supabase project.

Every `VITE_*` value is compiled into the client bundle and is public. The anon
key is safe there by design — it is row-level-security scoped. Never add a
service-role key or the database password.

## Routing

`vercel.json` rewrites everything that is not a static asset to `index.html`.
The app has no server routes, so without this a refresh on any path 404s. This
replaces Cloudflare's `public/_redirects`, which Vercel ignores.

## When the host or domain changes

**Add the new origin to Supabase** → Authentication → URL Configuration, both
Site URL and Redirect URLs. Password-reset links are rejected if the origin is
not allow-listed, and the symptom is a student landing on the dashboard still
not knowing their password rather than an obvious error. See
`../supabase/EMAIL-SETUP.md`.
