// Build a local Postgres copy of the college data for check.ts: every
// published college (read with the app's anon key), the ranking migrations,
// and the columns the ingest will fill once it reruns (Carnegie class and
// tuition from IPEDS, single-sex flags from Scorecard).
//
// Usage: DATABASE_URL=postgres://postgres@127.0.0.1:5432/postgres node scripts/ranking-check/load.mjs
// Needs psql and unzip on PATH. Writes nothing outside the target database
// and scripts/ranking-check/data/.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const here = new URL('.', import.meta.url).pathname
const root = new URL('../../', import.meta.url).pathname
const DB = process.env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:5432/postgres'
const data = `${here}data`
mkdirSync(data, { recursive: true })
const psql = (args, input) => execFileSync('psql', [DB, '-v', 'ON_ERROR_STOP=1', '-q', ...args], { input, maxBuffer: 1 << 28 }).toString()

const env = Object.fromEntries(readFileSync(`${root}web/.env.local`, 'utf8').split('\n')
  .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim().replace(/^"|"$/g, '')]))

const COLS = ['id', 'scorecard_id', 'name', 'slug', 'institution_type', 'city', 'state', 'region', 'ownership', 'locale', 'size',
  'latitude', 'longitude', 'admit_rate', 'admit_rate_in_state', 'admit_rate_out_of_state', 'test_policy', 'sat_reading_25', 'sat_reading_75', 'sat_math_25', 'sat_math_75', 'act_25', 'act_75',
  'avg_net_price_cents', 'net_price_by_income', 'cost_of_attendance_cents', 'programs', 'grad_rate', 'transfer_rate',
  'median_earnings_10yr_cents', 'pell_pct', 'npc_url', 'url', 'status']
const TYPES = { id: 'uuid primary key', scorecard_id: 'int', size: 'int', latitude: 'numeric', longitude: 'numeric', admit_rate: 'numeric', admit_rate_in_state: 'numeric', admit_rate_out_of_state: 'numeric',
  sat_reading_25: 'int', sat_reading_75: 'int', sat_math_25: 'int', sat_math_75: 'int', act_25: 'int', act_75: 'int',
  avg_net_price_cents: 'int', net_price_by_income: 'jsonb', cost_of_attendance_cents: 'int', programs: 'jsonb', grad_rate: 'numeric',
  transfer_rate: 'numeric', median_earnings_10yr_cents: 'int', pell_pct: 'numeric' }

console.log('colleges: fetching published rows…')
const rows = []
for (let off = 0; ; off += 1000) {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/colleges?select=${COLS.join(',')}&status=eq.published&order=id&offset=${off}&limit=1000`,
    { headers: { apikey: env.VITE_SUPABASE_ANON_KEY } })
  const page = await res.json()
  rows.push(...page)
  if (page.length < 1000) break
}
const cell = (v) => v == null ? '\\N' : String(typeof v === 'object' ? JSON.stringify(v) : v).replace(/\\/g, '\\\\').replace(/[\t\n]/g, ' ')
psql(['-c', `do $$ begin create role anon; exception when duplicate_object then null; end $$;
  do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
  drop table if exists public.colleges cascade;
  create table public.colleges (${COLS.map((c) => `${c} ${TYPES[c] ?? 'text'}`).join(', ')});`])
psql(['-c', `copy public.colleges(${COLS.join(',')}) from stdin`], `${rows.map((r) => COLS.map((c) => cell(r[c])).join('\t')).join('\n')}\n\\.\n`)
console.log(`colleges: ${rows.length} loaded`)

// The ranking functions, as they'd be in production after #70 merges, plus
// main's version under another name for old-vs-new comparisons.
const mig = `${root}supabase/migrations`
// Dropped first: a rerun would otherwise try to replace them with a different return type.
psql(['-c', 'drop function if exists public.match_colleges(jsonb, int); drop function if exists public.match_colleges_main(jsonb, int);'])
psql(['-f', `${mig}/20260715000000_college_match_rpc.sql`])
writeFileSync(`${data}/main_rpc.sql`, readFileSync(`${mig}/20261015000000_match_colleges_quality_floor.sql`, 'utf8')
  .replaceAll('public.match_colleges(', 'public.match_colleges_main('))
psql(['-f', `${data}/main_rpc.sql`])
psql(['-f', `${mig}/20261021000000_match_colleges_profile_fit.sql`])

// IPEDS (free, no key): Carnegie class (HD) and tuition (IC_AY), keyed by the
// same id Scorecard uses.
const ipeds = (file) => {
  const zip = `${data}/${file}.zip`
  if (!existsSync(zip)) execFileSync('curl', ['-sfL', '-o', zip, `https://nces.ed.gov/ipeds/datacenter/data/${file}.zip`])
  execFileSync('unzip', ['-o', '-q', zip, '-d', data])
  const csv = readFileSync(`${data}/${file.toLowerCase()}.csv`, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean)
  const split = (l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((f) => f.replace(/,$/, '').replace(/^"|"$/g, ''))
  const head = split(csv[0])
  return csv.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [head[i], v])))
}
const sql = []
for (const r of ipeds('HD2023')) if (+r.C21BASIC > 0) sql.push(`update public.colleges set carnegie_basic = ${+r.C21BASIC} where scorecard_id = ${+r.UNITID};`)
for (const r of ipeds('IC2023_AY')) {
  const [a, b] = [+r.CHG2AY3, +r.CHG3AY3]
  if (a > 0 && b > 0) sql.push(`update public.colleges set tuition_in_state_cents = ${a * 100}, tuition_out_of_state_cents = ${b * 100} where scorecard_id = ${+r.UNITID};`)
}
// Single-sex flags only live in Scorecard (two small queries; DEMO_KEY works).
const key = process.env.SCORECARD_API_KEY ?? 'DEMO_KEY'
for (const [flag, value] of [['women_only', 'women'], ['men_only', 'men']]) {
  const res = await fetch(`https://api.data.gov/ed/collegescorecard/v1/schools?fields=id&school.${flag}=1&per_page=100&api_key=${key}`)
  if (!res.ok) { console.warn(`single-sex: Scorecard said ${res.status}; skipping ${value}`); continue }
  for (const r of (await res.json()).results) sql.push(`update public.colleges set single_sex = '${value}' where scorecard_id = ${r.id};`)
}
psql([], `begin;\n${sql.join('\n')}\ncommit;\n`)
console.log(psql(['-tAc', `select 'enriched: ' || count(carnegie_basic) || ' carnegie, ' || count(tuition_out_of_state_cents) || ' tuition, ' || count(single_sex) || ' single-sex' from public.colleges`]).trim())
