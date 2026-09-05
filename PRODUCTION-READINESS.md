# Production readiness

Audit date: **2026-09-04**. Supersedes `PRODUCTION-TODO.md` (2026-07-30), which
predates the application-tracking, dark-mode, settings and essay-feedback work.

Findings come from two adversarial reviews: a six-dimension audit of the app on
`main`, and a five-dimension review of the scholarship-deadlines branch. Every
item below survived at least one independent verifier whose job was to refute
it. Nothing here is a hunch.

**Where it stands.** Cloudflare Pages auto-deploys `main` to
`timeline-prototype.pages.dev` with 8 live accounts on the production Supabase
project. There is no CI, so nothing runs the 189 tests before code reaches
those students.

---

## Coverage gaps — read this before trusting the list

Three of the six auditors on the `main` audit stalled and never reported. **No
findings exist for security and privacy, data integrity, or product
completeness.** A further 9 medium/low findings from that run and 18 from the
scholarship run were never verified.

This is a floor, not a ceiling. The three missing dimensions are the ones most
likely to hold surprises for a product handling minors' data.

---

## Ship blockers

Ordered by what would hurt a student soonest.

### 1. A failed load silently becomes an empty list, and the next write destroys the saved work
`web/src/lib/useModuleState.ts:77` · hours

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

### 2. Sign-out that fails on the network leaves the session live
`web/src/App.tsx:106` · minutes

The UI shows the login screen while the session stays in local storage. On a
shared school or library computer, the next person to reload the tab lands in
that student's dashboard, with their essays, income bracket and demographics.

### 3. No CI
`.github/workflows/ci.yml` (absent) · hours

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
- Hosting: Cloudflare Pages is live with env vars set. The old "pick Vercel"
  recommendation is obsolete.
- Essay feedback is real, authenticated, rate-limited and behind a flag.
- `web/.env.example` now exists.

Still open from that audit: item 9 (swallowed catches, now known to be a
data-destruction path, blocker 1 above), item 10 (loading trap), item 13 (no
error tracking), and the CI half of item 7.
