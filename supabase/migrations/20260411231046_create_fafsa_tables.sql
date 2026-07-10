-- Federal programs
create table public.fafsa_federal_programs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null check (category in ('grant', 'work_study', 'loan')),
  subcategory text,
  description text not null,
  who_qualifies text not null,
  max_amount_cents bigint,
  max_amount_note text,
  interest_rate_pct numeric(5,3),
  origination_fee_pct numeric(6,4),
  award_year text not null,
  url text not null,
  sort_order integer not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fafsa_federal_programs enable row level security;

create policy "fafsa_federal_programs_read"
  on public.fafsa_federal_programs
  for select
  to anon, authenticated
  using (true);

-- State programs
create table public.fafsa_state_programs (
  id uuid primary key default gen_random_uuid(),
  state_code text not null check (length(state_code) = 2),
  name text not null,
  description text not null,
  program_type text check (program_type in ('need_based','merit','promise','workforce','veterans','foster_youth','other')),
  fafsa_required boolean not null default true,
  alternative_application text,
  eligibility_notes text,
  url text not null,
  sort_order integer not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fafsa_state_programs_state_idx
  on public.fafsa_state_programs (state_code, sort_order);

alter table public.fafsa_state_programs enable row level security;

create policy "fafsa_state_programs_read"
  on public.fafsa_state_programs
  for select
  to anon, authenticated
  using (true);

-- Scholarships
create table public.fafsa_scholarships (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  provider text,
  award_amount_cents bigint,
  award_amount_note text,
  max_family_income_cents bigint,
  requires_fafsa boolean not null default false,
  requires_css_profile boolean not null default false,
  demographic_tags text[] not null default '{}',
  url text not null,
  sort_order integer not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fafsa_scholarships_tags_idx
  on public.fafsa_scholarships using gin (demographic_tags);

alter table public.fafsa_scholarships enable row level security;

create policy "fafsa_scholarships_read"
  on public.fafsa_scholarships
  for select
  to anon, authenticated
  using (true);

-- Generous aid schools
create table public.fafsa_generous_aid_schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  no_loan boolean not null default false,
  meets_full_need boolean not null default false,
  free_tuition_income_cents bigint,
  free_all_costs_income_cents bigint,
  requires_css_profile boolean not null default false,
  notes text,
  url text not null,
  sort_order integer not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fafsa_generous_aid_schools enable row level security;

create policy "fafsa_generous_aid_schools_read"
  on public.fafsa_generous_aid_schools
  for select
  to anon, authenticated
  using (true);

-- User-scoped saved items
create table public.fafsa_saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('federal','state','scholarship','school')),
  item_id uuid not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create index fafsa_saved_items_user_idx
  on public.fafsa_saved_items (user_id);

alter table public.fafsa_saved_items enable row level security;

create policy "fafsa_saved_items_select_own"
  on public.fafsa_saved_items
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "fafsa_saved_items_insert_own"
  on public.fafsa_saved_items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "fafsa_saved_items_update_own"
  on public.fafsa_saved_items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "fafsa_saved_items_delete_own"
  on public.fafsa_saved_items
  for delete
  to authenticated
  using (auth.uid() = user_id);
