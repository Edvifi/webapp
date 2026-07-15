# College Scorecard ingest

Loads the U.S. Dept. of Education **College Scorecard** dataset (~6,300 institutions)
into the Supabase `public.colleges` table. Powers the Application Tracking → Discover
tab (match engine, net-price-by-income, admission bands, ZIP-radius community-college
proximity).

## Run

```bash
cd scripts/ingest-colleges
npm install                 # first time (pg-free; supabase-js only)
node ingest.mjs --test      # dry-ish: first page (100 rows) + a sample row
node ingest.mjs             # full ingest (~1–2 min, idempotent upsert on scorecard_id)
```

Requires a free key in `.env` (gitignored):

```
SCORECARD_API_KEY=...        # get one instantly at https://api.data.gov/signup
SCORECARD_API_BASE=https://api.data.gov/ed/collegescorecard/v1/schools
```

## Write path & the temporary RLS policy ⚠️

The table is **RLS read-only** in normal operation. The script writes with the anon
key, so a run must be bracketed by a **temporary** anon write policy that is dropped
immediately afterward:

```sql
-- before the run:
create policy "colleges temp ingest insert" on public.colleges for insert to anon with check (true);
create policy "colleges temp ingest update" on public.colleges for update to anon using (true) with check (true);
create policy "runs temp ingest insert"     on public.college_ingest_runs for insert to anon with check (true);

-- ALWAYS run after (even if the ingest failed part-way):
drop policy if exists "colleges temp ingest insert" on public.colleges;
drop policy if exists "colleges temp ingest update" on public.colleges;
drop policy if exists "runs temp ingest insert"     on public.college_ingest_runs;
```

The script writes a best-effort audit row to `public.college_ingest_runs` at the end
(admin-readable). Check ingest history:

```sql
select started_at, finished_at, fetched, upserted, status from public.college_ingest_runs order by started_at desc;
```

If an ingest crashes mid-run, **re-run the DROP statements** so the table can't be
written by anon. Verify none linger:

```sql
select policyname from pg_policies where tablename = 'colleges';
-- expect only: "colleges public read published"
```

The clean long-term fix is to run the ingest with a **service-role key** (bypasses RLS,
no temp policy) instead of anon — swap the client in `ingest.mjs` when a service key is
available.

## Freshness

Every row carries `verified_at` / `last_seen_at`, stamped on each ingest. Check staleness:

```sql
select max(verified_at) as last_ingest, count(*) from public.colleges;
```

This is a **manual** ingest (no cron). Scorecard publishes roughly annually, so a
periodic manual re-run is sufficient; add a scheduled job only if the cadence needs to
tighten.
