// Pure, source-agnostic normalizers: turn a loosely-typed source record into
// the shape our `fafsa_scholarships` table expects. No I/O, no Deno globals —
// deliberately easy to reason about and unit-test.

/** A normalized row ready to upsert (minus bookkeeping columns). */
export interface NormalizedScholarship {
  slug: string
  name: string
  provider: string | null
  description: string | null
  eligibility_summary: string | null
  award_amount_cents: number | null
  award_amount_note: string | null
  deadline: string | null // YYYY-MM-DD
  deadline_display: string | null
  min_gpa: number | null
  num_awards_per_year: number | null
  demographic_tags: string[]
  application_requirements: string[]
  url: string | null
  source_external_id: string
  raw?: unknown // original source record, kept for audit
}

/** Read the first present, non-empty value among candidate keys (case-insensitive). */
export function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  const lowerMap = new Map<string, unknown>()
  for (const [k, v] of Object.entries(obj)) lowerMap.set(k.toLowerCase(), v)
  for (const key of keys) {
    const v = lowerMap.get(key.toLowerCase())
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}

function asString(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

/**
 * Parse an award amount into cents plus a human note.
 * Handles numeric fields ("5000"), currency text ("$1,000"), ranges
 * ("$500 - $2,500", "Up to $10,000"), and vague text ("Varies").
 * Returns the MAX of any range as the sortable cents value.
 */
export function parseAmount(
  maxRaw: unknown,
  minRaw: unknown,
  textRaw: unknown,
): { cents: number | null; note: string | null } {
  const nums: number[] = []
  const pushNum = (v: unknown) => {
    if (v === undefined || v === null) return
    // Pull every number out of the value (handles "$1,000 - $2,500").
    const matches = String(v).replace(/,/g, '').match(/\d+(\.\d+)?/g)
    if (matches) for (const m of matches) { const n = parseFloat(m); if (n > 0) nums.push(n) }
  }
  pushNum(maxRaw)
  pushNum(minRaw)
  pushNum(textRaw)

  const text = asString(textRaw)
  if (nums.length === 0) {
    // No parseable figure — keep any descriptive text ("Varies", "Full tuition").
    return { cents: null, note: text }
  }
  const max = Math.max(...nums)
  const min = Math.min(...nums)
  const cents = Math.round(max * 100)
  let note = text
  if (!note) {
    note = min !== max
      ? `$${min.toLocaleString('en-US')} – $${max.toLocaleString('en-US')}`
      : `$${max.toLocaleString('en-US')}`
  }
  return { cents, note }
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

function pad(n: number): string { return n < 10 ? `0${n}` : `${n}` }

function isValidYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/**
 * Parse a free-text deadline into a real ISO date (YYYY-MM-DD) when possible.
 * Recurring/vague values ("Varies", "Rolling", "Annual", "5/1") yield a null
 * date but keep their display text. `null` date = "no fixed date we can trust".
 */
export function parseDeadline(raw: unknown): { date: string | null; display: string | null } {
  const s = asString(raw)
  if (!s) return { date: null, display: null }
  const lower = s.toLowerCase()
  if (/(var|roll|continu|ongoing|annual|none|n\/a|open|year\s*round)/.test(lower)) {
    return { date: null, display: s }
  }

  // MM/DD/YYYY or M/D/YY
  let m = s.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/)
  if (m) {
    const mm = +m[1], dd = +m[2]
    let yy = +m[3]
    if (yy < 100) yy += 2000
    if (isValidYmd(yy, mm, dd)) return { date: `${yy}-${pad(mm)}-${pad(dd)}`, display: s }
  }

  // "Month DD, YYYY" or "Month DD YYYY"
  m = s.match(/\b([A-Za-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/)
  if (m) {
    const mon = MONTHS[m[1].slice(0, 3).toLowerCase()]
    const dd = +m[2], yy = +m[3]
    if (mon && isValidYmd(yy, mon, dd)) return { date: `${yy}-${pad(mon)}-${pad(dd)}`, display: s }
  }

  // ISO already present anywhere in the string
  m = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (m && isValidYmd(+m[1], +m[2], +m[3])) return { date: `${m[1]}-${m[2]}-${m[3]}`, display: s }

  // A month + day with no year (recurring) — keep display, no trustworthy date.
  return { date: null, display: s }
}

/** Parse a GPA like "3.0" / "3.5 minimum" into a number in [0, 5], else null. */
export function parseGpa(raw: unknown): number | null {
  const s = asString(raw)
  if (!s) return null
  const m = s.match(/\d(\.\d+)?/)
  if (!m) return null
  const n = parseFloat(m[0])
  return n >= 0 && n <= 5 ? n : null
}

// Keyword -> tag rules, targeting the vocabulary the app already filters on.
// Order doesn't matter; every matching rule contributes its tag(s).
const TAG_RULES: Array<{ re: RegExp; tags: string[] }> = [
  { re: /\bstem\b|science, technology/i, tags: ['stem'] },
  { re: /engineering/i, tags: ['engineering', 'stem'] },
  { re: /computer science|software|coding/i, tags: ['computer_science', 'stem'] },
  { re: /\bnursing\b/i, tags: ['nursing', 'healthcare'] },
  { re: /\bbiology\b/i, tags: ['biology', 'science'] },
  { re: /chemistry/i, tags: ['chemistry', 'science'] },
  { re: /\bmath(ematics)?\b/i, tags: ['math', 'stem'] },
  { re: /\bresearch\b/i, tags: ['research'] },
  { re: /\bscience\b/i, tags: ['science', 'stem'] },
  { re: /health\s?care|medical|medicine|health profession/i, tags: ['healthcare'] },
  { re: /\bwomen\b|\bfemale\b|\bgirls\b/i, tags: ['female'] },
  { re: /hispanic|latino|latina|latinx/i, tags: ['hispanic', 'latino'] },
  { re: /black|african[\s-]?american/i, tags: ['black'] },
  { re: /asian|pacific islander/i, tags: ['asian_pacific_islander'] },
  { re: /native american|american indian|indigenous|alaska native/i, tags: ['native_american'] },
  { re: /first[\s-]?gen/i, tags: ['first_gen'] },
  { re: /financial need|need[\s-]?based|low[\s-]?income|economically disadvantaged/i, tags: ['financial_need', 'low_income'] },
  { re: /\bpell\b/i, tags: ['pell_eligible', 'financial_need'] },
  { re: /disabilit/i, tags: ['disability'] },
  { re: /\bdeaf\b|hard of hearing/i, tags: ['deaf', 'disability'] },
  { re: /\bblind\b|visually impaired/i, tags: ['blind', 'disability'] },
  { re: /\bveteran/i, tags: ['veteran', 'military_family'] },
  { re: /\bmilitary\b|armed forces|army|navy|air force|marine/i, tags: ['military_family'] },
  { re: /lgbtq|gay|lesbian|transgender|queer/i, tags: ['lgbtq'] },
  { re: /leadership/i, tags: ['leadership'] },
  { re: /community service|volunteer|civic/i, tags: ['service'] },
  { re: /\bmerit\b|academic (achievement|excellence)|outstanding student/i, tags: ['merit'] },
  { re: /essay|writing|written/i, tags: ['writing'] },
  { re: /journalism/i, tags: ['journalism', 'writing'] },
  { re: /\bart(s|ist)?\b|visual arts/i, tags: ['arts'] },
  { re: /\bmusic\b/i, tags: ['music', 'arts'] },
  { re: /immigrant/i, tags: ['immigrant'] },
  { re: /\bdaca\b/i, tags: ['daca', 'immigrant'] },
  { re: /undocumented/i, tags: ['undocumented', 'immigrant'] },
  { re: /single parent|single mother|single father/i, tags: ['single_parent'] },
  { re: /foster (youth|care|child)/i, tags: ['foster_youth'] },
  { re: /\brural\b/i, tags: ['rural'] },
  { re: /agricultur|farming|\bfarm\b/i, tags: ['agriculture'] },
  { re: /teach(ing|er)|education major/i, tags: ['teaching'] },
  { re: /muslim|islamic/i, tags: ['muslim'] },
  { re: /catholic/i, tags: ['catholic'] },
]

/** Derive demographic/interest tags from the record's text. Conservative. */
export function deriveTags(corpus: string): string[] {
  const found = new Set<string>()
  for (const rule of TAG_RULES) {
    if (rule.re.test(corpus)) for (const t of rule.tags) found.add(t)
  }
  return [...found]
}

/** URL-safe, stable slug for an ingested row: cos-<externalId>. */
export function ingestSlug(sourcePrefix: string, externalId: string): string {
  return `${sourcePrefix}-${externalId}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-')
}
