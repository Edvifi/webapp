-- Tracker items: per-user scholarship pipeline (can reference a scholarship or be a custom entry)
create table public.fafsa_tracker_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scholarship_id uuid references public.fafsa_scholarships(id) on delete set null,
  name text not null,
  amount_display text,
  deadline_display text,
  status text not null default 'researching' check (status in ('researching','planning','ready','submitted','awarded')),
  tracker_type text check (tracker_type in ('Merit','Need','Local','Identity')),
  source text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fafsa_tracker_items_user_idx
  on public.fafsa_tracker_items (user_id, sort_order desc, created_at desc);

alter table public.fafsa_tracker_items enable row level security;

create policy "fafsa_tracker_items_select_own"
  on public.fafsa_tracker_items for select to authenticated
  using (auth.uid() = user_id);

create policy "fafsa_tracker_items_insert_own"
  on public.fafsa_tracker_items for insert to authenticated
  with check (auth.uid() = user_id);

create policy "fafsa_tracker_items_update_own"
  on public.fafsa_tracker_items for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "fafsa_tracker_items_delete_own"
  on public.fafsa_tracker_items for delete to authenticated
  using (auth.uid() = user_id);

-- Per-user module state: checklist progress (extensible for college_list, npc_runs later)
create table public.fafsa_user_module_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  checklist_progress jsonb not null default '{}'::jsonb,
  college_list jsonb not null default '[]'::jsonb,
  npc_runs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.fafsa_user_module_state enable row level security;

create policy "fafsa_user_module_state_select_own"
  on public.fafsa_user_module_state for select to authenticated
  using (auth.uid() = user_id);

create policy "fafsa_user_module_state_insert_own"
  on public.fafsa_user_module_state for insert to authenticated
  with check (auth.uid() = user_id);

create policy "fafsa_user_module_state_update_own"
  on public.fafsa_user_module_state for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
