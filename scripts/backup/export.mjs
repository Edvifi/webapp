#!/usr/bin/env node
/**
 * Export every row of student-authored data to timestamped JSON.
 *
 * Why this exists: on the free tier there are no daily backups and no
 * point-in-time recovery, and all of a student's work — essays, college list,
 * answers, preferences — lives in one `profiles.settings` JSONB column. One
 * bad write and it is gone with nothing to restore from. Reference data
 * (scholarships, colleges) is reproducible from seed.sql and the ingest
 * script; this is not.
 *
 * Even after upgrading to Pro this is worth keeping. Daily backups restore the
 * whole database to yesterday; they cannot restore one student's drafts
 * without rolling everyone else back with them.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/backup/export.mjs [outDir]
 *
 * The service-role key bypasses row-level security, which is the point — it
 * has to read every student's rows. Never put it in the web app's env.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'

const TABLES = [
  // Everything a student authored. Order is informational only.
  'profiles',
  'fafsa_user_module_state',
  'fafsa_tracker_items',
  'fafsa_saved_items',
  'essay_feedback_requests',
]

function loadEnv(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
        .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
    )
  } catch { return {} }
}

const webEnv = loadEnv(new URL('../../web/.env.local', import.meta.url).pathname)
const url = process.env.SUPABASE_URL || webEnv.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) { console.error('No project URL. Set SUPABASE_URL or VITE_SUPABASE_URL in web/.env.local.'); process.exit(1) }
if (!key) {
  console.error('No SUPABASE_SERVICE_ROLE_KEY. Find it in Supabase → Settings → API.')
  console.error('Pass it inline so it does not linger in your shell history:')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=... node scripts/backup/export.mjs')
  process.exit(1)
}

/** Page through PostgREST, which caps a single response at 1000 rows. */
async function fetchAll(table) {
  const rows = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${from + PAGE - 1}`,
        'Range-Unit': 'items',
      },
    })
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`)
    const page = await res.json()
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const outDir = join(process.argv[2] || 'backups', stamp)
mkdirSync(outDir, { recursive: true })

let total = 0
let failed = 0
for (const table of TABLES) {
  try {
    const rows = await fetchAll(table)
    writeFileSync(join(outDir, `${table}.json`), JSON.stringify(rows, null, 2))
    console.log(`  ${table}: ${rows.length} rows`)
    total += rows.length
  } catch (e) {
    // One missing or renamed table must not throw away the tables that did
    // export — a partial backup beats none.
    console.error(`  ${table}: FAILED — ${e.message}`)
    failed++
  }
}

writeFileSync(join(outDir, 'manifest.json'), JSON.stringify({
  exported_at: new Date().toISOString(),
  project_url: url,
  tables: TABLES,
  total_rows: total,
  failed_tables: failed,
}, null, 2))

console.log(`\n${total} rows to ${outDir}`)
if (failed) { console.error(`${failed} table(s) failed — this backup is incomplete.`); process.exit(1) }
