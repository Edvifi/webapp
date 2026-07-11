// CareerOneStop (US Department of Labor) Web API adapter.
//
// THIS IS THE ONE FILE TO ADJUST if the live API's field names differ from the
// mapping below. Everything source-specific lives here; the rest of the
// pipeline is source-agnostic. The full API schema is gated behind
// registration, so `mapRecord` reads each logical field from a LIST of
// candidate keys (case-insensitive) — it degrades gracefully if a name differs
// rather than crashing. After you register and see a real response, confirm the
// keys in CANDIDATES below and (if needed) tweak them.
//
// Register for a free token: https://www.careeronestop.org/Developers/WebAPI/registration.aspx
// Auth: header `Authorization: Bearer <token>`; the userId is part of the path.

import {
  type NormalizedScholarship, pick, parseAmount, parseDeadline, parseGpa, deriveTags, ingestSlug,
} from './normalize.ts'

export const SOURCE = 'careeronestop'
const SLUG_PREFIX = 'cos'

// Candidate field names per logical field (first non-empty wins).
const CANDIDATES = {
  id: ['ScholarshipId', 'ScholarshipID', 'Id', 'ID'],
  name: ['ScholarshipName', 'AwardName', 'Title', 'Name'],
  provider: ['OrganizationName', 'Organization', 'Sponsor', 'Provider'],
  description: ['Purpose', 'PurposeText', 'Description', 'ScholarshipDescription'],
  eligibility: ['Qualifications', 'QualificationText', 'Eligibility', 'EligibilityText'],
  awardMax: ['MaximumAward', 'AwardAmountMax', 'MaxAward', 'Max_AwardAmount', 'AwardAmount'],
  awardMin: ['MinimumAward', 'AwardAmountMin', 'MinAward', 'Min_AwardAmount'],
  awardText: ['AwardAmountText', 'AwardText', 'Amount'],
  deadline: ['Deadline', 'ApplicationDeadline', 'DeadlineDate'],
  level: ['LevelOfStudy', 'StudyLevel', 'Level'],
  url: ['Url', 'ScholarshipUrl', 'ApplicationUrl', 'MoreInfoUrl', 'Link'],
  numAwards: ['NumberOfAwards', 'NumberAwarded', 'Awards'],
  gpa: ['GPA', 'MinimumGPA', 'MinGPA', 'GpaText'],
}

/** Map one raw CareerOneStop scholarship object to our normalized shape (or null if unusable). */
export function mapRecord(raw: Record<string, unknown>): NormalizedScholarship | null {
  const externalId = pick(raw, CANDIDATES.id)
  const name = pick(raw, CANDIDATES.name)
  if (externalId === undefined || name === undefined) return null

  const idStr = String(externalId)
  const provider = pick(raw, CANDIDATES.provider)
  const description = pick(raw, CANDIDATES.description)
  const eligibility = pick(raw, CANDIDATES.eligibility)
  const level = pick(raw, CANDIDATES.level)

  const { cents, note } = parseAmount(
    pick(raw, CANDIDATES.awardMax),
    pick(raw, CANDIDATES.awardMin),
    pick(raw, CANDIDATES.awardText),
  )
  const { date, display } = parseDeadline(pick(raw, CANDIDATES.deadline))
  const corpus = [name, provider, description, eligibility, level].filter(Boolean).join(' ')
  const numAwardsRaw = pick(raw, CANDIDATES.numAwards)
  const numAwards = numAwardsRaw !== undefined && /^\d+$/.test(String(numAwardsRaw))
    ? parseInt(String(numAwardsRaw), 10) : null

  return {
    slug: ingestSlug(SLUG_PREFIX, idStr),
    name: String(name),
    provider: provider !== undefined ? String(provider) : null,
    description: description !== undefined ? String(description) : null,
    eligibility_summary: eligibility !== undefined ? String(eligibility) : null,
    award_amount_cents: cents,
    award_amount_note: note,
    deadline: date,
    deadline_display: display,
    min_gpa: parseGpa(pick(raw, CANDIDATES.gpa)),
    num_awards_per_year: numAwards,
    demographic_tags: deriveTags(corpus),
    application_requirements: [],
    url: pick(raw, CANDIDATES.url) !== undefined ? String(pick(raw, CANDIDATES.url)) : null,
    source_external_id: idStr,
    raw,
  }
}

/** Find the array of scholarship records in a response, whatever the wrapper key. */
export function extractRecords(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body as Record<string, unknown>[]
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>
    for (const key of ['Scholarships', 'ScholarshipList', 'Scholarship', 'Results']) {
      const v = obj[key]
      if (Array.isArray(v)) return v as Record<string, unknown>[]
    }
    // Fallback: first array-valued property.
    for (const v of Object.values(obj)) if (Array.isArray(v)) return v as Record<string, unknown>[]
  }
  return []
}

