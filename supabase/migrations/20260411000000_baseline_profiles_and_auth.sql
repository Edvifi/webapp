-- Baseline: profiles table, RLS policies, and the new-user trigger.
--
-- These objects were created directly against the project before the tracked
-- migration ledger began, so they are captured here as a reconstructed,
-- idempotent baseline to make the migration set reproducible from scratch.
-- The `settings` column is intentionally omitted here — it is added later by
-- 20260415024642_add_settings_column_to_profiles.sql.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  grade_start_idx integer,
  answers jsonb default '{}'::jsonb,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  last_login_at timestamptz default now(),
  demographics jsonb
);

alter table public.profiles enable row level security;

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
