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

type CollegeRow = Awaited<ReturnType<typeof fetchRows>>[number]
async function fetchRows() {
  const { data, error } = await supabase
    .from('colleges')
    .select('*')
    .eq('status', 'published')
  if (error) throw error
  return data ?? []
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

/** Client-side fuzzy search across the cache. */
export function searchColleges(query: string): CollegeInfo[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  return CACHE.filter((c) => {
    const hay = `${c.id} ${c.name} ${c.state} ${c.type}`.toLowerCase()
    return q.split(/\s+/).every((token) => hay.includes(token))
  })
}
