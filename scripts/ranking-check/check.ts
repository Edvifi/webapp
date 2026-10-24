// Run students through the real ranking (match_colleges in Postgres, then the
// engine and Discover's ordering) and check what they'd see. Build the
// database first with load.mjs.
//
// Usage: DATABASE_URL=... node scripts/ranking-check/check.ts
// Prints a report and writes out/report.md and out/snapshot.json; a second run
// says which students' top tens changed since the last.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import * as E from '../../web/src/lib/collegeMatch.ts'

const DB = process.env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:5432/postgres'
const out = new URL('./out/', import.meta.url).pathname
mkdirSync(out, { recursive: true })
const sql = (q: string) => execFileSync('psql', [DB, '-tAc', q], { maxBuffer: 1 << 28 }).toString().trim()

type Profile = E.StudentCollegeProfile & { openToTransfer: boolean; openToTrade: boolean }
interface Persona { name: string; p: Profile }
type Row = { c: E.College; m: E.CollegeMatch }

/* ── who: a few hand-written students, plus a grid over the inputs that matter ── */

const base = { prefOwnership: 'either' as const, prefMaxDistance: 'anywhere' as const, openToTransfer: true, openToTrade: false }
const named: Persona[] = [
  { name: 'CA nursing, $25k, 3.4, no SAT, in-state', p: { ...base, gender: 'Female', gpa: 3.4, familyIncomeCents: 25_000_00, homeState: 'CA', prefMaxDistance: 'in_state' } },
  { name: 'MI, $60k, 3.9 / 1450', p: { ...base, gender: 'Male', gpa: 3.9, satTotal: 1450, familyIncomeCents: 60_000_00, homeState: 'MI', openToTransfer: false } },
  { name: 'NJ, $180k, 4.0 / 1540, private only', p: { ...base, gender: 'Female', gpa: 4, satTotal: 1540, familyIncomeCents: 180_000_00, homeState: 'NJ', prefOwnership: 'private', openToTransfer: false } },
  { name: 'TX, $40k, 2.8, no SAT, trade, in-state', p: { ...base, gender: 'Male', gpa: 2.8, familyIncomeCents: 40_000_00, homeState: 'TX', prefMaxDistance: 'in_state', openToTrade: true } },
  { name: 'GA, $70k, 3.7 / 1300, large city, in-region', p: { ...base, gender: 'Female', gpa: 3.7, satTotal: 1300, familyIncomeCents: 70_000_00, homeState: 'GA', prefMaxDistance: 'in_region', prefSize: 'large', prefSettings: ['city'], openToTransfer: false } },
  { name: 'OH, no income, 3.2 / 1100, small', p: { ...base, gpa: 3.2, satTotal: 1100, homeState: 'OH', prefSize: 'small', openToTransfer: false } },
  { name: 'PR, $20k, 3.5, no SAT', p: { ...base, gender: 'Female', gpa: 3.5, familyIncomeCents: 20_000_00, homeState: 'PR', openToTransfer: false } },
  { name: 'WA, $90k, 3.5 / 1200, public in-state', p: { ...base, gender: 'Male', gpa: 3.5, satTotal: 1200, familyIncomeCents: 90_000_00, homeState: 'WA', prefOwnership: 'public', prefMaxDistance: 'in_state', openToTransfer: false } },
  { name: 'NY, skipped the form', p: { ...base, homeState: 'NY' } },
  { name: 'OH, $35k, 2.6, no SAT, trade, in-state', p: { ...base, gender: 'Male', gpa: 2.6, familyIncomeCents: 35_000_00, homeState: 'OH', prefMaxDistance: 'in_state', openToTrade: true } },
  { name: 'WY, $55k, 3.3 / 1150, in-state', p: { ...base, gpa: 3.3, satTotal: 1150, familyIncomeCents: 55_000_00, homeState: 'WY', prefMaxDistance: 'in_state' } },
  { name: 'MS, first-gen, $28k, 3.95 / 1420', p: { ...base, gender: 'Male', gpa: 3.95, satTotal: 1420, familyIncomeCents: 28_000_00, homeState: 'MS' } },
  { name: 'CA, 4.0, no SAT yet', p: { ...base, gender: 'Female', gpa: 4, familyIncomeCents: 90_000_00, homeState: 'CA', openToTransfer: false } },
]
const grid: Persona[] = []
for (const state of ['CA', 'TX', 'NY', 'OH', 'GA', 'MN', 'WA'])
  for (const gpa of [2.7, 3.3, 3.8])
    for (const sat of [null, 1100, 1350, 1500])
      for (const income of [25_000_00, 65_000_00, 150_000_00, null])
        for (const distance of ['anywhere', 'in_state'] as const) {
          const gender = ['Male', 'Female', null][grid.length % 3]
          grid.push({
            name: `${state} ${gpa}/${sat ?? '-'} ${income ? `$${income / 100_000}k` : 'no income'} ${distance}${gender ? ` ${gender[0]}` : ''}`,
            p: { ...base, gender, gpa, satTotal: sat, familyIncomeCents: income, homeState: state, prefMaxDistance: distance },
          })
        }

