// Emit the same writes ingest.mjs --apply would make, as one SQL statement.
//
// Running them as the project owner rather than the anon key means no
// temporary "anyone may update colleges" policy has to exist even briefly.
// Identical selection logic: fills blanks only, never overwrites.
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { parseGrid, toDisplayDate, normaliseName } from './parse.mjs'

const env = {}
for (const l of readFileSync(new URL('../../web/.env.local', import.meta.url).pathname, 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim()
}
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const pdf = join(tmpdir(), 'commonapp-reqgrid.pdf')
const txt = join(tmpdir(), 'commonapp-reqgrid.txt')
execFileSync('pdftotext', ['-layout', pdf, txt])
const rows = parseGrid(readFileSync(txt, 'utf8'))

const colleges = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from('colleges')
    .select('scorecard_id, name, early_decision, early_action, regular_decision, application_fee_cents, fee_waiver_policy')
    .order('scorecard_id').range(from, from + 999)
  if (error) throw new Error(error.message)
  colleges.push(...data); if (data.length < 1000) break
}

const byName = new Map()
for (const r of rows) { const k = normaliseName(r.name); byName.set(k, [...(byName.get(k) ?? []), r]) }
const single = [...byName.values()].filter((g) => g.length === 1).map((g) => g[0])

const index = new Map()
for (const c of colleges) { const k = normaliseName(c.name); if (!index.has(k)) index.set(k, c) }
const keys = [...index.keys()]
const COLUMNS = { ed: 'early_decision', ea: 'early_action', rd: 'regular_decision' }

const claimed = new Map(); const updates = []
for (const row of single) {
  const key = normaliseName(row.name)
  let college = index.get(key)
  if (!college && key.length >= 10) {
    const near = keys.filter((k) => k.startsWith(key)); if (near.length === 1) college = index.get(near[0])
  }
  if (!college || claimed.has(college.scorecard_id)) continue
  claimed.set(college.scorecard_id, row.name)
  const patch = {}
  for (const [round, column] of Object.entries(COLUMNS)) {
    const raw = row[round]; if (!raw) continue
    const value = raw === 'Rolling' ? 'Rolling' : toDisplayDate(raw)
    if (!value || college[column]) continue   // never overwrite
    patch[column] = value
  }
  // Fees are refreshed rather than only filled: unlike a hand-checked
  // deadline, nobody curates these by hand, the grid is their only source,
  // and a school that drops its fee should stop being shown as charging one.
  if (row.fee != null) patch.application_fee_cents = row.fee * 100
  if (row.waiver) patch.fee_waiver_policy = row.waiver
  if (Object.keys(patch).length) updates.push({ id: college.scorecard_id, patch })
}

const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const n = (v) => (v == null ? 'null' : String(v))
const values = updates.map((u) =>
  `(${u.id},${q(u.patch.early_decision)},${q(u.patch.early_action)},${q(u.patch.regular_decision)},`
  + `${n(u.patch.application_fee_cents)},${q(u.patch.fee_waiver_policy)})`).join(',\n  ')
// coalesce so a column this run has nothing for keeps whatever is there.
// fees_verified_at only moves when a fee actually came through, so it stays an
// honest record of when the figure was last confirmed.
const sql = `update public.colleges c set
  early_decision       = coalesce(v.ed, c.early_decision),
  early_action         = coalesce(v.ea, c.early_action),
  regular_decision     = coalesce(v.rd, c.regular_decision),
  application_fee_cents = coalesce(v.fee, c.application_fee_cents),
  fee_waiver_policy     = coalesce(v.waiver, c.fee_waiver_policy),
  fees_verified_at     = case when v.fee is not null then now() else c.fees_verified_at end,
  verified_at          = now()
from (values
  ${values}
) as v(id, ed, ea, rd, fee, waiver)
where c.scorecard_id = v.id;`
writeFileSync(process.argv[2] ?? 'deadlines.sql', sql)
console.log(`${updates.length} rows, ${sql.length} bytes -> ${process.argv[2] ?? 'deadlines.sql'}`)
