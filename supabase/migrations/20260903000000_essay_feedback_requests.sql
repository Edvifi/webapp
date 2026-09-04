-- Per-request log + spend guard for the essay-feedback edge function.
--
-- Written only by the function (service role). Two jobs:
--   1. rate limiting — `claim_essay_feedback_slot` below atomically counts a
--      user's recent requests and inserts the new one under an advisory lock,
--      so N concurrent requests from one account can't all pass a stale count;
--   2. cost tracking — token usage + latency per call (see the function README
--      for a spend-per-day query).
-- Users can read their own rows (for a future "N requests left today" UI);
-- admins read everything through get_essay_feedback_usage(). No insert/update/
-- delete policies on purpose: only the service role writes.
--
-- Deleting a user cascades their rows away. That's deliberate (the log holds
-- per-user activity), so keep spend reporting outside this table if you need
-- history to survive account deletion.

create table if not exists public.essay_feedback_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  draft_id text,
  model text not null,
  effort text,
  status text not null default 'pending'
    check (status in ('pending', 'ok', 'refused', 'error')),
  stop_reason text,
  error_code text,
  essay_words integer,
  input_tokens integer,
  output_tokens integer,
  cache_read_tokens integer,
  cache_write_tokens integer,
  latency_ms integer
);

comment on table public.essay_feedback_requests is
  'One row per essay-feedback edge function call that passed auth, validation and the rate limit: quota window + token usage. Service-role writes only.';

-- Serves the per-user quota count and the own-row RLS predicate.
create index if not exists essay_feedback_requests_user_created_idx
  on public.essay_feedback_requests (user_id, created_at desc);

-- Serves the global quota count (no user_id filter).
create index if not exists essay_feedback_requests_created_idx
  on public.essay_feedback_requests (created_at desc);

alter table public.essay_feedback_requests enable row level security;

-- Own-row read only. `(select auth.uid())` so it's evaluated once per query,
-- not per row. Admin reads go through the RPC below rather than a second
-- policy, which would OR a non-indexable predicate into every user's read.
drop policy if exists "essay feedback requests admin read" on public.essay_feedback_requests;
drop policy if exists "essay feedback requests own read" on public.essay_feedback_requests;
create policy "essay feedback requests own read"
  on public.essay_feedback_requests for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Shared predicate so the quota count and any reporting agree on what "counts".
-- Immutable-ish helper kept separate for readability; it is called inside the
-- locked section only.
create or replace function public.essay_feedback_counts_against_quota(
  p_status text,
  p_error_code text,
  p_created_at timestamptz,
  p_stale_before timestamptz
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    -- Rejected before the model generated anything: no tokens, no charge.
    when p_status = 'error' and p_error_code = any (array[
      'connection', 'upstream_rate_limit', 'auth_401', 'auth_403',
      'request_400', 'request_404'
    ]) then false
    -- Isolate died mid-flight; don't hold the slot hostage for the whole window.
    when p_status = 'pending' and p_created_at < p_stale_before then false
    else true
  end;
$$;

-- ---------------------------------------------------------------------------
-- Atomic rate-limit claim.
--
-- Counts, decides and inserts inside one transaction holding an advisory lock,
-- so concurrent requests serialize instead of all reading the same pre-insert
-- count. The lock is held for two counts and an insert (sub-millisecond), never
-- across the model call.
--
-- What counts against a quota: every row except failures that provably burned
-- no model tokens (rejected before generation), and except 'pending' rows old
-- enough that their isolate must have died mid-flight — otherwise a crashed
-- worker would cost a user a slot for the full window with no way to release it.
-- ---------------------------------------------------------------------------
create or replace function public.claim_essay_feedback_slot(
  p_user_id uuid,
  p_user_limit integer,
  p_global_limit integer,
  p_window_seconds integer,
  p_stale_pending_seconds integer,
  p_draft_id text,
  p_model text,
  p_effort text,
  p_essay_words integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_since timestamptz := now() - make_interval(secs => p_window_seconds);
  v_stale timestamptz := now() - make_interval(secs => p_stale_pending_seconds);
  v_used integer;
  v_global integer;
  v_id uuid;
begin
  -- One global lock: the critical section is tiny and this keeps both the
  -- per-user and global counts consistent without lock-ordering hazards.
  perform pg_advisory_xact_lock(hashtext('essay_feedback_slot'));

  select count(*) into v_used
  from public.essay_feedback_requests r
  where r.user_id = p_user_id
    and r.created_at >= v_since
    and public.essay_feedback_counts_against_quota(r.status, r.error_code, r.created_at, v_stale);

  if v_used >= p_user_limit then
    return jsonb_build_object('ok', false, 'reason', 'user_limit', 'used', v_used);
  end if;

  if p_global_limit > 0 then
    select count(*) into v_global
    from public.essay_feedback_requests r
    where r.created_at >= v_since
      and public.essay_feedback_counts_against_quota(r.status, r.error_code, r.created_at, v_stale);

    if v_global >= p_global_limit then
      return jsonb_build_object('ok', false, 'reason', 'global_limit', 'used', v_global);
    end if;
  end if;

  insert into public.essay_feedback_requests
    (user_id, draft_id, model, effort, essay_words, status)
  values
    (p_user_id, p_draft_id, p_model, p_effort, p_essay_words, 'pending')
  returning id into v_id;

  return jsonb_build_object('ok', true, 'request_id', v_id, 'used', v_used + 1);
end;
$$;

-- Admin usage report. Keeps the non-indexable admin check out of the table's
-- RLS (matches the pattern in 20260711150000_ingest_health_admin_rpc.sql).
create or replace function public.get_essay_feedback_usage(p_days integer default 14)
returns table (
  day date,
  requests bigint,
  ok bigint,
  failed bigint,
  users bigint,
  input_tokens bigint,
  output_tokens bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (r.created_at at time zone 'utc')::date as day,
    count(*) as requests,
    count(*) filter (where r.status = 'ok') as ok,
    count(*) filter (where r.status in ('error', 'refused')) as failed,
    count(distinct r.user_id) as users,
    coalesce(sum(r.input_tokens), 0) as input_tokens,
    coalesce(sum(r.output_tokens), 0) as output_tokens
  from public.essay_feedback_requests r
  where public.is_app_admin()
    and r.created_at >= now() - make_interval(days => greatest(p_days, 1))
  group by 1
  order by 1 desc;
$$;

-- Only the edge function (service role) may claim a slot; only signed-in
-- admins may read the report (the admin gate lives in the function body).
revoke execute on function public.claim_essay_feedback_slot(uuid, integer, integer, integer, integer, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.claim_essay_feedback_slot(uuid, integer, integer, integer, integer, text, text, text, integer) to service_role;

revoke execute on function public.essay_feedback_counts_against_quota(text, text, timestamptz, timestamptz) from public, anon;

revoke execute on function public.get_essay_feedback_usage(integer) from public, anon;
grant execute on function public.get_essay_feedback_usage(integer) to authenticated;
