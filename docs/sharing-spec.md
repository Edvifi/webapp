# Sharing a student's progress — design, not yet built

From §4.1 of the student readiness review. Deliberately unbuilt: it needs a
schema, an access-control decision and a new public surface, and those are worth
agreeing before code exists.

## Why it matters more here than in most apps

The user is sixteen. The people who decide whether this works are mostly not
them:

- **FAFSA requires a parent's financial data.** A student cannot complete it alone.
- **Counselors** send transcripts and school reports, and write one of the
  recommendations. They are tracking the same deadlines in a different system.
- **Parents** are usually paying, and are the ones who ask "where are you up to"
  — a question the app can currently only answer by the student reading their
  screen aloud.

Today the only thing that leaves the app is the `.ics` export. Everything else
is trapped behind one login.

## What to share

A read-only page showing, for each college on the list: the school, the round,
the deadline, and the application's status. Plus a short summary line — how many
schools, how many submitted, what is next.

**Not** the demographic survey, household income, GPA, essay drafts, or
scholarship amounts. A parent asking "how is it going" does not need their
child's essay drafts, and a counselor does not need their income bracket. If
someone wants to share an essay, that is a different feature with a different
consent conversation.

## Shape

```
share_links
  token        text primary key     -- 128 bits, base64url, generated server-side
  user_id      uuid not null references auth.users(id) on delete cascade
  created_at   timestamptz not null default now()
  expires_at   timestamptz not null   -- default 30 days, never open-ended
  revoked_at   timestamptz            -- null while live
  label        text                   -- "Mum", "Ms. Reyes" — so revoking is informed
  last_seen_at timestamptz            -- so the student can see it is being used
```

A student may hold several at once: the point of `label` is that revoking one
does not mean revoking their counselor's too.

### Access

The link is the credential, so it must behave like one:

- **Generated server-side**, from a CSPRNG. Never derived from the user id.
- **Expiring by default.** 30 days, renewable. A link a student made in
  September should not still work when they are at university.
- **Revocable**, from a list in Settings showing each label, when it was made
  and when it was last opened.
- **Not indexable** — `X-Robots-Tag: noindex` and a `noindex` meta, because a
  link with a minor's school and college list must not end up in a search
  index.
- **No RLS shortcut.** Do not expose the tables to anon with a token policy;
  serve through an edge function that resolves the token, checks expiry and
  revocation, and returns only the fields above. Keeps the public surface one
  function and one shape rather than a policy on every table.

### Route

`/share/:token`, served by the existing SPA, fetching from a `shared-progress`
edge function. No session required, no sign-in prompt.

## What to decide before building

1. **Expiry default.** 30 days is a guess. A counselor may want a whole season.
2. **Does the viewer see estimated dates as estimated?** They should — a parent
   acting on a Nov 1 we invented is the §2.1 problem with a second victim.
3. **Does the student see when a link was opened?** Useful, and slightly
   surveillance-shaped in the other direction. Probably yes with a timestamp
   only, never an IP.
4. **Under-13s.** The survey accepts age 13. If anyone younger is ever allowed
   in, sharing needs a parental-consent story first, not after.
5. **Revocation on account deletion** is already handled by the cascade above,
   provided the table is added to `USER_TABLES` in the `delete-account`
   function. Easy to forget; that list exists precisely because it is easy to
   forget.

## Rough size

A day for the table, the function and the read-only page. Another for the
Settings management UI and its tests. The risk is not the code — it is that
this is the first thing in the app reachable without a login, and it carries a
minor's school name and college list.
