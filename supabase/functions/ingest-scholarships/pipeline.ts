// Source-agnostic pipeline: quality gate -> dedupe -> upsert -> reconcile.
// Operates on already-normalized records; knows nothing about CareerOneStop.

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import type { NormalizedScholarship } from './normalize.ts'

export interface Counts {
  inserted: number
  updated: number
  archived: number
  skipped: number
  gateReasons: Record<string, number>
}

const SCAM_RE = /\b(application|processing|entry)\s+fee\b|pay\s+to\s+(apply|enter)|guaranteed\s+(scholarship|winner|award)|100%\s+guaranteed/i

/**
 * Decide whether a normalized record is good enough to show students.
 * `todayIso` is 'YYYY-MM-DD'. Rejects: no destination URL, scam signals,
 * already-expired deadlines, and rows with neither an amount nor a deadline
 * (nothing actionable). Everything else passes.
 */
export function qualityGate(s: NormalizedScholarship, todayIso: string): { ok: boolean; reason?: string } {
  if (!s.name || s.name.length < 3) return { ok: false, reason: 'no_name' }
  if (!s.url) return { ok: false, reason: 'no_url' }
  const corpus = `${s.name} ${s.description ?? ''} ${s.eligibility_summary ?? ''}`
  if (SCAM_RE.test(corpus)) return { ok: false, reason: 'scam_signal' }
  if (s.deadline && s.deadline < todayIso) return { ok: false, reason: 'expired' }
  if (s.award_amount_cents === null && !s.deadline && !s.deadline_display) {
    return { ok: false, reason: 'no_amount_or_deadline' }
  }
  return { ok: true }
}

/** Loose name key for cross-source de-duplication. */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

interface RunOptions {
  source: string
  records: NormalizedScholarship[]
  fetchedIds: Set<string>   // every external id we saw this run (passed gate or not)
  fullPass: boolean         // did we fetch the source's entire set?
  todayIso: string
  nowIso: string
  insertSortOrder?: number
}

/**
 * Upsert the batch and reconcile. Existing rows for this source are matched by
 * source_external_id; curated rows are matched by loose name to avoid showing a
 * duplicate of something we already curate. Archive-by-absence only fires on a
 * full pass; on a partial pass we only archive rows we actually saw fail.
 */
export async function runIngest(client: SupabaseClient, opts: RunOptions): Promise<Counts> {
  const { source, records, fetchedIds, fullPass, todayIso, nowIso } = opts
  const counts: Counts = { inserted: 0, updated: 0, archived: 0, skipped: 0, gateReasons: {} }

  // Curated names to avoid cross-source duplicates.
  const { data: curatedRows, error: curErr } = await client
    .from('fafsa_scholarships')
    .select('name')
    .neq('source', source)
  if (curErr) throw curErr
  const curatedNames = new Set((curatedRows ?? []).map((r: { name: string }) => normalizeName(r.name)))

  // Existing rows for THIS source, keyed by external id.
  const { data: existingRows, error: exErr } = await client
    .from('fafsa_scholarships')
    .select('id, source_external_id, status')
    .eq('source', source)
  if (exErr) throw exErr
  const existingById = new Map<string, { id: string; status: string }>()
  for (const r of (existingRows ?? []) as Array<{ id: string; source_external_id: string; status: string }>) {
    if (r.source_external_id) existingById.set(r.source_external_id, { id: r.id, status: r.status })
  }

  // Gate + dedupe within the batch.
  const seen = new Set<string>()
  const gatedIds = new Set<string>()
  const toInsert: Record<string, unknown>[] = []
  const toUpdate: Record<string, unknown>[] = []

  for (const s of records) {
    if (seen.has(s.source_external_id)) continue
    seen.add(s.source_external_id)

    const gate = qualityGate(s, todayIso)
    if (!gate.ok) {
      counts.skipped++
      counts.gateReasons[gate.reason!] = (counts.gateReasons[gate.reason!] ?? 0) + 1
      continue
    }
    if (curatedNames.has(normalizeName(s.name))) {
      counts.skipped++
      counts.gateReasons['duplicate_of_curated'] = (counts.gateReasons['duplicate_of_curated'] ?? 0) + 1
      continue
    }
    gatedIds.add(s.source_external_id)

    const row: Record<string, unknown> = {
      slug: s.slug,
      name: s.name,
      provider: s.provider,
      // description is NOT NULL in the schema; fall back so inserts never fail.
      description: s.description ?? s.eligibility_summary ?? '',
      eligibility_summary: s.eligibility_summary,
      award_amount_cents: s.award_amount_cents,
      award_amount_note: s.award_amount_note,
      deadline: s.deadline,
      deadline_display: s.deadline_display,
      min_gpa: s.min_gpa,
      num_awards_per_year: s.num_awards_per_year,
      demographic_tags: s.demographic_tags,
      application_requirements: s.application_requirements,
      url: s.url,
      source,
      source_external_id: s.source_external_id,
      status: 'published',
      last_seen_at: nowIso,
      verified_at: nowIso, // source is authoritative (US DOL)
      raw: s.raw ?? null,
    }

    const existing = existingById.get(s.source_external_id)
    if (existing) {
      toUpdate.push({ id: existing.id, ...row })
    } else {
      toInsert.push({ ...row, sort_order: opts.insertSortOrder ?? 500 })
    }
  }

  // Insert new rows.
  for (const batch of chunk(toInsert, 500)) {
    const { error } = await client.from('fafsa_scholarships').insert(batch)
    if (error) throw error
    counts.inserted += batch.length
  }
  // Update existing rows via upsert on the primary key.
  for (const batch of chunk(toUpdate, 500)) {
    const { error } = await client.from('fafsa_scholarships').upsert(batch, { onConflict: 'id' })
    if (error) throw error
    counts.updated += batch.length
  }

  // Reconcile: retire published rows that are gone-or-bad upstream.
  const toArchive: string[] = []
  for (const [extId, row] of existingById) {
    if (row.status !== 'published') continue
    if (gatedIds.has(extId)) continue // still good this run
    const sawItFail = fetchedIds.has(extId) // fetched but failed the gate
    if (fullPass || sawItFail) toArchive.push(row.id)
  }
  for (const batch of chunk(toArchive, 500)) {
    const { error } = await client
      .from('fafsa_scholarships')
      .update({ status: 'archived', last_seen_at: nowIso })
      .in('id', batch)
    if (error) throw error
    counts.archived += batch.length
  }

  return counts
}
