# Waitlist and invites

Access to app.edvifi.ai goes out in waves. Two halves:

- **edvifi.ai collects signups** into `public.waitlist` — `docs/waitlist-form.html`,
  pasted into a Squarespace Code Block.
- **app.edvifi.ai refuses everyone else.** The lock is `Allow new users to sign
  up`, off, in Supabase Auth. The app only stops offering a door the server
  will refuse; `INVITE_ONLY` in `web/src/lib/auth.ts` is that, and nothing more.

An invite is `auth.admin.inviteUserByEmail` — Supabase's own. There are no
invite codes, no redemption screen and no table of codes, because a code system
would need all of that plus a bypass path in `App.tsx`, and a gate in client
code is one anyone can step over with a console open.

**Invite links** (below) are not codes either. A link only labels where a
signup came from so it can be counted; it lets nobody in.

---

## Before you send a single invite

**1. A privacy policy has to exist.** `edvifi.ai/privacy` is a 404 today, and
the form links to it under "Read our Privacy Policy". A dead link on a form
that collects minors' email addresses is worse than no link. Publish from
`docs/privacy-policy-draft.md` (PR #53) and check the link resolves.

**2. Custom SMTP has to be set up.** Invites are email. The built-in sender is
capped at **2 messages per hour for the whole project**, so a wave of 25 would
take half a day and mostly fail. `supabase/EMAIL-SETUP.md` is the walkthrough.
Then raise Authentication → Rate Limits → emails per hour to match the wave
size you actually want to send.

Neither of these is polish. Skip the first and you are collecting children's
data with no notice; skip the second and the invites silently do not arrive.

---

## Putting it live

**Apply the migration.**

```sh
npx --yes supabase@latest db push --linked --dry-run   # look first
npx --yes supabase@latest db push --linked
```

It creates `public.waitlist`, enables RLS, and adds exactly one policy: anon
may INSERT. There is no select, update or delete policy, so the anon key in the
page source cannot read the list back — which matters, because the list is
teenagers' email addresses. Reading it is for the service role and for SQL.

**Replace the form on edvifi.ai.** The newsletter block currently on `/home`
has no storage destination, so every address typed into it since launch was
accepted, thanked, and discarded. Squarespace says so in a status banner it
renders into the page and then hides from visitors — the form looks and behaves
exactly like a working one.

1. Edit `/home`, delete the **Newsletter Block**.
2. Add a **Code Block** in its place and paste all of `docs/waitlist-form.html`.
3. Set the five custom properties at the top of its `<style>` to match the
   section — the defaults assume dark text on a light background.
4. Give that section an anchor ID of `waitlist` (section → Settings → Advanced),
   then point the three **Join the Waitlist** buttons at `/home#waitlist`. They
   currently point at `/home` with no anchor, so they reload the page instead
   of scrolling to the form.
5. Submit a real address and confirm the row arrives:

```sql
select email, grad_year, created_at from public.waitlist order by created_at desc limit 5;
```

Code Blocks need a Squarespace Business plan or higher. On Personal, the
fallback is to keep the newsletter block and give it a storage destination
(Storage tab → a Squarespace mailing list) — that collects email only, with no
graduating class and no `invited_at`, so waves become a CSV exercise.

**Close signups.** Supabase → Authentication → Sign In / Up → **Allow new users
to sign up**, off. This is the actual lock. It covers Google too: a new Google
identity is refused the same way, which is the point — that account is created
by Supabase before any of our code sees it.

Existing accounts are unaffected. Deploy this branch at the same time, or
app.edvifi.ai will keep offering a Create-account tab that the server rejects.

**Then try to get in, from a signed-out browser, with an address that has no
account.** Two paths:

- Email and password — there is no Create-account tab to find any more.
- **Continue with Google**, which is worth doing by hand. GoTrue refuses to
  create the account, so the lock holds, but the ID-token grant the GIS button
  uses reports that refusal as a bare `Internal Server Error` instead of the
  signups-disabled message ([supabase/auth#1677][1], open since July 2024).
  `friendlyGoogleError` in `web/src/lib/auth.ts` turns it into the invite-only
  message. If a raw server error ever shows up there instead, that mapping has
  drifted and a stranger is being told the site is broken.

[1]: https://github.com/supabase/auth/issues/1677

---

## Sending a wave

```sh
cd scripts/invite
SUPABASE_SERVICE_ROLE_KEY=... node invite.mjs 25 --dry-run   # who would go
SUPABASE_SERVICE_ROLE_KEY=... node invite.mjs 25             # send
```

Oldest signups first. The key comes from Project Settings → API → service_role
and should stay out of any file — it bypasses RLS entirely.

The script stamps `invited_at` as each invite lands, which makes a wave
resumable: if it stops on the email rate limit, run it again and it continues
from where it stopped. Nobody gets two invites, nobody is skipped.

It also sets user metadata `needs_password: true`. That is what makes
`web/src/lib/auth.ts`'s `needsPassword()` show the "Choose a password" screen
on first entry. Without it an invited student is signed in by the link but
never asked for a password, and finds out on their next device, where the only
way in is "Forgot password" for a password they never had.

**Inviting from the Supabase dashboard instead** works, but the dialog cannot
set user metadata, so that student gets the no-password experience above and
you have to stamp `invited_at` by hand. Use the script.

---

## Keeping an eye on it

```sql
-- How many waiting, and who is next
select count(*) filter (where invited_at is null)  as waiting,
       count(*) filter (where invited_at is not null) as invited
from public.waitlist;

-- Signups by graduating class, to decide who a wave should be
select coalesce(grad_year::text, 'other') as class, count(*)
from public.waitlist where invited_at is null
group by 1 order by 1;

-- Invited but never accepted: the invite link went unused
select w.email, w.invited_at
from public.waitlist w
join auth.users u on u.email = w.email
where w.invited_at is not null and u.confirmed_at is null
order by w.invited_at;
```

---

## Invite links: which URL brought people in

Make a link per place the waitlist gets shared — a school, a counselor's email,
a post — and see how many signups each one produced and how far they got.

**Make one.** Sign in to app.edvifi.ai as an admin (`public.app_admins`) and
open **Settings → Invite links**. Give it a name; the slug is filled in from
it. Copy the link and share it. It looks like:

```
https://edvifi.ai/home?ref=lincoln-high#waitlist
```

**What gets counted**, per link:

| Column    | Meaning |
|-----------|---------|
| Visits    | Browsers that opened the link (once each). Counted by a public RPC, so treat it as approximate. |
| Signups   | Waitlist rows with that `ref`. |
| Conv.     | Signups ÷ visits. |
| Invited   | Of those signups, how many `invite.mjs` has sent an invite. |
| Joined    | Of those, how many accepted and signed in (with the share of invited). |
| Onboarded | Of those, how many finished onboarding. |

There is also a **No link** row (signups with no `ref`) and an **Unknown** row
for any `ref` that shows up on signups without a matching link — a typo'd or
hand-made URL. Signups through those are still saved; **Create** turns the
stray ref into a proper link and keeps its history.

**How it works.** The form in `docs/waitlist-form.html` reads `?ref=` off the
URL and saves it in the visitor's browser, so someone who clicks a link, looks
around the site and signs up later is still credited to it. If they arrive
through two links, the most recent one wins. The ref goes into
`waitlist.ref`. The form has to be **re-pasted** into the Squarespace Code
Block for any of this to start counting. The `?ref=` only survives if the link
lands on the page the form is on, which is why links point at `/home`.

**Archive** a link once a campaign is over: it stops counting visits and
moves to the bottom, but keeps its signups. Links are never deleted.

**Invite one link's signups** as a wave:

```sh
SUPABASE_SERVICE_ROLE_KEY=... node invite.mjs 25 --ref=lincoln-high --dry-run
```

**The same numbers in SQL.** The function only answers admins, and the SQL
editor has no signed-in user, so say who you are first:

```sql
set request.jwt.claims = '{"email":"<an address in app_admins>"}';
select * from public.get_invite_link_stats();
```

---

## What this deliberately does not do

- **No position in line, no referral bumps.** Nobody is shown a number, so
  there is nothing to keep accurate.
- **No unsubscribe.** The only mail a row generates is its own invite. If that
  changes, it needs one.
- **No deletion path.** A student asking to come off the list is a manual
  `delete from public.waitlist where email = ...` — which is fine at this size
  and is not fine once there is a privacy policy promising otherwise.
- **An invited address that never accepts stays invited.** The query above
  finds them; re-inviting is `update public.waitlist set invited_at = null`
  for those rows, then running the script again.
