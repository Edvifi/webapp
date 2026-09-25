// Common App requirements grid -> Supabase `colleges` deadline columns.
//
// Usage:
//   node ingest.mjs            # parse, match, print what would change. Writes nothing.
//   node ingest.mjs -v         # the same, plus every row it would write
//   node ingest.mjs --apply    # write
//
// Writing needs --apply. It used to be the no-flag default, which meant one
// mistyped invocation went straight at production.
//
// Why this exists: 6,273 colleges are in the table and 46 had a real
// application deadline. Everything else fell back to a typical date for the
// round, shown to the student as "no date on file". Common App publishes a
// grid of its members' deadlines and keeps it current through the cycle, so
// this is re-runnable rather than a one-off import.
//
// Needs `pdftotext` (poppler) on PATH. Reads VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY from ../../web/.env.local.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { parseGrid, toDisplayDate, normaliseName } from './parse.mjs'

const APPLY = process.argv.includes('--apply')
const VERBOSE = process.argv.includes('-v')
const GRID_URL = 'https://content.commonapp.org/Files/ReqGrid.pdf'

function loadEnv(path) {
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

const web = loadEnv(new URL('../../web/.env.local', import.meta.url).pathname)
const supabase = createClient(web.VITE_SUPABASE_URL, web.VITE_SUPABASE_ANON_KEY)

/** Fetch the grid and flatten it to text. Cached so a dry run is repeatable. */
async function gridText() {
  const pdf = join(tmpdir(), 'commonapp-reqgrid.pdf')
  const txt = join(tmpdir(), 'commonapp-reqgrid.txt')
  if (!existsSync(pdf)) {
    const res = await fetch(GRID_URL, { signal: AbortSignal.timeout(60000) })
    if (!res.ok) throw new Error(`grid fetch failed: ${res.status}`)
    writeFileSync(pdf, Buffer.from(await res.arrayBuffer()))
  }
  execFileSync('pdftotext', ['-layout', pdf, txt])
  return readFileSync(txt, 'utf8')
}

/**
 * The three rounds the app models. EDII and EAII are parsed and counted but
 * not stored: AppDeadlineType has no round for them, and inventing a column
 * the app cannot render would be data nobody reads.
 */
const COLUMNS = { ed: 'early_decision', ea: 'early_action', rd: 'regular_decision' }

async function main() {
  const rows = parseGrid(await gridText())
  console.log(`grid: ${rows.length} schools parsed`)

  // A layout change upstream would show up as a collapse in what parses.
  // Common App has ~1,100 members and the grid lists every one.
  if (rows.length < 900) {
    throw new Error(`only ${rows.length} schools parsed — the grid layout has probably changed; check parse.mjs before trusting this`)
  }

  // A few schools appear once per program, each with its own deadlines under
  // the same name. There is no way to tell which program a student means, so
  // take neither rather than pick.
  const byName = new Map()
  for (const row of rows) {
    const key = normaliseName(row.name)
    byName.set(key, [...(byName.get(key) ?? []), row])
  }
  const ambiguous = [...byName.values()].filter((g) => g.length > 1)
  const single = [...byName.values()].filter((g) => g.length === 1).map((g) => g[0])
  if (ambiguous.length) {
    console.log(`skipped ${ambiguous.length} listed more than once: ${ambiguous.map((g) => g[0].name).join(', ')}`)
  }

  // PostgREST caps a select at 1,000 rows. Without paging this silently saw
  // a sixth of the table and matched a sixth of the grid.
  const colleges = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('colleges')
      .select('scorecard_id, name, early_decision, early_action, regular_decision')
      .order('scorecard_id')
      .range(from, from + 999)
    if (error) throw new Error(`could not read colleges: ${error.message}`)
    colleges.push(...data)
    if (data.length < 1000) break
  }
  console.log(`colleges:   ${colleges.length} in the table`)

  const index = new Map()
  for (const c of colleges) {
    const key = normaliseName(c.name)
    if (!index.has(key)) index.set(key, c)
  }
  const keys = [...index.keys()]

  const updates = []
  const unmatched = []
  const claimed = new Map()
  const collisions = []
  let unchanged = 0, conflicts = 0, extraRounds = 0, agreed = 0

  for (const row of single) {
    const key = normaliseName(row.name)
    let college = index.get(key)
    if (!college && key.length >= 10) {
      const near = keys.filter((k) => k.startsWith(key))
      if (near.length === 1) college = index.get(near[0])
    }
    if (!college) { unmatched.push(row.name); continue }
    // Two grid rows landing on one college means the prefix fallback reached
    // too far, and the second would overwrite the first without a word.
    const seen = claimed.get(college.scorecard_id)
    if (seen) { collisions.push(`${seen} + ${row.name} -> ${college.name}`); continue }
    claimed.set(college.scorecard_id, row.name)
    if (row.edii || row.eaii) extraRounds += 1

    const patch = {}
    for (const [round, column] of Object.entries(COLUMNS)) {
      const raw = row[round]
      if (!raw) continue
      const value = raw === 'Rolling' ? 'Rolling' : toDisplayDate(raw)
      if (!value) continue
      const current = college[column]
      if (current === value) { agreed += 1; continue }
      // Only ever fill a blank. Spot-checking the disagreements showed the
      // grid right about Stanford (Jan 5, where we held a wrong Jan 2) and
      // wrong about Georgetown (Jan 1, where Jan 10 is the real date), so
      // neither source wins outright. The 46 curated rows were checked by
      // hand; a bulk import does not get to quietly undo that. Disagreements
      // are printed for someone to settle.
      if (current) { conflicts += 1; console.log(`  differs: ${college.name} ${column}: ours ${current} | grid ${value}`); continue }
      patch[column] = value
    }
    if (Object.keys(patch).length === 0) { unchanged += 1; continue }
    updates.push({ scorecard_id: college.scorecard_id, name: college.name, patch })
  }

  console.log(`matched:    ${single.length - unmatched.length}/${single.length}`)
  console.log(`to write:   ${updates.length}`)
  console.log(`unchanged:  ${unchanged}`)
  console.log(`agrees with a value we already had: ${agreed}`)
  console.log(`differs from an existing value (left alone): ${conflicts}`)
  console.log(`have EDII/EAII we do not store: ${extraRounds}`)
  console.log(`unmatched:  ${unmatched.length}`)
  if (collisions.length) console.log(`collisions: ${collisions.length}\n    ${collisions.join('\n    ')}`)
  if (VERBOSE) {
    for (const u of updates) console.log('   ', u.name, JSON.stringify(u.patch))
    console.log('  unmatched:', unmatched.join(' | '))
  }

  if (!APPLY) { console.log('\nDry run — nothing written. Re-run with --apply to write.'); return }

  let written = 0
  for (const u of updates) {
    const { error: e } = await supabase
      .from('colleges')
      .update({ ...u.patch, verified_at: new Date().toISOString() })
      .eq('scorecard_id', u.scorecard_id)
    if (e) { console.error(`  failed ${u.name}: ${e.message}`); continue }
    written += 1
  }
  console.log(`\nwrote ${written}/${updates.length}`)
}

main().catch((e) => { console.error(e.message); process.exit(1) })
