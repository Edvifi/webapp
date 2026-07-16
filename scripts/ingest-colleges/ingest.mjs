/**
 * ingest-colleges — pulls every 4-year institution from the U.S. Dept. of
 * Education College Scorecard and emits SQL to upsert them into the `colleges`
 * table. Deadlines aren't in Scorecard, so we apply flagged smart defaults
 * (deadlines_estimated=true). Logos are rendered client-side via logo.dev from
 * the stored domain — nothing logo-related happens here.
 *
 *   SCORECARD_API_KEY=xxx node scripts/ingest-colleges/ingest.mjs > /tmp/colleges.sql
 *   psql "$LOCAL_DB" -f /tmp/colleges.sql
 */

const API_KEY = process.env.SCORECARD_API_KEY || 'DEMO_KEY'
const BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools'
const FIELDS = [
  'id', 'school.name', 'school.city', 'school.state', 'school.school_url',
  'school.ownership', 'latest.cost.attendance.academic_year',
  'latest.cost.avg_net_price.overall', 'latest.admissions.admission_rate.overall',
].join(',')

const OWNERSHIP = { 1: 'Public', 2: 'Private nonprofit', 3: 'Private for-profit' }

// Estimated defaults for the whole cohort (flagged deadlines_estimated=true).
const EST_APP = { earlyAction: 'Nov 1, 2026', earlyDecision: null, regularDecision: 'Jan 1, 2027' }
const EST_AID = { fafsaPriority: 'Feb 1, 2027', cssProfile: null, aidNotification: 'Apr 2027' }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function domainOf(url) {
  if (!url) return null
  try {
    const withProto = url.startsWith('http') ? url : `https://${url}`
    const host = new URL(withProto).host.replace(/^www\./, '')
    const parts = host.split('.')
    return parts.length > 2 ? parts.slice(-2).join('.') : host
  } catch {
    return null
  }
}

const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const numOrNull = (v) => (v == null || Number.isNaN(v) ? 'null' : String(v))
const jsonb = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`

async function fetchPage(page) {
  const url = `${BASE}?api_key=${API_KEY}&school.degrees_awarded.predominant=3,4&_fields=${FIELDS}&per_page=100&page=${page}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Scorecard page ${page}: HTTP ${res.status} ${await res.text()}`)
  return res.json()
}

async function main() {
  const first = await fetchPage(0)
  const total = first.metadata.total
  const pages = Math.ceil(total / 100)
  const results = [...first.results]
  process.stderr.write(`Scorecard: ${total} schools across ${pages} pages\n`)
  for (let p = 1; p < pages; p++) {
    await sleep(250) // be polite / stay under rate limits
    const d = await fetchPage(p)
    results.push(...d.results)
    process.stderr.write(`  fetched page ${p + 1}/${pages} (${results.length})\r`)
  }
  process.stderr.write(`\n`)

  const rows = results
    .filter((r) => r['school.name'] && r.id)
    .map((r) => {
      const dom = domainOf(r['school.school_url'])
      const rate = r['latest.admissions.admission_rate.overall']
      return `(${q(String(r.id))}, ${q(r['school.name'])}, ${q(r['school.city'])}, ${q(r['school.state'])}, ` +
        `${q(OWNERSHIP[r['school.ownership']] ?? 'Private nonprofit')}, ${q(dom)}, ` +
        `${numOrNull(r['latest.cost.attendance.academic_year'])}, ${numOrNull(r['latest.cost.avg_net_price.overall'])}, ` +
        `${numOrNull(rate)}, ${jsonb(EST_APP)}, ${jsonb(EST_AID)}, true, ` +
        `'scorecard', ${q(String(r.id))}, 'published')`
    })

  process.stdout.write(
    `insert into public.colleges
  (slug, name, city, state, type, website,
   cost_of_attendance, avg_net_price, acceptance_rate,
   application_deadlines, financial_aid_deadlines, deadlines_estimated,
   source, source_external_id, status)
values
${rows.join(',\n')}
on conflict (slug) do update set
  name = excluded.name, city = excluded.city, state = excluded.state,
  type = excluded.type, website = excluded.website,
  cost_of_attendance = excluded.cost_of_attendance,
  avg_net_price = excluded.avg_net_price,
  acceptance_rate = excluded.acceptance_rate,
  updated_at = now();
`,
  )
  process.stderr.write(`emitted ${rows.length} rows\n`)
}

main().catch((e) => { process.stderr.write(String(e) + '\n'); process.exit(1) })
