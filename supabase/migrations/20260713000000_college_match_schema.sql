-- College Match / Pathway Finder: source-agnostic colleges table (College Scorecard ingest).
create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  scorecard_id integer unique not null,
  name text not null,
  slug text unique not null,
  institution_type text not null check (institution_type in ('4yr','2yr','trade','grad','other')),
  city text,
  state text,
  region text,
  ownership text check (ownership in ('public','private_nonprofit','private_forprofit')),
  locale text check (locale in ('city','suburb','town','rural')),
  size integer,
  admit_rate numeric,                 -- null = open admission
  sat_reading_25 integer, sat_reading_75 integer,
  sat_math_25 integer, sat_math_75 integer,
  act_25 integer, act_75 integer,
  avg_net_price_cents integer,
  net_price_by_income jsonb,          -- { "0_30k": cents, "30k_48k": cents, "48k_75k": cents, "75k_110k": cents, "110k_plus": cents }
  cost_of_attendance_cents integer,
  programs jsonb,                     -- { "<broad field>": share_of_degrees }
  grad_rate numeric,
  transfer_rate numeric,             -- 2yr transfer-to-4yr rate
  median_earnings_10yr_cents integer,
  pell_pct numeric,
  npc_url text,
  url text,
  source text not null default 'scorecard',
  status text not null default 'published' check (status in ('published','draft','archived')),
  last_seen_at timestamptz not null default now(),
  raw jsonb,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists colleges_state_idx on public.colleges(state);
create index if not exists colleges_type_idx on public.colleges(institution_type);
create index if not exists colleges_admit_idx on public.colleges(admit_rate);
create index if not exists colleges_status_idx on public.colleges(status);

alter table public.colleges enable row level security;

drop policy if exists "colleges public read published" on public.colleges;
create policy "colleges public read published"
  on public.colleges for select
  using (status = 'published');
