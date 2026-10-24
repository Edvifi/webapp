-- The waitlist behind edvifi.ai.
--
-- The marketing site has had a signup form on it since launch, under the copy
-- "Sign up to get early access to Edvifi". It has no storage destination
-- configured, which Squarespace says in a status banner it renders into the
-- page and then hides from visitors — so the form accepts an address, thanks
-- the student, and discards it. This is where they land instead.
--
-- Insert-only on purpose. The anon key is in the page source of a public
-- marketing site, so anyone who views source can POST here; that is fine, it
-- is what the form does. What they must not be able to do is read the list
-- back, because it is a list of teenagers' email addresses. There is no
-- select, update or delete policy, so reading is left to the service role and
-- to SQL — picking a wave is an operator job, not something the site can do.

create extension if not exists citext;

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  -- citext so Jane@example.com and jane@example.com are one person. The unique
  -- constraint is what makes a double submit idempotent instead of a duplicate
  -- row, which in turn is what stops the same student being invited twice.
  email citext not null unique,
  -- Graduating class, asked for two reasons: it is how a wave gets picked
  -- (seniors first — their deadlines are this year), and on a product that
  -- goes on to ask minors about family income it is the nearest thing to
  -- having asked how old someone is before collecting anything.
  grad_year smallint,
  created_at timestamptz not null default now(),
  -- Stamped when an invite is sent, so "the next wave" is simply the rows
  -- without it. Deliberately not a foreign key to auth.users: an invited
  -- address may never accept, and the row should still record that we asked.
  invited_at timestamptz,
  -- Which form the signup came from, for when there is more than one.
  source text,
  -- This table is reachable by anyone on the internet, so the shape of what
  -- lands in it is checked here rather than only in the form's JavaScript.
  constraint waitlist_email_shape check (
    length(email) between 6 and 254
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint waitlist_grad_year_range check (
    grad_year is null or grad_year between 2020 and 2045
  ),
  constraint waitlist_source_len check (source is null or length(source) <= 64)
);

comment on table public.waitlist is
  'Early-access signups from edvifi.ai. Insert-only to anon; read with the service role.';

alter table public.waitlist enable row level security;

drop policy if exists "Anyone can join the waitlist" on public.waitlist;
create policy "Anyone can join the waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);

-- Supabase's default privileges already cover this; stated so the migration
-- stands on its own, and so a 403 from the form can never be this line's fault.
grant insert on table public.waitlist to anon, authenticated;
