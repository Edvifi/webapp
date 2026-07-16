-- ═══════════════════════════════════════════════════════════════════════════
-- colleges — DB-backed college directory (replaces the hardcoded collegeData.ts)
--
-- Mirrors the fafsa_scholarships pattern: a public-readable table populated by an
-- automated ingestion job that upserts idempotently from an external source
-- (the U.S. Dept. of Education College Scorecard) and reconciles a run log.
--
-- Two provenance lanes coexist in one table, deduped by (source, source_external_id):
--   source='curated'   — hand-maintained rows with REAL deadlines
--                        (deadlines_estimated=false). Ported from collegeData.ts.
--   source='scorecard' — bulk-ingested 4-year institutions with cost/aid/admit/
--                        logo and ESTIMATED default deadlines (deadlines_estimated
--                        =true). The ingest must NOT clobber curated deadline
--                        fields (see 20260716000100_college_deadline_guard.sql).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                       -- stable app id, e.g. 'harvard'
  name text not null,
  city text,
  state text,                                      -- 2-letter USPS code
  type text,                                       -- 'Public' | 'Private nonprofit' | 'Private for-profit' | 'Community College'
  website text,                                    -- bare domain, e.g. 'harvard.edu'
  logo_url text,                                   -- resolved once at ingest; emoji fallback in the UI
  emoji text,                                      -- legacy/fallback glyph

  -- ── Cost & aid ──
  cost_of_attendance integer,                      -- in-state COA (USD/yr)
  cost_out_of_state integer,
  avg_net_price integer,                           -- Scorecard latest.cost.avg_net_price
  enrollment integer,                              -- Scorecard latest.student.size (for search ranking)
  acceptance_rate numeric,                         -- 0..1
  meets_full_need boolean not null default false,
  no_loan_policy boolean not null default false,
  npc_url text,

  -- ── Deadlines (jsonb so the shape matches CollegeInfo exactly) ──
  application_deadlines jsonb not null default '{}'::jsonb,    -- {earlyAction, earlyDecision, regularDecision}
  financial_aid_deadlines jsonb not null default '{}'::jsonb,  -- {fafsaPriority, cssProfile, aidNotification}
  deadlines_estimated boolean not null default true,          -- true = smart defaults, false = curated real dates

  -- ── Ingestion bookkeeping (mirrors fafsa_scholarships) ──
  source text not null default 'curated',
  source_external_id text,                         -- IPEDS unitid for scorecard rows
  status text not null default 'published'
    check (status in ('published', 'staged', 'archived')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent-upsert key: at most one row per (source, source_external_id).
create unique index if not exists colleges_source_key
  on public.colleges (source, source_external_id)
  where source_external_id is not null;

create index if not exists colleges_status_idx on public.colleges (status);
create index if not exists colleges_state_idx on public.colleges (state);
-- Full-text search over name for the college search box.
create index if not exists colleges_name_fts_idx
  on public.colleges using gin (to_tsvector('simple', name));

-- Public read of published rows only (same posture as scholarships).
alter table public.colleges enable row level security;

create policy "colleges_read"
  on public.colleges
  for select
  to anon, authenticated
  using (status = 'published');

-- ── Ingest run log (mirrors fafsa_scholarship_ingest_runs) ──
create table if not exists public.college_ingest_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'scorecard',
  status text not null default 'running'
    check (status in ('running', 'success', 'error')),
  fetched integer not null default 0,
  upserted integer not null default 0,
  archived integer not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists college_ingest_runs_started_idx
  on public.college_ingest_runs (started_at desc);
