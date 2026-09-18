-- Remove the essay-feedback machinery.
--
-- The decision is not to use AI for essay feedback, so the edge function is
-- deleted and with it the only writer of this table and the only caller of
-- these functions. The Essays module keeps its drafting workspace — prompts,
-- word counts, drafts and status — which is what it was actually being used
-- for.
--
-- The table was a spend guard, not student work: one row per call, holding the
-- rate-limit window and token usage. It was empty when this was written, and
-- essay drafts themselves live in profiles.settings.module_data, untouched by
-- this migration.
--
-- Dropped by signature because these are overloadable, and a bare name would
-- fail if one ever were.

drop function if exists public.get_essay_feedback_usage(integer);

drop function if exists public.claim_essay_feedback_slot(
  uuid, integer, integer, integer, integer, text, text, text, integer
);

drop function if exists public.essay_feedback_counts_against_quota(
  text, text, timestamptz, timestamptz
);

-- Policies and indexes go with the table.
drop table if exists public.essay_feedback_requests;
