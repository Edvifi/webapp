-- Atomically and idempotently append an intro key to the caller's
-- profiles.settings->'intros_seen' array. Doing this server-side (instead of a
-- read-modify-write from a client-held snapshot) avoids lost updates when
-- multiple intros/tours are marked seen in quick succession.
create or replace function public.mark_intro_seen(intro_key text)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.profiles p
  set settings = jsonb_set(
        coalesce(p.settings, '{}'::jsonb),
        '{intros_seen}',
        coalesce(p.settings->'intros_seen', '[]'::jsonb)
          || (case
                when coalesce(p.settings->'intros_seen', '[]'::jsonb) @> to_jsonb(intro_key)
                then '[]'::jsonb
                else to_jsonb(intro_key)
              end),
        true
      )
  where p.id = auth.uid();
$$;

grant execute on function public.mark_intro_seen(text) to authenticated;
