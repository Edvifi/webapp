/* ═══════════════════════════════════════════════════════════════
   COLLEGE DATA

   Colleges live in the Supabase `colleges` table (see the ingestion
   pipeline). This module loads them into an in-memory cache once, so the
   rest of the app keeps using synchronous getCollegeById/searchColleges.
   There is no hardcoded college list — the cache starts empty and is filled
   by loadColleges(); components gate rendering on useCollegesReady().
   ═══════════════════════════════════════════════════════════════ */

import { supabase } from '../lib/supabase'

/**
 * Logo URL for a school. Prefers logo.dev (real brand logos + monogram
 * fallback, so nothing is ever blank) when a publishable token is configured,
 * built client-side from the school's domain. Falls back to any stored
 * logo_url (e.g. a favicon) and finally to the emoji glyph in the UI.
 */
const LOGODEV_TOKEN = import.meta.env.VITE_LOGODEV_TOKEN as string | undefined
function resolveLogo(website: string | null, stored: string | null): string | null {
  if (website && LOGODEV_TOKEN) {
    return `https://img.logo.dev/${website}?token=${LOGODEV_TOKEN}&size=128&format=png&retina=true`
  }
  return stored
}

export interface CollegeInfo {
  id: string
  name: string
  emoji: string
  type: string
  state: string
  city?: string | null
  logoUrl?: string | null
  costOfAttendance: number
  costOutOfState?: number
  avgNetPrice?: number | null
  enrollment?: number | null
  /** Projected position on the College List map SVG (viewBox 192 9 1028 746); null when unmappable (territories). */
  mapX?: number | null
  mapY?: number | null
  applicationDeadlines: {
    earlyAction?: string | null
    earlyDecision?: string | null
    regularDecision: string
  }
  financialAidDeadlines: {
    fafsaPriority: string
    cssProfile?: string | null
    aidNotification: string
  }
  meetsFullNeed: boolean
  noLoanPolicy: boolean
  npcUrl: string
  acceptanceRate?: number
  /** true when deadlines are smart defaults rather than curated real dates. */
  deadlinesEstimated?: boolean
}


/* ─── in-memory cache (seeded offline, replaced by the DB on load) ─── */

let CACHE: CollegeInfo[] = []
let COLLEGE_MAP = new Map<string, CollegeInfo>()
let loaded = false
let loadPromise: Promise<void> | null = null

function rebuild(list: CollegeInfo[]) {
  CACHE = list
  COLLEGE_MAP = new Map(list.map((c) => [c.id, c]))
}

// PostgREST caps a single response at 1000 rows (Supabase default), but the
// directory has ~2200 schools — so we page through with .range() until a short
// page signals the end. Without this, any school past row 1000 never loads:
// it won't resolve in getCollegeById, search, or recommendations.
const PAGE_SIZE = 1000
function fetchPage(from: number, to: number) {
  return supabase
    .from('colleges')
    .select('*')
    .eq('status', 'published')
    .order('slug', { ascending: true })
    .range(from, to)
}
type CollegeRow = NonNullable<Awaited<ReturnType<typeof fetchPage>>['data']>[number]
async function fetchRows(): Promise<CollegeRow[]> {
  const all: CollegeRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE_SIZE) break
  }
  return all
}

function mapRow(r: CollegeRow): CollegeInfo {
  const deadlines = (r.application_deadlines ?? {}) as CollegeInfo['applicationDeadlines']
  const aid = (r.financial_aid_deadlines ?? {}) as CollegeInfo['financialAidDeadlines']
  return {
    id: r.slug,
    name: r.name,
    emoji: r.emoji ?? '🎓',
    type: r.type ?? 'Private',
    state: r.state ?? '',
    city: r.city,
    logoUrl: resolveLogo(r.website, r.logo_url),
    costOfAttendance: r.cost_of_attendance ?? 0,
    costOutOfState: r.cost_out_of_state ?? undefined,
    avgNetPrice: r.avg_net_price,
    enrollment: r.enrollment,
    mapX: r.map_x,
    mapY: r.map_y,
    applicationDeadlines: deadlines,
    financialAidDeadlines: aid,
    meetsFullNeed: r.meets_full_need,
    noLoanPolicy: r.no_loan_policy,
    npcUrl: r.npc_url ?? '',
    acceptanceRate: r.acceptance_rate ?? undefined,
    deadlinesEstimated: r.deadlines_estimated,
  }
}

/** Load colleges from the DB into the cache once. Idempotent; safe to call often. */
export function loadColleges(): Promise<void> {
  if (loadPromise) return loadPromise
  loadPromise = fetchRows()
    .then((rows) => {
      if (rows.length) rebuild(rows.map(mapRow))
      loaded = true
    })
    .catch((e) => {
      loadPromise = null // allow retry; keep the seed cache in the meantime
      throw e
    })
  return loadPromise
}

export function collegesLoaded(): boolean {
  return loaded
}

/** Test-only: seed the cache with fixture data (no DB). */
export function __setColleges(list: CollegeInfo[]): void {
  rebuild(list)
  loaded = true
}

/** All colleges currently in the cache (seed until the DB load resolves). */
export function getAllColleges(): CollegeInfo[] {
  return CACHE
}

/** Look up a single college by id (slug). */
export function getCollegeById(id: string): CollegeInfo | undefined {
  return COLLEGE_MAP.get(id)
}

/**
 * Client-side fuzzy search across the cache, ranked by relevance: exact name
 * match first, then name prefix, then word-start matches, then any substring —
 * with school enrollment (log-scaled) as the tiebreak so major universities
 * float above tiny same-name matches.
 */
export function searchColleges(query: string): CollegeInfo[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  const tokens = q.split(/\s+/)

  const scored: Array<{ c: CollegeInfo; score: number }> = []
  for (const c of CACHE) {
    const name = c.name.toLowerCase()
    const hay = `${c.id} ${name} ${c.state} ${c.type}`.toLowerCase()
    // Gate: every token must appear somewhere.
    if (!tokens.every((t) => hay.includes(t))) continue

    let score: number
    if (name === q) score = 1000
    else if (name.startsWith(q)) score = 600
    else if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(name)) score = 400
    else if (name.includes(q)) score = 200
    else score = 50 // matched only via state/type/id or split tokens
    // Enrollment tiebreak (log scale so it never overrides a better name match).
    score += Math.log10((c.enrollment ?? 0) + 1) * 8
    scored.push({ c, score })
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.c)
}
