// College Scorecard -> Supabase `colleges` ingest.
// Usage:
//   node ingest.mjs --test     # fetch & upsert only the first page (100 rows), print a sample
//   node ingest.mjs            # full ingest (all ~6,300 institutions)
//
// Reads SCORECARD_API_KEY / SCORECARD_API_BASE from ./.env
// Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from ../../web/.env.local
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const TEST = process.argv.includes('--test')

function loadEnv(path) {
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}
const local = loadEnv(new URL('./.env', import.meta.url).pathname)
const web = loadEnv(new URL('../../web/.env.local', import.meta.url).pathname)
const API_KEY = local.SCORECARD_API_KEY
const API_BASE = local.SCORECARD_API_BASE || 'https://api.data.gov/ed/collegescorecard/v1/schools'
if (!API_KEY) { console.error('Missing SCORECARD_API_KEY in scripts/ingest-colleges/.env'); process.exit(1) }
const supabase = createClient(web.VITE_SUPABASE_URL, web.VITE_SUPABASE_ANON_KEY)

// ---- field list requested from the API ----
const FIELDS = [
  'id', 'school.name', 'school.city', 'school.state', 'school.ownership', 'school.locale',
  'school.degrees_awarded.predominant', 'school.school_url', 'school.price_calculator_url',
  'location.lat', 'location.lon',
  'latest.student.size',
  'latest.admissions.admission_rate.overall',
  'latest.admissions.sat_scores.25th_percentile.critical_reading',
  'latest.admissions.sat_scores.75th_percentile.critical_reading',
  'latest.admissions.sat_scores.25th_percentile.math',
  'latest.admissions.sat_scores.75th_percentile.math',
  'latest.admissions.act_scores.25th_percentile.cumulative',
  'latest.admissions.act_scores.75th_percentile.cumulative',
  'latest.cost.avg_net_price.overall',
  'latest.cost.attendance.academic_year',
  'latest.cost.net_price.public.by_income_level',
  'latest.cost.net_price.private.by_income_level',
  'latest.completion.completion_rate_4yr_150nt',
  'latest.completion.completion_rate_less_than_4yr_150nt',
  'latest.completion.transfer_rate.4yr.full_time',
  'latest.earnings.10_yrs_after_entry.median',
  'latest.aid.pell_grant_rate',
  'latest.academics.program_percentage',
].join(',')

