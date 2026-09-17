-- Two small corrections to public.profiles.
--
-- 1. An updated_at column. Every other user-facing table has one; profiles,
--    which holds every essay, college list and answer in a single JSONB blob,
--    does not. Without it, corruption cannot even be dated — you cannot tell
--    when a student's work was damaged, or how far back a good copy would be.
--
-- 2. A WITH CHECK clause on the update policy. USING restricts which rows can
--    be updated; without WITH CHECK the *resulting* row is unchecked, which is
--    the pattern that lets a row be reassigned to another owner. The primary
--    key blocks it today only because every account already has a profile row,
--    so it is one deleted row away from being exploitable.

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

comment on column public.profiles.updated_at is
  'Last write to this row. Exists so damage to the settings blob can be dated.';

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Restrict to signed-in users explicitly rather than relying on PUBLIC with a
-- uid check, and validate the row the update produces, not just the one it
-- started from.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- 3. When the student's grade was recorded.
--
-- `grade_start_idx` is written once at onboarding and never changes, so from a
-- student's second school year onward every deadline in the app was dated a
-- year late. Storing when the reading was taken lets the current grade be
-- derived from it rather than rewritten on a schedule, which would need a job
-- and would still miss anyone who does not open the app.
--
-- Existing rows get created_at, which is the closest honest approximation of
-- when they onboarded.
alter table public.profiles
  add column if not exists grade_set_at timestamptz;

comment on column public.profiles.grade_set_at is
  'When grade_start_idx was recorded. The current grade is derived by advancing it one year per school year elapsed (see web/src/lib/currentGrade.ts).';

update public.profiles
set grade_set_at = created_at
where grade_set_at is null and grade_start_idx is not null;
