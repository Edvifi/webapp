-- Scholarship ingestion pipeline: provenance, lifecycle, and audit.
--
-- Adds the columns an automated ingestion job needs to upsert scholarships
-- idempotently from an external source (CareerOneStop / US DOL), reconcile
-- rows that disappear upstream, and gate what students actually see. Also
-- adds a per-run audit table so every ingestion is traceable.
--
-- All additions are backwards compatible: the existing 112 curated rows get
-- source='curated' and status='published', so the read path is unchanged.

-- 1. Provenance + lifecycle columns on the scholarships table --------------

alter table public.fafsa_scholarships
  -- Where the row came from. 'curated' = hand-maintained; 'careeronestop' =
  -- ingested from the US DOL Web API. Extensible to future sources.
  add column if not exists source text not null default 'curated',
  -- The source's own stable identifier, used for idempotent upserts. NULL for
  -- curated rows (which have no external id).
  add column if not exists source_external_id text,
  -- Real deadline date (parsed from the source's free-text deadline) so we can
  -- sort by urgency, warn on approaching deadlines, and archive expired rows.
  -- NULL means "no fixed deadline" / "varies" / unparseable.
  add column if not exists deadline date,
  -- Last ingestion run that saw this row upstream. Drives reconciliation:
  -- rows not seen for a while (removed upstream / passed deadline) get archived.
  add column if not exists last_seen_at timestamptz,
  -- Visibility lifecycle. Only 'published' rows are shown to students.
  --   published -> passed the quality gate, live
  --   staged    -> ingested but held back (e.g. cross-source conflict)
  --   archived  -> was live once, now retired (expired / vanished upstream)
  add column if not exists status text not null default 'published',
  -- Raw source payload for this row, kept for auditing/debugging the mapping.
  add column if not exists raw jsonb;

-- Constrain status to the known lifecycle values.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fafsa_scholarships_status_check'
  ) then
    alter table public.fafsa_scholarships
      add constraint fafsa_scholarships_status_check
      check (status in ('published', 'staged', 'archived'));
  end if;
end $$;

-- Idempotent-upsert key: at most one row per (source, source_external_id).
-- Partial so the many curated rows with a NULL external id don't collide.
create unique index if not exists fafsa_scholarships_source_external_uq
  on public.fafsa_scholarships (source, source_external_id)
  where source_external_id is not null;

-- Common read filters: published-by-deadline, and archival sweeps.
create index if not exists fafsa_scholarships_status_deadline_idx
  on public.fafsa_scholarships (status, deadline);

-- 2. Tighten the read policy to published-only -----------------------------
-- Existing rows all default to 'published', so this is a no-op for current
-- data while preventing staged/archived rows from ever reaching students.
-- (The ingestion job writes with the service-role key, which bypasses RLS.)

drop policy if exists fafsa_scholarships_read on public.fafsa_scholarships;
create policy fafsa_scholarships_read
  on public.fafsa_scholarships
  for select
  using (status = 'published');

-- 3. Per-run ingestion audit log -------------------------------------------

create table if not exists public.fafsa_scholarship_ingest_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null default 'running'
    check (status in ('running', 'success', 'error')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  fetched integer not null default 0,   -- rows pulled from the source
  inserted integer not null default 0,  -- new rows created
  updated integer not null default 0,   -- existing rows updated
  archived integer not null default 0,  -- rows retired during reconciliation
  skipped integer not null default 0,   -- rows dropped by the quality gate
  errors jsonb,                         -- structured error samples, if any
  notes text
);

create index if not exists fafsa_ingest_runs_started_idx
  on public.fafsa_scholarship_ingest_runs (started_at desc);

-- Lock the audit table down: only the service role (which bypasses RLS)
-- touches it. Enabling RLS with no policy denies all anon/auth access.
alter table public.fafsa_scholarship_ingest_runs enable row level security;
