-- What a school charges to apply, and whether it takes a waiver.
--
-- Both come from the Common App requirements grid, the same PDF the deadline
-- ingest already parses — it carries `US`, `Int'l` and `fee waiver` columns
-- beside the round dates. See scripts/ingest-deadlines.
--
-- This is worth storing because the answer is so often "nothing": of the 1,128
-- schools the grid lists a fee for, 611 charge $0. A student looking at a list
-- of ten schools and bracing for $700 of fees is usually wrong, and has no way
-- to find out short of opening ten admissions pages.
--
-- Cents, not dollars, matching every other money column here (avg_net_price_cents,
-- cost_of_attendance_cents). Null means we hold no figure; 0 means free, and the
-- two must stay distinguishable — "we don't know" and "it costs nothing" are
-- very different things to tell someone.

alter table public.colleges
  add column if not exists application_fee_cents int,
  add column if not exists fee_waiver_policy     text,
  add column if not exists fees_verified_at      timestamptz;

comment on column public.colleges.application_fee_cents is
  'US application fee in cents. 0 means free to apply; null means no figure on file.';
comment on column public.colleges.fee_waiver_policy is
  'From the grid''s fee-waiver column: accepted | us_only | not_accepted. Null means the grid left it blank.';
comment on column public.colleges.fees_verified_at is
  'When the fee columns were last refreshed from the Common App grid.';

-- The grid publishes exactly these three answers; anything else is a parse bug
-- rather than a new policy, and should fail loudly instead of being stored.
alter table public.colleges
  drop constraint if exists colleges_fee_waiver_policy_check;
alter table public.colleges
  add constraint colleges_fee_waiver_policy_check
  check (fee_waiver_policy is null or fee_waiver_policy in ('accepted', 'us_only', 'not_accepted'));

-- A negative fee is meaningless and would read as a discount.
alter table public.colleges
  drop constraint if exists colleges_application_fee_nonneg;
alter table public.colleges
  add constraint colleges_application_fee_nonneg
  check (application_fee_cents is null or application_fee_cents >= 0);
