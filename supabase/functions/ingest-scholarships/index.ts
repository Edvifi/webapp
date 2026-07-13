// Scholarship ingestion edge function.
//
// Modes (JSON body or query `?mode=`):
//   sample : normalize the built-in fixture, run the quality gate, and return a
//            preview. No external API, no writes. Works with NO secrets set —
//            use it to verify the field mapping before/after registering.
//   run    : fetch the live CareerOneStop API, normalize, gate, upsert, and
//            reconcile. Requires secrets (see below) and the x-ingest-secret
//            header. Writes a row to fafsa_scholarship_ingest_runs.
//
// Required secrets for `run` mode (set via `supabase secrets set` or dashboard):
//   INGEST_SECRET          shared secret; callers must send it as x-ingest-secret
//   CAREERONESTOP_USER_ID  your CareerOneStop API userId
//   CAREERONESTOP_TOKEN    your CareerOneStop API bearer token
// Auto-provided by the platform: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// Optional tuning secrets: COS_API_BASE, COS_KEYWORD, COS_SORT_COLUMNS,
//   COS_SORT_DIRECTION, COS_PAGE_SIZE, COS_MAX_RECORDS, COS_TIME_BUDGET_MS.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { SOURCE, mapRecord, extractRecords, fetchAll, SAMPLE_PAYLOAD, type FetchConfig } from './careeronestop.ts'
import { runIngest, qualityGate } from './pipeline.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { 'Content-Type': 'application/json' } })

function env(name: string, fallback = ''): string {
  return Deno.env.get(name) ?? fallback
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  let mode = url.searchParams.get('mode') ?? 'run'
  let write = url.searchParams.get('write') === '1'
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      if (body?.mode) mode = String(body.mode)
      if (body?.write) write = Boolean(body.write)
    } catch { /* no/invalid body — fall back to query params */ }
  }

  const ingestSecret = env('INGEST_SECRET')

  // ---- sample preview: no secret, no writes -------------------------------
  if (mode === 'sample' && !write) {
    const records = extractRecords(SAMPLE_PAYLOAD).map(mapRecord).filter((r): r is NonNullable<typeof r> => r !== null)
    const today = todayIso()
    const preview = records.map((r) => ({ ...r, raw: undefined, _gate: qualityGate(r, today) }))
    return json({ mode: 'sample', count: preview.length, today, preview })
  }

  // ---- everything else requires the shared secret -------------------------
  if (!ingestSecret) return json({ error: 'INGEST_SECRET not configured' }, 500)
  if (req.headers.get('x-ingest-secret') !== ingestSecret) return json({ error: 'unauthorized' }, 401)

  const supabaseUrl = env('SUPABASE_URL')
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'Supabase env not available' }, 500)
  const client = createClient(supabaseUrl, serviceKey)

  const nowIso = new Date().toISOString()
  const today = todayIso()

  // Open a run-log row up front so failures are still recorded.
  const { data: runRow, error: runErr } = await client
    .from('fafsa_scholarship_ingest_runs')
    .insert({ source: SOURCE, status: 'running' })
    .select('id')
    .single()
  if (runErr) return json({ error: 'could not open run log', detail: runErr.message }, 500)
  const runId = runRow.id as string

  try {
    let raw: Record<string, unknown>[]
    let fullPass: boolean
    let reportedTotal: number

    if (mode === 'sample') {
      // Sample WRITE: exercise the full write/reconcile path with the fixture.
      raw = extractRecords(SAMPLE_PAYLOAD)
      reportedTotal = raw.length
      fullPass = true
    } else {
      const userId = env('CAREERONESTOP_USER_ID')
      const token = env('CAREERONESTOP_TOKEN')
      if (!userId || !token) throw new Error('CAREERONESTOP_USER_ID / CAREERONESTOP_TOKEN not configured')
      const cfg: FetchConfig = {
        userId, token,
        apiBase: env('COS_API_BASE', 'https://api.careeronestop.org'),
        keyword: env('COS_KEYWORD', '0'),
        sortColumns: env('COS_SORT_COLUMNS', 'Deadline'),
        sortDirection: env('COS_SORT_DIRECTION', 'ASC'),
        pageSize: parseInt(env('COS_PAGE_SIZE', '100'), 10),
        maxRecords: parseInt(env('COS_MAX_RECORDS', '5000'), 10),
        timeBudgetMs: parseInt(env('COS_TIME_BUDGET_MS', '120000'), 10),
      }
      const result = await fetchAll(cfg)
      raw = result.raw
      reportedTotal = result.reportedTotal
      fullPass = result.fullPass
    }

    const records = raw.map(mapRecord).filter((r): r is NonNullable<typeof r> => r !== null)
    const fetchedIds = new Set(records.map((r) => r.source_external_id))

    const counts = await runIngest(client, {
      source: SOURCE, records, fetchedIds, fullPass, todayIso: today, nowIso,
    })

    await client.from('fafsa_scholarship_ingest_runs').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      fetched: raw.length,
      inserted: counts.inserted,
      updated: counts.updated,
      archived: counts.archived,
      skipped: counts.skipped,
      errors: Object.keys(counts.gateReasons).length ? counts.gateReasons : null,
      notes: `reportedTotal=${reportedTotal} fullPass=${fullPass} mode=${mode}`,
    }).eq('id', runId)

    return json({ ok: true, runId, fetched: raw.length, reportedTotal, fullPass, ...counts })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await client.from('fafsa_scholarship_ingest_runs').update({
      status: 'error', finished_at: new Date().toISOString(), errors: { message },
    }).eq('id', runId)
    return json({ ok: false, runId, error: message }, 500)
  }
})
