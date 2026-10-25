-- Give each tracked scholarship its own application checklist.
--
-- My Scholarships now works like Application Status: every scholarship gets a
-- to-do list built from what it asks for (an essay, a portfolio, the
-- application itself), which the student can tick off and add to.
--
-- NULL means "not edited yet": the app builds the list from the catalogue's
-- requirements, so a new item needs no write. Once the student changes
-- something, the list is stored here as [{ id, label, done, phase, custom? }].
--
-- Tasks shared across scholarships (transcript, recommenders, resume, FAFSA,
-- CSS Profile, financial documents) are done once for all of them, so their
-- state is kept once per student in profiles.settings, not repeated here.

alter table public.fafsa_tracker_items
  add column if not exists tasks jsonb;

comment on column public.fafsa_tracker_items.tasks is
  'The student''s own checklist for this scholarship, excluding shared tasks. NULL until first edited; the app derives defaults from the catalogue requirements.';
