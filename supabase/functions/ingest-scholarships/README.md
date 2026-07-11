# Scholarship ingestion pipeline

Automated ingestion of scholarships from the **CareerOneStop Web API** (US
Department of Labor) into `fafsa_scholarships`, so students see a large, fresh,
quality-gated set of aid opportunities.

## How it works

```
CareerOneStop API ──▶ normalize ──▶ quality gate ──▶ dedupe ──▶ upsert ──▶ reconcile ──▶ run log
   (careeronestop.ts)  (normalize.ts)      (pipeline.ts) ────────────────────────┘   (index.ts)
```

- **normalize** — parses award amount → cents, free-text deadline → real date,
  eligibility text → `demographic_tags` (mapped to the vocabulary the app
  already filters on). All source-specific field names live in
  `careeronestop.ts` under `CANDIDATES` — the one place to correct if the live
  API's keys differ from what we expect.
- **quality gate** — drops rows with no destination URL, scam signals
  ("application fee", "guaranteed"), expired deadlines, or neither an amount nor
  a deadline (nothing actionable).
- **dedupe** — idempotent on `(source, source_external_id)`; also skips any row
  whose name matches an existing curated scholarship.
- **upsert** — inserts new rows, updates changed ones, stamps `last_seen_at`
  and `verified_at` (the source is DOL-authoritative). Ingested rows are
  `status='published'` so they appear immediately.
- **reconcile** — retires (`status='archived'`, never deleted) rows that vanish
  upstream or now fail the gate. Archive-by-absence only runs on a full pass.
- **run log** — every run writes a row to `fafsa_scholarship_ingest_runs`
  (fetched / inserted / updated / archived / skipped + gate reasons).

## One-time setup

1. **Register** for a free CareerOneStop API token:
   https://www.careeronestop.org/Developers/WebAPI/registration.aspx
   You'll receive a **userId** and an **API token** (~1 business day).

2. **Set the function secrets** (dashboard → Edge Functions → Secrets, or CLI):
   ```bash
   supabase secrets set \
     INGEST_SECRET="$(openssl rand -hex 32)" \
     CAREERONESTOP_USER_ID="your-user-id" \
     CAREERONESTOP_TOKEN="your-token"
   ```
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

3. **Verify the field mapping** against a live response before trusting it — run
   the sample preview (no secret needed), then a small real run and inspect the
   run log + a few rows.

## Modes

```bash
# Sample preview — normalize the built-in fixture, no secret, no writes.
curl "$FUNCTION_URL?mode=sample"

# Real run — requires the secret header.
curl -X POST "$FUNCTION_URL" \
  -H "x-ingest-secret: $INGEST_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"mode":"run"}'
```

Tuning secrets (optional): `COS_MAX_RECORDS` (default 5000), `COS_TIME_BUDGET_MS`
(default 120000), `COS_PAGE_SIZE` (100), `COS_KEYWORD` (`0` = all),
`COS_SORT_COLUMNS`, `COS_SORT_DIRECTION`, `COS_API_BASE`.

## Scheduling

A weekly `pg_cron` job invokes this function via `pg_net`, reading the shared
secret from Supabase Vault (see the `schedule_scholarship_ingestion` migration).
To change cadence, update the cron schedule.
