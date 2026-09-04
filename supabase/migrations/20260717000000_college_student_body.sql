-- Student-body / diversity snapshot stored on each college so the Discover
-- detail popup reads it from our DB instead of a live College Scorecard call.
-- Shape: { women, retention, first_gen, race: { white, black, hispanic, ... } }
alter table public.colleges add column if not exists student_body jsonb;