// ---- derivations ----
const REGION = {
  Northeast: 'CT ME MA NH RI VT NJ NY PA', Midwest: 'IL IN MI OH WI IA KS MN MO NE ND SD',
  South: 'DE FL GA MD NC SC VA DC WV AL KY MS TN AR LA OK TX', West: 'AZ CO ID MT NV NM UT WY AK CA HI OR WA',
}
function region(st) { for (const [r, list] of Object.entries(REGION)) if (list.split(' ').includes(st)) return r; return 'Territories' }
const TYPE = { 1: 'trade', 2: '2yr', 3: '4yr', 4: 'grad' }
const OWN = { 1: 'public', 2: 'private_nonprofit', 3: 'private_forprofit' }
function locale(code) { if (code == null) return null; const t = Math.floor(code / 10); return { 1: 'city', 2: 'suburb', 3: 'town', 4: 'rural' }[t] || null }
const cents = (d) => (d == null ? null : Math.round(d * 100))
const usedSlugs = new Set()
function slugify(name, st, id) {
  let base = `${name} ${st || ''}`.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 70)
  let s = base
  if (usedSlugs.has(s)) s = `${base}_${id}`
  usedSlugs.add(s); return s
}
const NP_PUB = 'latest.cost.net_price.public.by_income_level.'
const NP_PRIV = 'latest.cost.net_price.private.by_income_level.'
function incomeBrackets(r) {
  const pick = (bracket) => cents(r[NP_PUB + bracket] ?? r[NP_PRIV + bracket])
  const o = { '0_30k': pick('0-30000'), '30k_48k': pick('30001-48000'), '48k_75k': pick('48001-75000'), '75k_110k': pick('75001-110000'), '110k_plus': pick('110001-plus') }
  return Object.values(o).some(v => v != null) ? o : null
}
const PP = 'latest.academics.program_percentage.'
function programs(r) {
  const o = {}
  for (const [k, v] of Object.entries(r)) if (k.startsWith(PP) && typeof v === 'number' && v > 0) o[k.slice(PP.length)] = v
  return Object.keys(o).length ? o : null
}
function mapRow(r) {
  const st = r['school.state']
  const pred = r['school.degrees_awarded.predominant']
  return {
    scorecard_id: r['id'],
    name: r['school.name'],
    slug: slugify(r['school.name'], st, r['id']),
    institution_type: TYPE[pred] || 'other',
    city: r['school.city'] || null,
    state: st || null,
    region: st ? region(st) : null,
    ownership: OWN[r['school.ownership']] || null,
    locale: locale(r['school.locale']),
    latitude: r['location.lat'] ?? null,
    longitude: r['location.lon'] ?? null,
    size: r['latest.student.size'] ?? null,
    admit_rate: r['latest.admissions.admission_rate.overall'] ?? null,
    sat_reading_25: r['latest.admissions.sat_scores.25th_percentile.critical_reading'] ?? null,
    sat_reading_75: r['latest.admissions.sat_scores.75th_percentile.critical_reading'] ?? null,
    sat_math_25: r['latest.admissions.sat_scores.25th_percentile.math'] ?? null,
    sat_math_75: r['latest.admissions.sat_scores.75th_percentile.math'] ?? null,
    act_25: r['latest.admissions.act_scores.25th_percentile.cumulative'] ?? null,
    act_75: r['latest.admissions.act_scores.75th_percentile.cumulative'] ?? null,
    avg_net_price_cents: cents(r['latest.cost.avg_net_price.overall']),
    net_price_by_income: incomeBrackets(r),
    cost_of_attendance_cents: cents(r['latest.cost.attendance.academic_year']),
    programs: programs(r),
    grad_rate: r['latest.completion.completion_rate_4yr_150nt'] ?? r['latest.completion.completion_rate_less_than_4yr_150nt'] ?? null,
    transfer_rate: r['latest.completion.transfer_rate.4yr.full_time'] ?? null,
    median_earnings_10yr_cents: cents(r['latest.earnings.10_yrs_after_entry.median']),
    pell_pct: r['latest.aid.pell_grant_rate'] ?? null,
    npc_url: r['school.price_calculator_url'] || null,
    url: r['school.school_url'] || null,
    source: 'scorecard',
    status: 'published',
    last_seen_at: new Date().toISOString(),
    verified_at: new Date().toISOString(),
  }
}

async function fetchPage(page) {
  const url = `${API_BASE}?fields=${FIELDS}&per_page=100&page=${page}&api_key=${API_KEY}`
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(45000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      if (attempt === 3) throw e
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
    }
  }
}

async function upsert(rows) {
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500)
    const { error } = await supabase.from('colleges').upsert(batch, { onConflict: 'scorecard_id' })
    if (error) throw new Error(`upsert failed at row ${i}: ${error.message}`)
  }
}

// ---- run ----
const startedAt = new Date().toISOString()
const first = await fetchPage(0)
const total = first.metadata.total
const pages = Math.ceil(total / 100)
console.log(`Scorecard total: ${total} institutions across ${pages} pages`)

let all = first.results.map(mapRow)
if (TEST) {
  console.log('SAMPLE row:', JSON.stringify(all.find(r => r.name?.includes('Stanford')) || all[0], null, 2))
  await upsert(all)
  console.log(`TEST: upserted first page (${all.length} rows)`)
  process.exit(0)
}

await upsert(all)
let done = all.length
for (let p = 1; p < pages; p++) {
  const data = await fetchPage(p)
  const rows = data.results.map(mapRow)
  await upsert(rows)
  done += rows.length
  if (p % 5 === 0 || p === pages - 1) console.log(`  ...${done}/${total} upserted (page ${p + 1}/${pages})`)
}
console.log(`DONE: ${done} institutions ingested.`)

// Best-effort audit log (needs the temp anon-insert policy on college_ingest_runs; see README).
const { error: logErr } = await supabase.from('college_ingest_runs')
  .insert({ started_at: startedAt, finished_at: new Date().toISOString(), fetched: total, upserted: done, status: 'ok' })
console.log(logErr ? `Run-log skipped (${logErr.message})` : 'Logged ingest run to college_ingest_runs.')
