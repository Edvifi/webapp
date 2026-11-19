-- Custom invite links: which URL brought each waitlist signup in.
--
-- A link is a slug — `tiktok-fall`, `lincoln-high` — shared as
-- https://edvifi.ai/home?ref=<slug>#waitlist. The waitlist form on edvifi.ai
-- reads `ref` off the URL (remembering it if the visitor wanders off and comes
-- back) and sends it with the signup, so every row in public.waitlist can say
-- which link it came through. From there the funnel follows the email address
-- the rest of the way: invited by scripts/invite, signed in, onboarded.
--
-- Signups are still the waitlist. Accounts are still created only by an
-- invite; nothing here opens a door. A link is a label for counting, not a
-- code that grants anything, which is why an unknown or mistyped `ref` is
-- recorded rather than refused: a broken link should still collect the
-- student, and the stats show the stray ref so the link can be fixed.

create table if not exists public.invite_links (
  slug text primary key,
  -- What the link is for, as an operator would say it: "TikTok — fall push".
  label text not null,
  -- Distinct browsers that landed with this ref, counted by the form. Anyone
  -- can call the counter (it runs on a public marketing page), so read it as
  -- "roughly how many people clicked", never as an audited number.
  visits bigint not null default 0,
  created_at timestamptz not null default now(),
  created_by text default (auth.jwt() ->> 'email'),
  -- Archived links stop counting visits and drop to the bottom of the list,
  -- but keep their signups: deleting a link would orphan its history.
  archived_at timestamptz,
  constraint invite_links_slug_shape check (slug ~ '^[a-z0-9][a-z0-9-]{0,47}$'),
  constraint invite_links_label_len check (length(btrim(label)) between 1 and 120)
);

comment on table public.invite_links is
  'Trackable signup links for the edvifi.ai waitlist. Admin-only; see docs/waitlist.md.';

alter table public.invite_links enable row level security;

-- Admins manage links from Settings. Nobody else can see that they exist.
-- No delete policy: archive instead, so a link's signups keep their label.
drop policy if exists "Admins read invite links" on public.invite_links;
create policy "Admins read invite links"
  on public.invite_links for select
  to authenticated
  using (public.is_app_admin());

drop policy if exists "Admins create invite links" on public.invite_links;
create policy "Admins create invite links"
  on public.invite_links for insert
  to authenticated
  with check (public.is_app_admin());

drop policy if exists "Admins update invite links" on public.invite_links;
create policy "Admins update invite links"
  on public.invite_links for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

grant select, insert, update on table public.invite_links to authenticated;

-- ─── The waitlist learns where each signup came from ───────────────────────

-- Deliberately not a foreign key. A foreign key would make a mistyped or
-- archived ref fail the insert, and the form would tell a student their
-- signup didn't save because somebody shared a bad link. Shape-checked
-- instead, the same way the rest of this anon-writable table is.
alter table public.waitlist add column if not exists ref text;

alter table public.waitlist drop constraint if exists waitlist_ref_shape;
alter table public.waitlist add constraint waitlist_ref_shape
  check (ref is null or ref ~ '^[a-z0-9][a-z0-9-]{0,47}$');

create index if not exists waitlist_ref_idx on public.waitlist (ref);

-- ─── Visit counter ─────────────────────────────────────────────────────────

-- Called by the form once per browser per link. SECURITY DEFINER so anon can
-- bump a counter on a table it cannot otherwise see; it touches one column of
-- one live row and returns nothing, so it cannot be used to list links or to
-- learn whether a slug exists.
create or replace function public.record_invite_visit(p_slug text)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.invite_links
     set visits = visits + 1
   where slug = lower(btrim(p_slug))
     and archived_at is null;
$$;

revoke execute on function public.record_invite_visit(text) from public;
grant execute on function public.record_invite_visit(text) to anon, authenticated;

-- ─── Stats ─────────────────────────────────────────────────────────────────

-- One row per link, plus one per stray ref nobody created a link for, plus
-- one (slug null) for signups that came with no ref at all. Admin-only;
-- non-admins get an empty set, the same as the ingestion-health RPCs.
--
--   signups    rows in the waitlist with this ref
--   invited    of those, how many have been sent an invite
--   joined     of those, how many have an account they have signed in to
--   onboarded  of those, how many finished onboarding
create or replace function public.get_invite_link_stats()
returns table (
  slug text,
  label text,
  is_link boolean,
  created_at timestamptz,
  archived_at timestamptz,
  visits bigint,
  signups bigint,
  invited bigint,
  joined bigint,
  onboarded bigint,
  last_signup_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_app_admin() then
    return;
  end if;
  return query
    with funnel as (
      select w.ref,
             count(*)                                                    as signups,
             count(w.invited_at)                                         as invited,
             count(u.id) filter (where u.last_sign_in_at is not null)    as joined,
             count(*) filter (where p.onboarding_complete is true)       as onboarded,
             max(w.created_at)                                           as last_signup_at
        from public.waitlist w
        left join auth.users u on lower(u.email) = lower(w.email::text)
        left join public.profiles p on p.id = u.id
       group by w.ref
    )
    select coalesce(l.slug, f.ref),
           l.label,
           l.slug is not null,
           l.created_at,
           l.archived_at,
           coalesce(l.visits, 0)::bigint,
           coalesce(f.signups, 0)::bigint,
           coalesce(f.invited, 0)::bigint,
           coalesce(f.joined, 0)::bigint,
           coalesce(f.onboarded, 0)::bigint,
           f.last_signup_at
      from public.invite_links l
      full outer join funnel f on f.ref = l.slug
     order by (l.archived_at is not null), coalesce(f.signups, 0) desc, l.created_at desc nulls last;
end;
$$;

revoke execute on function public.get_invite_link_stats() from public, anon;
grant execute on function public.get_invite_link_stats() to authenticated;
