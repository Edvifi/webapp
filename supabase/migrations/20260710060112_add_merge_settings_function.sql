-- Atomically shallow-merge a patch into the caller's profiles.settings.
-- Top-level keys in `patch` overwrite; keys absent from `patch` are preserved.
-- This lets module_progress / module_data writes update their own key without
-- clobbering intros_seen (or each other) via a full-column read-modify-write.
create or replace function public.merge_settings(patch jsonb)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.profiles p
  set settings = coalesce(p.settings, '{}'::jsonb) || patch
  where p.id = auth.uid();
$$;

grant execute on function public.merge_settings(jsonb) to authenticated;
