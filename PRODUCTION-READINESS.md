# Production readiness

Audit date: **2026-09-04**, updated **2026-09-08**. Supersedes
`PRODUCTION-TODO.md` (2026-07-30), which predates the application-tracking,
dark-mode, settings and essay-feedback work.

Findings come from three adversarial reviews: a six-dimension audit of the app
on `main`, a five-dimension review of the scholarship-deadlines branch, and a
re-run of the three dimensions whose auditors stalled the first time. Every item
below survived at least one independent verifier whose job was to refute it.
Nothing here is a hunch, and six claims were dropped because a verifier showed
they were wrong.

**Where it stands.** Vercel auto-deploys `main` to `app.edvifi.ai`
(`webapp-zeta-five-89.vercel.app` still resolves) with 8 live accounts on the production Supabase
project. CI now runs the 189 tests before code reaches those students. The
Cloudflare Pages project this replaced still answers on its old URL and has yet
to be disconnected.

---

## Coverage gaps — read this before trusting the list

The three dimensions that stalled first time round have now been audited, and
they were the worst of the lot. Their verdicts, verbatim: data integrity and
product completeness were each called *"the weakest dimension audited so far"*,
and on security, *"it shows"*.

Still unverified: 9 medium/low findings from the first run, 18 from the
scholarship run, and 12 from the re-run. This is a floor, not a ceiling.

---

## Ship blockers

Ordered by what would hurt a student soonest.

### ~~1. A failed load silently becomes an empty list, and the next write destroys the saved work~~ — FIXED
`web/src/lib/useModuleState.ts` · shipped in #28

`useModuleData` swallows load failures, leaving `data` and `dataRef` at `[]`
with no error state and no loaded flag. Every mutation is a whole-array
replace built from that ref, so one failed read followed by one successful
write overwrites the stored array with a single element.

A student opens Essays during a connection blip, sees "no drafts yet", starts
the personal statement again, and the finished essay plus every supplement is
gone from `profiles.settings`. No version history, no undo, no backup of the
JSONB blob. The same mechanism truncates a 12-school application list to 1.

**Fix.** A loaded flag set *only* on a resolved read, a distinct failure state
surfaced through the existing toast context, and `saveData` refusing to write
while unloaded. Note `useModuleValue` cannot be copied here: it sets its loaded
flag inside `.catch` too, which is the same bug. That also makes
`useCollegePrefs` a third instance.

Structural follow-up: stop replacing whole arrays. Per-draft documents, or a
merge that can only touch the draft it names, removes the entire class.

### ~~2. Sign-out that fails on the network leaves the session live~~ — FIXED
`web/src/lib/auth.ts` · shipped in #29. supabase-js returns before removing the
stored session when its server call fails; a failed sign-out now clears it.

The UI shows the login screen while the session stays in local storage. On a
shared school or library computer, the next person to reload the tab lands in
that student's dashboard, with their essays, income bracket and demographics.

### ~~3. No CI~~ — FIXED
`.github/workflows/ci.yml` · shipped in #29. Typecheck, lint, test and build for
the web app, plus a separate Deno job for both edge functions. Set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository variables so CI
builds match production.

Nothing runs the tests before `main` auto-deploys. A merge that compiles but is
wrong reaches production in about two minutes with no gate. The workflow needs
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, because `fafsaData.ts` reads
them at import and the suite fails without them.

### 4. No error tracking and no root error boundary
`web/src/main.tsx:8` · hours

A crash is a white screen the student escapes only by reloading, and you never
learn it happened. The one existing boundary names the wrong module and reports
nowhere.

### 5. The dashboard is structurally unusable on a phone
`web/src/index.css:1190` · hours

Fixed three-column grid, no media queries, no scroll escape. Onboarding *is*
responsive, so a student signs up on their phone, gets through it, and lands on
a wall. Students overwhelmingly use phones.

### 6. Nothing is keyboard operable
`web/src/components/Dashboard.tsx:285` · days

Every primary entry point is an unnamed `div`. Modules, scholarships and
colleges cannot be opened with a keyboard, a switch device or a screen reader.
Not partially inaccessible — inoperable. A hard WCAG 2.1 AA failure on 2.1.1,
which matters if schools ever procure this.

### 7. Preview deployments are public and point at production data
`web/.env.example:8` · hours

Every pushed branch publishes a working, unauthenticated copy of the app wired
to the production database holding minors' essays and income brackets. Branch
names are guessable and the URLs are indexable.

---

## High