/* ── the pipeline Discover runs ── */

function feed({ p }: Persona, fn = 'match_colleges'): Row[] {
  const args = {
    income_bracket: E.incomeBracketFromCents(p.familyIncomeCents), intended_fields: [], home_state: p.homeState,
    region: E.regionOf(p.homeState), pref_distance: p.prefMaxDistance, pref_ownership: p.prefOwnership, origin: null, open_to_trade: p.openToTrade,
  }
  const rows: E.College[] = JSON.parse(sql(`select coalesce(json_agg(c), '[]') from public.${fn}('${JSON.stringify(args)}'::jsonb, 300) c`))
  const scored = rows
    .filter((c) => E.isUndergradTarget(c) && !E.leftOutOfFeed(c, p.homeState, p.gender))
    .map((c) => ({ c, m: E.scoreCollegeForProfile(c, p) }))
    .filter(({ m }) => !(m.pathway === 'community_transfer' && !p.openToTransfer) && !(m.pathway === 'career_technical' && !p.openToTrade))
    .map((r) => ({ ...r, rank: E.feedRank(r.c, r.m, [], p) }))
    .sort((a, b) => b.rank - a.rank || b.m.dimensions.outcomes - a.m.dimensions.outcomes)
  return E.spreadReaches(scored, (r) => r.m.band === 'reach')
}

/* ── rules every student's feed must keep ── */

const fourYr = (r: Row) => r.c.institution_type === '4yr'
const rules: Array<[string, (f: Row[], p: Profile) => boolean]> = [
  ['has schools to show', (f) => f.length > 0],
  ['no two reaches in a row in the top 20 (unless only reaches are left)', (f) => f.slice(0, 20).every((r, i, top) =>
    !(r.m.band === 'reach' && top[i + 1]?.m.band === 'reach') || f.slice(i + 2).every((x) => x.m.band === 'reach'))],
  ['every long shot ranks below every realistic school', (f) => {
    const last = f.findLastIndex((r) => r.m.academicGap !== 'long_shot')
    return f.slice(0, last + 1).every((r) => r.m.academicGap !== 'long_shot')
  }],
  ['in-state means in-state', (f, p) => p.prefMaxDistance !== 'in_state' || f.every((r) => r.c.state === p.homeState)],
  ['public / private preference holds for four-years', (f, p) => p.prefOwnership === 'either' ||
    f.filter(fourYr).every((r) => (r.c.ownership === 'public') === (p.prefOwnership === 'public'))],
  ['no college that excludes their gender', (f, p) => !f.some((r) => (r.c.single_sex === 'women' && p.gender === 'Male') || (r.c.single_sex === 'men' && p.gender === 'Female'))],
  // Completion counts transfer-out, as the feed's own floor does: a branch
  // campus whose students move on to the main campus isn't failing them.
  ['top 10 four-years complete (graduate or transfer) 50%+ on average', (f) => { const t = f.slice(0, 10).filter(fourYr); return !t.length || avg(t.map(completion)) >= 0.5 }],
  ['at most 3 reaches in the top 10', (f) => f.slice(0, 10).filter((r) => r.m.band === 'reach').length <= 3],
]
const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / (a.length || 1)
const completion = (r: Row) => Math.min(1, (r.c.grad_rate ?? 0.5) + (r.c.transfer_rate ?? 0))

/* ── rules about single schools, across many students ── */

const BAND = { reach: 0, unknown: 1, target: 1, likely: 2, open: 3 }
function schoolRules(sample: E.College[]): string[] {
  const broken: string[] = []
  for (const c of sample) {
    const bands = [1000, 1150, 1300, 1450, 1600].map((sat) => BAND[E.admissionBand(c, { satTotal: sat }).band])
    if (bands.some((b, i) => i && b < bands[i - 1])) broken.push(`${c.name}: a higher SAT got a worse band (${bands})`)
    const gpaBands = [2.5, 3, 3.5].map((gpa) => BAND[E.admissionBand(c, { gpa }).band])
    if (gpaBands.some((b, i) => i && b < gpaBands[i - 1])) broken.push(`${c.name}: a higher GPA got a worse band (${gpaBands})`)
    if (c.ownership === 'public' && c.state) {
      const home = E.netPriceForYouCents(c, { homeState: c.state }), away = E.netPriceForYouCents(c, { homeState: c.state === 'TX' ? 'CA' : 'TX' })
      if (home != null && away != null && away < home) broken.push(`${c.name}: out-of-state priced below in-state`)
    }
    const prices = [20_000_00, 40_000_00, 60_000_00, 90_000_00, 150_000_00].map((i) => E.netPriceForYouCents(c, { familyIncomeCents: i, homeState: c.state }))
    if (prices.some((v, i) => i && v != null && prices[i - 1] != null && v < 0.75 * prices[i - 1]!)) broken.push(`${c.name}: a richer family priced far below a poorer one`)
    const fit = E.scoreCollegeForProfile(c, { gpa: 3.5, homeState: c.state }).fitScore
    if (!(fit >= 0 && fit <= 100)) broken.push(`${c.name}: fit ${fit} outside 0-100`)
  }
  return broken
}

