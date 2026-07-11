-- Admin-gated read access to scholarship ingestion health.
--
-- The ingest-runs table is RLS-locked to the service role. This adds a small
-- admin allowlist and SECURITY DEFINER RPCs so a product owner can view
-- ingestion health inside the app without exposing it to students.

create table if not exists public.app_admins (
  email text primary key,
  created_at timestamptz not null default now()
);

-- Locked down: only the service role / SECURITY DEFINER functions read this.
alter table public.app_admins enable row level security;

-- Seed the product owner. Add more with:
--   insert into public.app_admins(email) values ('someone@example.com');
insert into public.app_admins (email) values ('danny00b@gmail.com')
  on conflict (email) do nothing;

-- Is the current signed-in user an admin?
create or replace function public.is_app_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.app_admins where email = (auth.jwt() ->> 'email')
  );
$$;

-- Recent ingestion runs (most recent first). Admin-only; non-admins get an
-- empty set (not an error) so the client stays quiet.
create or replace function public.get_scholarship_ingest_runs(p_limit int default 20)
returns setof public.fafsa_scholarship_ingest_runs
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_app_admin() then
    return;
  end if;
  return query
    select * from public.fafsa_scholarship_ingest_runs
    order by started_at desc
    limit greatest(1, least(p_limit, 100));
end;
$$;

-- One-row health summary. Admin-only; non-admins get null (not an error).
create or replace function public.get_scholarship_ingest_health()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_app_admin() then
    return null;
  end if;
  select jsonb_build_object(
    'last_run_at', (select started_at from public.fafsa_scholarship_ingest_runs order by started_at desc limit 1),
    'last_run_status', (select status from public.fafsa_scholarship_ingest_runs order by started_at desc limit 1),
    'last_success_at', (select finished_at from public.fafsa_scholarship_ingest_runs where status = 'success' order by finished_at desc limit 1),
    'runs_total', (select count(*) from public.fafsa_scholarship_ingest_runs),
    'ingested_published', (select count(*) from public.fafsa_scholarships where source = 'careeronestop' and status = 'published'),
    'ingested_archived', (select count(*) from public.fafsa_scholarships where source = 'careeronestop' and status = 'archived')
  ) into result;
  return result;
end;
$$;

-- Functions default to EXECUTE for PUBLIC (incl. anon); lock them to signed-in
-- users. The admin gate inside still restricts the data to admins, but this
-- keeps the anon role out of the RPC entirely.
revoke execute on function public.is_app_admin() from public, anon;
revoke execute on function public.get_scholarship_ingest_runs(int) from public, anon;
revoke execute on function public.get_scholarship_ingest_health() from public, anon;

grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.get_scholarship_ingest_runs(int) to authenticated;
grant execute on function public.get_scholarship_ingest_health() to authenticated;