- **Essay body autosaves on every keystroke with no debounce**, and the failure
  is discarded — `web/src/components/EssaysModule.tsx:368`. Thousands of
  full-blob round trips; closing the module unmounts immediately and loses the
  queue.
- **Profile-fetch failure traps the student on a blank screen** for ~36s before
  the first retry, indefinitely if the outage persists —
  `web/src/contexts/AuthContext.tsx:145`.
- **Onboarding can fail to persist silently**, making a first-gen student redo
  the entire survey — `web/src/App.tsx:97`.
- **`getTrackerItems`' module-level cache is never cleared on sign-out**, so one
  student's scholarship deadlines can render on the next student's screen —
  `web/src/lib/fafsaData.ts:90`. *(unverified)*

---

## The scholarship-deadlines branch is not ready

`feature/scholarship-deadlines` (PR #27). All five reviewers returned "not ready
to merge". **Do not merge it as it stands.**

The plumbing is sound — the migration is clean and idempotent, the generated
types are right, and the timeline path fallback was verified correct by brute
force. The parser is not.

**29% of the dates it produces are wrong**: 66 of 198 distinct strings, 71 of
the 247 rows it dates. Three distinct causes:

1. **Leftmost month wins, so 42 rows show the date applications OPEN, not the
   deadline.** "Opens Nov 1, closes ~Feb 14 (annual)" produces Nov 1. A test I
   wrote pins this behaviour as correct for "Application cycle Jan 15 - Apr 15",
   asserting Jan 15 when the deadline is Apr 15. That test is wrong and must be
   corrected, not preserved.
2. **An explicit year is discarded and re-based into the student's cycle.** For
   a junior, "Mar 2027" lands on Mar 1 **2028** — a year late, and hidden during
   the month it is actually due, because the calendar filters on month *and*
   year. This inverts the module's own stated rule that early is the safe
   direction to err.
3. **"Annual" deadlines can be placed in the past**, because cycle placement
   never consults the clock. "August 31 (annual)" resolved to four days ago.

Also: `seniorFallYear` is off by one for every grade during July, a
pre-existing bug this change makes reachable from more surfaces.

**Recommendation.** Rework the parser around the deadline being the *last* date
in a range, honour an explicit year, and consult the clock. Until then the
feature ships wrong dates to students deciding when to apply for money.

---

## Fixed since the July audit

- Mock AI chat, hardcoded calendar/timeline tasks, fake dashboard percentages,
  the decorative settings page: all replaced with real data.
- Hosting: moved to Vercel (PR #38) — SPA rewrite, immutable asset caching,
  security headers, and previews that are protected rather than public, which
  was the reason to move. Supabase auth points at the Vercel origin as of
  2026-09-16; the Cloudflare project still needs disconnecting.
- Essay feedback is real, authenticated, rate-limited and behind a flag.
- `web/.env.example` now exists.

Still open from that audit: item 9 (swallowed catches, now known to be a
data-destruction path, blocker 1 above), item 10 (loading trap), item 13 (no
error tracking), and the CI half of item 7.

---

## Added 2026-09-08 — the three dimensions that had never been audited

Nine confirmed, three refuted. I independently re-checked the two scariest
against the live project before recording them, and both were **less severe
than reported** — noted inline rather than quietly dropped.

### Ship blocker: student work has no backup, no history, and no timestamp
`supabase/migrations/20260415024642_add_settings_column_to_profiles.sql` · hours

Every essay, college list, answer and preference lives in the single
`profiles.settings` JSONB column. There is no version table, no per-draft row,
no export script, and `profiles` has no `updated_at` — though every other user
table has one. If one student's blob is corrupted you cannot roll back, and
cannot even establish when it happened.

The asymmetry is backwards: the *replaceable* data is fully reproducible
(`seed.sql` for scholarships, the ingest script for colleges) while the
irreplaceable data is not.

Fix, in order: confirm the Supabase tier and turn on daily backups plus PITR;
until then dump `profiles`, `fafsa_user_module_state` and `fafsa_tracker_items`
off-project on a schedule (8 accounts is trivial); add `updated_at` with a
trigger; then move drafts into their own table with an append-only version
history, which removes whole-blob overwrite as a class.

### Account takeover: password change needs no current password — FIXED
`web/src/components/SettingsPage.tsx` · shipped alongside this update.
`updateUser` needed only a live session, so anyone reaching a walked-away tab on
a shared computer could set a new password and keep the account. Now
re-authenticates first. There was also **no password reset at all**, so a
student who forgot theirs was locked out of their own essays permanently; a
reset flow is now on the sign-in screen.

### Every deadline is a year late from a student's second year onward
`web/src/lib/profiles.ts:31` · hours

`grade_start_idx` is written once at signup and can never change. A student who
signs up as a sophomore sees every college deadline a year late from the
following September — dashboard, calendar, timeline and tracker alike. This is
the abstraction the whole product rests on.

### Three more silent-data-loss paths
- **FAFSA module state** writes are unserialized and read a stale module-level
  cache, so checklist toggles silently revert — `web/src/lib/fafsaData.ts:660`.
- **A failed college-list read** is swallowed, and the next add replaces the
  saved list with one school — `web/src/components/FinancialAidModule.tsx:2485`.
- **`merge_settings` replaces the whole `module_data` subtree**, so a second tab
  or device overwrites the first one's work — `web/src/lib/moduleProgress.ts:151`.

These are the same shape as the fixed blocker 1 and want the same structural
answer rather than three more patches.

### No privacy policy, terms, age gate, consent path, or data deletion
`web/src/components/AuthScreen.tsx` · days

Sign-up is open to anyone, including a 12-year-old rising 9th grader. With no
age question you cannot show you have no under-13 users, and the data set is
exactly what COPPA attaches to: race, parent education, income bracket, ZIP.
There is also no route for a student to delete their data.

### Corrected on re-check — recorded so nobody re-raises them

- **`colleges` is NOT writable by anon.** The ingest procedure grants temporary
  anon INSERT/UPDATE, and the auditor could not prove they were dropped. I
  queried `pg_policies` directly: no such policy exists. The *procedure* is
  still a hazard worth replacing with a service-role script; the hole is not
  open.
- **The Postgres password never leaked.** `SUPABASE_PW` sits in
  `web/.env.local`, which is gitignored and absent from all history. Local-only
  exposure, not a leak. Still worth deleting, since the web app does not use it.

### Found while re-checking those
`profiles` has an UPDATE policy with **no `WITH CHECK`**, the exact pattern that
lets a row be reassigned to another owner. The primary key blocks it today
because every account has a profile row, so it is one deleted row away from
being exploitable. One-line fix, and the policies should be `TO authenticated`
rather than `PUBLIC` while we are there.

---

## Supabase state, 2026-09-16

Applied and verified against the live project. Recorded here because none of it
lives in the repo, so nothing else would show it had been done.

| Setting | State | Note |
| --- | --- | --- |
| Plan | **Pro** | Daily backups active, 8 snapshots recorded |
| Point-in-time recovery | Off | $100/month add-on; hard to justify at 8 accounts |
| Site URL / redirect allow-list | **`app.edvifi.ai`** | Custom domain since 2026-09-17. Allow-list also keeps the `vercel.app` alias and `localhost:5173`. Was `localhost:3000` with an empty allow-list, so reset emails went nowhere |
| Require current password | **On** | Enabled only after #30 deployed; before that the client did not send it |
| Leaked-password protection | **On** | Pro-gated, checks HaveIBeenPwned |
| Minimum password length | **8** | Was 6; the client constant now matches |
| CAPTCHA | Off | Code is wired and dormant; needs a Turnstile site key |
| Custom SMTP | **Not set** | The remaining gap — see below |
| `ANTHROPIC_API_KEY` | Not set | Essay feedback stays inert by design |

### Still open

- **The apex is a separate site.** `edvifi.ai` is Squarespace (registrar is
  Squarespace too, on nameservers inherited from Google Domains). DNS resolves a
  hostname, not a path, so the app cannot live at `edvifi.ai/app` while the
  marketing site holds the apex — hence the subdomain. Mounting under a path
  would need a Vite `base`, the nine root-absolute logo `<img>` paths rebased,
  and the three `window.location.origin` redirects in `web/src/lib/auth.ts`
  prefixed, or password reset would land on the marketing page.

- **Custom SMTP.** Supabase's built-in email is rate-limited and documented as
  not for production. `rate_limit_email_sent` is 2/hour project-wide. Password
  reset depends on delivery, so the reset flow is only as good as this.
  Step-by-step: `supabase/EMAIL-SETUP.md`.
- **Email is never verified.** `mailer_autoconfirm` is on, so anyone can sign up
  as any address, and a typo'd address creates an account that can never receive
  a reset. Belongs with the age-gate and consent work.
- **Essay drafts still live in one JSONB blob.** Daily backups restore the whole
  database to yesterday; they cannot return one student's drafts without rolling
  everyone else back. The fix is per-draft rows with append-only versions.
- Preview deployments remain public against the production database.
- The dashboard is still unusable on a phone, and nothing is keyboard operable.