/** Read the reported total record count from a response, whatever the key. */
export function extractTotal(body: unknown, fallback: number): number {
  if (body && typeof body === 'object') {
    for (const key of ['ScholarshipCount', 'RecordCount', 'Rowcount', 'Count', 'TotalRecords']) {
      const v = (body as Record<string, unknown>)[key]
      const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10)
      if (Number.isFinite(n) && n > 0) return n
    }
  }
  return fallback
}

export interface FetchConfig {
  userId: string
  token: string
  apiBase: string   // default https://api.careeronestop.org
  keyword: string   // '0' = all
  sortColumns: string
  sortDirection: string
  pageSize: number
  maxRecords: number
  timeBudgetMs: number
}

export interface FetchResult {
  raw: Record<string, unknown>[]
  reportedTotal: number
  fullPass: boolean // did we fetch everything the source reported?
}

/** Build the request URL for a page. Documented endpoint shape — adjust if the API differs. */
export function buildUrl(cfg: FetchConfig, startRecord: number): string {
  const enc = encodeURIComponent
  return `${cfg.apiBase}/v1/scholarshipsearch/${enc(cfg.userId)}/${enc(cfg.keyword)}/` +
    `${enc(cfg.sortColumns)}/${enc(cfg.sortDirection)}/${startRecord}/${cfg.pageSize}`
}

/**
 * Page through the scholarship API until we hit the end, the maxRecords cap, or
 * the time budget. Returns raw records plus whether we saw the whole set (which
 * gates archive-by-absence reconciliation downstream).
 */
export async function fetchAll(
  cfg: FetchConfig,
  fetchImpl: typeof fetch = fetch,
  now: () => number = () => Date.now(),
): Promise<FetchResult> {
  const start = now()
  const raw: Record<string, unknown>[] = []
  let reportedTotal = 0
  let startRecord = 0

  while (raw.length < cfg.maxRecords && now() - start < cfg.timeBudgetMs) {
    const res = await fetchImpl(buildUrl(cfg, startRecord), {
      headers: { Authorization: `Bearer ${cfg.token}`, Accept: 'application/json' },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`CareerOneStop API ${res.status}: ${text.slice(0, 300)}`)
    }
    const body = await res.json()
    const page = extractRecords(body)
    reportedTotal = extractTotal(body, reportedTotal || page.length)
    if (page.length === 0) break
    raw.push(...page)
    startRecord += page.length
    if (startRecord >= reportedTotal) break
    // Be polite to a government API.
    await new Promise((r) => setTimeout(r, 250))
  }

  const fullPass = raw.length >= reportedTotal && reportedTotal > 0
  return { raw, reportedTotal, fullPass }
}

// A small, representative fixture mirroring the expected response shape, used by
// the function's `sample` dry-run mode to exercise the mapping without a token.
export const SAMPLE_PAYLOAD = {
  ScholarshipCount: 4,
  Scholarships: [
    {
      ScholarshipId: '9990001',
      ScholarshipName: 'Future Women in Engineering Award',
      OrganizationName: 'National Engineering Foundation',
      Purpose: 'Supports female students pursuing engineering degrees.',
      Qualifications: 'Open to women entering an accredited engineering program. Minimum GPA 3.0.',
      MaximumAward: 5000,
      MinimumAward: 2500,
      Deadline: '03/15/2027',
      LevelOfStudy: 'Undergraduate',
      NumberOfAwards: '10',
      Url: 'https://example.org/women-in-engineering',
    },
    {
      ScholarshipId: '9990002',
      ScholarshipName: 'Community Roots Need-Based Grant',
      OrganizationName: 'Roots Community Fund',
      Purpose: 'Need-based grant for first-generation, low-income students.',
      Qualifications: 'Must demonstrate financial need and be first-generation college student.',
      AwardAmountText: 'Up to $10,000',
      Deadline: 'Varies',
      LevelOfStudy: 'Undergraduate',
      Url: 'https://example.org/community-roots',
    },
    {
      ScholarshipId: '9990003',
      ScholarshipName: 'Veterans Legacy Scholarship',
      OrganizationName: 'American Veterans Association',
      Purpose: 'For veterans and military family members.',
      MaximumAward: '3000',
      Deadline: 'May 1, 2027',
      Url: 'https://example.org/veterans-legacy',
    },
    {
      // Intentionally expired + no amount, to exercise the quality gate.
      ScholarshipId: '9990004',
      ScholarshipName: 'Expired Test Scholarship',
      OrganizationName: 'Old Fund',
      Deadline: '01/01/2020',
      Url: 'https://example.org/expired',
    },
  ],
}