/* ── run ── */

const wellKnown = (r: Row) => [15, 16, 21].includes(r.c.carnegie_basic ?? 0)
const everyone = [...named, ...grid]
const failures = new Map<string, string[]>()
const snapshot: Record<string, string[]> = {}
const seen = new Map<string, number>()
const stats: Array<{ name: string; grad: number; known: number; reaches: number; noPrice: number }> = []
for (const persona of everyone) {
  const f = feed(persona)
  for (const [rule, ok] of rules) if (!ok(f, persona.p)) failures.set(rule, [...(failures.get(rule) ?? []), persona.name])
  const top = f.slice(0, 10)
  snapshot[persona.name] = top.map((r) => r.c.name)
  for (const r of top) seen.set(r.c.name, (seen.get(r.c.name) ?? 0) + 1)
  const fy = top.filter(fourYr)
  stats.push({ name: persona.name, grad: avg(fy.map((r) => r.c.grad_rate ?? 0.5)), known: fy.length ? fy.filter(wellKnown).length / fy.length : 1,
    reaches: top.filter((r) => r.m.band === 'reach').length, noPrice: top.filter((r) => r.m.netPriceForYouCents == null).length })
}
const sample: E.College[] = JSON.parse(sql(`select json_agg(c) from (select * from public.colleges where institution_type = '4yr' order by md5(id::text) limit 600) c`))
const broken = schoolRules(sample)

const pct = (x: number) => `${Math.round(x * 100)}%`
const lines = [
  `# Ranking check: ${everyone.length} students (${named.length} written, ${grid.length} generated), ${sample.length} schools`,
  '', '## Rules', ...rules.map(([r]) => `- ${failures.has(r) ? `FAIL (${failures.get(r)!.length})` : 'pass'}: ${r}${failures.has(r) ? `, e.g. ${failures.get(r)!.slice(0, 3).join('; ')}` : ''}`),
  `- ${broken.length ? `FAIL (${broken.length})` : 'pass'}: per-school rules (bands rise with scores, out-of-state ≥ in-state, price brackets, fit range)`,
  ...broken.slice(0, 8).map((b) => `  - ${b}`),
  '', '## Top tens',
  `- Average graduation rate (four-years): ${pct(avg(stats.map((s) => s.grad)))}; worst: ${[...stats].sort((a, b) => a.grad - b.grad).slice(0, 3).map((s) => `${s.name} ${pct(s.grad)}`).join('; ')}`,
  `- Well-known four-years (R1, R2, liberal arts): ${pct(avg(stats.map((s) => s.known)))}; lowest: ${[...stats].sort((a, b) => a.known - b.known).slice(0, 3).map((s) => `${s.name} ${pct(s.known)}`).join('; ')}`,
  `- Reaches per top ten: ${avg(stats.map((s) => s.reaches)).toFixed(1)}; schools with no price: ${avg(stats.map((s) => s.noPrice)).toFixed(1)}`,
  `- Most repeated: ${[...seen].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n, k]) => `${n} (${pct(k / everyone.length)})`).join(', ')}`,
]
const prevFile = `${out}snapshot.json`
if (existsSync(prevFile)) {
  const prev: Record<string, string[]> = JSON.parse(readFileSync(prevFile, 'utf8'))
  const changed = Object.keys(snapshot).filter((k) => prev[k] && prev[k].join() !== snapshot[k].join())
  lines.push('', `## Since the last run: ${changed.length} of ${everyone.length} top tens changed`,
    ...changed.slice(0, 5).map((k) => `- ${k}: -${prev[k].filter((n) => !snapshot[k].includes(n)).join(', ') || 'none'} / +${snapshot[k].filter((n) => !prev[k].includes(n)).join(', ') || 'reordered'}`))
}
lines.push('', '## Written students', ...named.map((n) => `- ${n.name}: ${snapshot[n.name].join(', ')}`))
writeFileSync(prevFile, JSON.stringify(snapshot, null, 1))
writeFileSync(`${out}report.md`, lines.join('\n') + '\n')
console.log(lines.join('\n'))
process.exitCode = failures.size || broken.length ? 1 : 0
