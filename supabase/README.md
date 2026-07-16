# Supabase

## Migrations (`supabase/migrations/`)

The full schema history for the project, in apply order:

| Version | What it does |
| --- | --- |
| `20260411000000_baseline_profiles_and_auth` | **Reconstructed baseline.** `profiles` table + RLS policies + the `handle_new_user` / `on_auth_user_created` trigger. |
| `20260411231046_create_fafsa_tables` | FAFSA reference + saved-items tables |
| `20260411232527_expand_federal_programs_category` | Widen the federal-programs category check |
| `20260412002840_create_fafsa_tracker_and_module_state` | Tracker items + per-user module state |
| `20260412004537_extend_fafsa_scholarships_with_detail_fields` | Extra scholarship detail columns |
| `20260415024642_add_settings_column_to_profiles` | `profiles.settings` jsonb column |
| `20260709070330_add_mark_intro_seen_function` | `mark_intro_seen(text)` RPC (atomic intros_seen append) |
| `20260710060112_add_merge_settings_function` | `merge_settings(jsonb)` RPC (atomic per-key settings merge) |
| `20260711120000_scholarship_ingestion_pipeline` | Ingestion columns on `fafsa_scholarships` + `fafsa_scholarship_ingest_runs`; published-only read |
| `20260711130000_schedule_scholarship_ingestion` | Weekly `pg_cron` ingest schedule |
| `20260711140000_backfill_curated_deadlines` | Backfill real `deadline` dates on curated scholarships |
| `20260711150000_ingest_health_admin_rpc` | `app_admins` + admin-gated ingest-health RPCs |
| `20260716000000_create_colleges` | **DB-backed college directory.** `colleges` + `college_ingest_runs` (cost / aid / admission rate / enrollment / logo / jsonb deadlines), public-read RLS. |

### Notes

- The **baseline** captures objects that were originally created directly
  against the project (before the migration ledger existed). It is written
  idempotently (`create table if not exists`, `create or replace`,
  `drop … if exists`) so it is a safe no-op against the existing database and
  still rebuilds a fresh one from scratch. Its `20260411000000` version is not
  yet recorded in the remote ledger; a `supabase db push` will reconcile it as
  a no-op.
- Versions `20260411231046`–`20260415024642` are verbatim copies of the SQL
  recorded in the remote migration ledger.
- `20260716000000_create_colleges` is written idempotently
  (`create table if not exists`, `create index if not exists`) and is the only
  genuinely-new migration awaiting a `db push`.

### Remote ledger reconciliation (one-time, before the next `db push`)

The remote ledger drifted from this directory during the scholarship rollout.
`supabase migration list` shows two gaps:

- **Ledger-only (no file here):** `20260711214718`, `…220231`, `…232428`,
  `…233348`, `20260714001522`, `20260715005858`, `20260715225202`, `…225348`,
  `…225537` — the scholarship pipeline (re-stamped) plus incremental seed loads,
  applied directly and never committed.
- **File-only (not in the ledger):** the scholarship files `20260711120000`–
  `150000` above.

The ledger-only versions are **fully reproduced** by the files here plus
`seed.sql` (485 curated scholarships), so aligning the ledger to this directory
loses nothing. This is a **tracking-table** reconciliation only — it records /
clears ledger rows and applies no schema. Run once, with the project linked:

```sh
# 1) drop the nine ledger-only versions (the schema they created stays — it's
#    captured by the files here + seed.sql)
supabase migration repair --status reverted \
  20260711214718 20260711220231 20260711232428 20260711233348 \
  20260714001522 20260715005858 20260715225202 20260715225348 20260715225537

# 2) record the files already reflected in the deployed schema
supabase migration repair --status applied \
  20260411000000 20260711120000 20260711130000 20260711140000 20260711150000

# 3) verify — everything should match except the new colleges migration
supabase migration list
```

After this, `supabase db push` applies only `20260716000000_create_colleges`.
Verify the deployed scholarship objects match `120000`–`150000` before running
step 2 on any project whose schema may have diverged further.

### Using the Supabase CLI

To manage these with the CLI you'll need to link the project (adds
`supabase/config.toml`):

```sh
supabase link --project-ref <project-ref>
# one-time: reconcile the ledger (see above), then:
supabase db push          # applies 20260716000000_create_colleges
supabase migration list   # verify local ⇄ remote are in sync
```
