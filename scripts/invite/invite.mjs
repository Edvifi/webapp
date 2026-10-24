// Invite the next wave off the waitlist.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... node invite.mjs 25 --dry-run   # list who would be invited
//   SUPABASE_SERVICE_ROLE_KEY=... node invite.mjs 25             # invite them
//
// Reads VITE_SUPABASE_URL from ../../web/.env.local. The service role key is
// taken from the environment and never read from a file: it bypasses RLS
// entirely, so it should not be sitting on disk next to the anon key.
// Get it from Supabase → Project Settings → API → service_role.
//
// Resumable on purpose. `invited_at` is stamped per student as the invite
// lands, so a run that stops halfway — email rate limit, dropped connection —
// can simply be run again and picks up where it left off. Nobody is invited
// twice; nobody is skipped.
//
// No dependencies: Node's own fetch, so there is nothing to install here.

import { readFileSync } from 'node:fs'

const DRY_RUN = process.argv.includes('--dry-run')
const COUNT = Number(process.argv.find((a) => /^\d+$/.test(a)))

if (!COUNT || COUNT < 1) {
  console.error('Usage: SUPABASE_SERVICE_ROLE_KEY=... node invite.mjs <count> [--dry-run]')
  console.error('The count is deliberately required — this sends real email to real students.')
  process.exit(1)
}

function loadEnv(path) {
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

const web = loadEnv(new URL('../../web/.env.local', import.meta.url).pathname)
const URL_BASE = web.VITE_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL_BASE) { console.error('Missing VITE_SUPABASE_URL in web/.env.local'); process.exit(1) }
if (!KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in the environment.')
  console.error('Supabase → Project Settings → API → service_role. Do not commit it.')
  process.exit(1)
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
}

/** The oldest signups that have not been invited yet — first come, first served. */
async function pending(limit) {
  const query = 'invited_at=is.null&select=id,email,grad_year,created_at&order=created_at.asc&limit=' + limit
  const res = await fetch(`${URL_BASE}/rest/v1/waitlist?${query}`, { headers })
  if (!res.ok) throw new Error(`Reading the waitlist failed: HTTP ${res.status} ${await res.text()}`)
  return res.json()
}

/**
 * Send one invite.
 *
 * `needs_password: true` is what the app reads to show the "choose a password"
 * screen on first entry — see needsPassword() in web/src/lib/auth.ts. Without
 * it an invited student is signed in by the link but never sets a password,
 * and on their next device the only way back in is "Forgot password" for a
 * password they never had.
 */
async function invite(email) {
  const res = await fetch(`${URL_BASE}/auth/v1/invite`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, data: { needs_password: true } }),
  })
  if (res.ok) return { ok: true }
  const body = await res.text()
  // Already has an account: they are in, whatever route they took. Stamping
  // them keeps them out of the next wave.
  if (/already been registered|already registered|email_exists/i.test(body)) {
    return { ok: true, note: 'already had an account' }
  }
  return { ok: false, status: res.status, body }
}

async function markInvited(id) {
  const res = await fetch(`${URL_BASE}/rest/v1/waitlist?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ invited_at: new Date().toISOString() }),
  })
  if (!res.ok) throw new Error(`Stamping invited_at failed: HTTP ${res.status} ${await res.text()}`)
}

const rows = await pending(COUNT)

if (rows.length === 0) {
  console.log('Nobody is waiting. The waitlist has no rows without invited_at.')
  process.exit(0)
}

console.log(`${rows.length} to invite${rows.length < COUNT ? ` (asked for ${COUNT}; that is everyone waiting)` : ''}:`)
for (const r of rows) console.log(`  ${r.email}${r.grad_year ? `  class of ${r.grad_year}` : ''}`)

if (DRY_RUN) {
  console.log('\n--dry-run: nothing sent, nothing stamped.')
  process.exit(0)
}

console.log('')
let sent = 0
for (const row of rows) {
  const result = await invite(row.email)
  if (!result.ok) {
    // Stop rather than carry on. The usual cause is the email rate limit, and
    // hammering it just turns one stalled wave into a whole failed one. What
    // has been stamped is already correct, so re-running resumes here.
    console.error(`\n${row.email}: HTTP ${result.status} ${result.body}`)
    console.error(`Stopped after ${sent} of ${rows.length}. Run again to continue from here.`)
    console.error('If that was a rate limit: Supabase → Authentication → Rate Limits → emails per hour.')
    process.exit(1)
  }
  await markInvited(row.id)
  sent++
  console.log(`  sent  ${row.email}${result.note ? `  (${result.note})` : ''}`)
}

console.log(`\n${sent} invited.`)
