-- Audit log for the (manual) College Scorecard ingest. Admin-readable; the ingest
-- script inserts a row per run during its temporary anon-insert window (see
-- scripts/ingest-colleges/README.md).
create table if not exists public.college_ingest_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'scorecard',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  fetched integer not null default 0,
  upserted integer not null default 0,
  status text not null default 'ok',
  notes text
);

alter table public.college_ingest_runs enable row level security;

drop policy if exists "college ingest runs admin read" on public.college_ingest_runs;
create policy "college ingest runs admin read"
  on public.college_ingest_runs for select
  using (public.is_app_admin());
