# Student handoff review

A walk through the app with one question in mind: **a 16-year-old opens this alone, with no one to explain it. What confuses them, what lies to them, and what isn't there yet?**

Reviewed 2026-09-17 against `main` @ `18a9328`.

## How this was reviewed, and what that limits

The dev server runs, but the app is behind Supabase auth and I have no student account — and entering credentials isn't something I do. So I could not click through a live session end to end.

What I did instead: rendered components with realistic data and looked at them, and read the code for the flows I couldn't reach. That's reliable for **what exists, what's wired up, and what's promised but absent**. It's weaker on **feel** — animation timing, whether the timeline reads well in motion, whether the onboarding drags. Treat anything marked *(unverified)* as a lead, not a finding.

Ordered by what would hurt a real student most.

---

## 1. Things the app promises and does not do

### 1.1 The notification toggles are decorative — highest severity

Settings → Notifications offers three switches:

| Toggle | Description shown to the student | Default |
|---|---|---|
| Email Reminders | "Get notified about upcoming deadlines" | **on** |
| Weekly Summary | "Receive a weekly progress digest" | **on** |
| Push Notifications | "Browser push for urgent tasks" | off |

Nothing reads any of them. They're written to `profiles.settings.preferences` and that is the end of the journey — no edge function, no cron job, no mail provider, no service worker anywhere in the repo.

Two of them default to **on**, so a student who never opens Settings has been silently told they'll be emailed about deadlines. This is the worst failure mode in the whole app: it's a deadline tool, the single thing a student most needs is to be told *before* the date, and the product states it will do that and doesn't.

Either build it or take the switches out. Leaving them is a promise the app breaks quietly.

**Where:** `web/src/components/SettingsPage.tsx:136-138`, `web/src/lib/preferences.ts:15-17`

### 1.2 Essay feedback is advertised on the landing module and switched off

Knowledge Library — the "Start Here" module, the first thing a student reads — says:

> **Essay & application feedback.** Draft your essays in a focused workspace and get structured feedback on essays and applications so every piece is stronger before you submit.

`VITE_FEATURE_ESSAY_FEEDBACK=false` in `.env.local`. When the flag is off the feedback button simply doesn't render — no "coming soon", no explanation. A student reads the pitch, opens Essays, and finds a plain text box.

The edge function (`supabase/functions/essay-feedback`) exists, so this is a deploy decision rather than missing work. But the copy and the flag need to agree: either turn it on, or don't sell it on the first screen.

**Where:** `web/src/components/KnowledgeLibraryModule.tsx`, `web/src/components/EssaysModule.tsx:241,280`

### 1.3 No way to delete an account or export data

There's no delete-account path and no data export anywhere in the app.

This matters more than usual here. The users are minors, the app collects zip code, school name, GPA, household income, race, religion and immigration status, and several US state privacy laws plus COPPA-adjacent expectations assume a deletion route. "Email us" is an acceptable answer, but right now there isn't even that — there's nothing.

---

## 2. Data quality a student would act on

### 2.1 Most college deadlines are guesses, and the guess looks like a fact

Two sources of colleges, and they behave very differently:

- **~46 curated colleges** (`web/src/data/collegeData.ts`) carry real per-round dates.
- **Everything else** comes from the College Scorecard import (~6,000+ schools) and carries **no deadline data at all**. Those fall back to a smart default — Nov 1 for early rounds, Jan 1 for regular — and get marked `est.`

So a student adding Ohio State, San José State, or any regional public sees a confident-looking Nov 1, flagged only by a small `· est.` tag. The tag is doing enormous work: it's the difference between a real deadline and a placeholder, and it's rendered in the faintest text on the card.

Options, cheapest first:
1. Make `est.` unmissable on a college deadline specifically — "we don't have this school's date, check their site" with a link, rather than a tag.
2. Let the student type the real date in and mark it confirmed. They'll have it from the school's site.
3. Source real deadlines for the top few hundred schools.

**Where:** `web/src/data/applicationDeadlines.ts:229-246`

### 2.2 Scholarships are a fixed curated set

The ingestion pipeline exists but is dormant — CareerOneStop turned out to have no scholarship API, and the cron job is described in its own migration as "a harmless no-op" without credentials. So the catalogue is whatever was curated, and it doesn't grow or expire.

For a student this means: scholarships they find here are real, but the set is small and will drift out of date each cycle. Worth a visible "last reviewed" date so a student knows how fresh it is, and worth deciding whether anyone is committed to re-curating annually.

**Where:** `supabase/functions/ingest-scholarships/`, `supabase/migrations/20260711130000_schedule_scholarship_ingestion.sql`

---

## 3. Where a student gets stuck

### 3.1 Day one is an empty room

A brand-new student lands on the dashboard and sees:

- Four module cards, no due chips (no data yet)
- Week overview: seven "clear" columns and "Nothing on the calendar this week."
- Deadlines panel: "Nothing due this week — Add colleges in Application Tracking, or scholarships in Financial Aid."

That last line is the only instruction on the page, and it's inside the emptiest component. There's no "start here" call to action, no suggested first step, no sense of which module to open first. The module cards *are* sorted by the onboarding answers — lowest-confidence module first — but nothing tells the student that's what the order means, so the signal is invisible.

Cheapest fix that would change the experience: a single line under the greeting — "New here? Start with Knowledge Library, then add your first college." The sorting already knows the answer; it just never says it.

**Where:** `web/src/components/Dashboard.tsx:214-220`

### 3.2 The survey asks for gender and nationality before letting anyone in

Required to proceed: first name, age, **gender**, **nationality**, zip code, school name.
Optional: race, Hispanic/Latino, Native American/Alaska Native, religion, GPA, household income, parents' immigration status.

Race and religion being optional is right. Gender and nationality being **mandatory** is hard to justify — neither gates any feature I can find, and for a teenager, "you can't use this until you tell us your gender" is a real drop-off point. Nationality especially reads as immigration screening, which sits badly next to the parents-immigrants question.

The only explanation offered is a section subtitle, "This helps us personalize your experience." For income and GPA the app does explain itself ("used to match scholarships"). Gender and nationality get nothing.

Suggested: make both optional, and put a one-line "why we ask" on every sensitive field the way GPA already has.

**Where:** `web/src/data/demographicQuestions.ts`

### 3.3 Ticking a deadline silently edits an application

This is behaviour I built last week and it deserves flagging in the student context. Tapping a deadline row on the dashboard sets that college application's status to `submitted` in Application Tracking. That's deliberate — it's what stops the two views disagreeing — but from the student's side, a tap on what looks like a to-do checkbox rewrites a record on another page, with no confirmation and no visible link between the two.

Untick restores `in-progress`, **not** whatever it was before. A mis-tap on a not-yet-started application leaves it marked in-progress permanently.

Worth at least a toast: "Marked submitted in Application Tracking."

**Where:** `web/src/lib/useDeadlineEvents.ts`

### 3.4 Dead navigation in the timeline

`TimelineScreen.tsx:206` has a button whose handler is `{ /* TODO: route to dashboard */ }` — it renders, it's clickable, it does nothing. A student clicks it and concludes the app is broken.

---

## 4. Not built yet, and the audience needs it

### 4.1 Nobody else can see the student's work

There is no parent view, no counselor view, no sharing, no export beyond the `.ics` calendar file. For this audience that's a significant gap: FAFSA requires parent financial data, counselors write the recommendations and send transcripts, and most 16-year-olds doing this well have an adult checking in.

Even a read-only share link for "here's my college list and where each application stands" would carry a lot of weight.

### 4.2 No sense of time pressure beyond the next seven days

The deadlines panel covers a week. The week strip covers a week. The calendar shows a month at a time. Nothing anywhere answers "how many weeks until my first deadline" or "am I behind for a junior in October."

The timeline exists and is the natural home for this, but it's built around milestones rather than the student's own dates.

### 4.3 The mobile app is one screen

`mobile/` contains a timeline screen and its supporting components — no dashboard, no modules, no calendar. If the plan is that students use this on a phone, the honest position today is that they use the **web app** on a phone.

Which leads to:

### 4.4 The web app is barely responsive

Eight media queries in the entire stylesheet, and four of them are ones I added to the calendar and export controls last week. The dashboard, the modules, the timeline and the profile page have essentially no phone layout.

High schoolers are phone-first. This is probably the single largest piece of work between here and a real handoff, and it isn't a polish pass — the dashboard is a three-column grid with a fixed sidebar and a fixed aside.

**Where:** `web/src/index.css` — `@media` at 700px ×3, 760px ×2, 480px ×2, 400px ×1

---

## 5. Smaller things worth a pass

- **Estimated-date wording is inconsistent.** The panel and week strip say `est.`, the export writes "Estimated from … confirm the exact date with the official source." The verbose version is the honest one; the UI should borrow it on hover at least.
- **`Financial Aid` module still carries mockup data.** `FinancialAidModule.tsx:57` — "STATIC DATA (mockup placeholders; future work swaps these to Supabase)" above the checklist sections. Fine for content that rarely changes, but it means the checklist can't be updated without a deploy.
- **Knowledge Library is a brochure.** No checklist, no progress, no persistence — the only module a student can't make progress in, despite being the one labelled "Start Here." A student who does what they're told first gets no sense of having started.
- **The `2 TODO`s in Dashboard and TimelineZoomed** are both minor (module key constants, a resize listener) but the timeline one means the zoomed view doesn't reposition on window resize.
- **Terminology is unexplained.** ED, EA, REA, RD, FAFSA priority, unweighted GPA. There's a FAFSA definition component (`FafsaDefinition.tsx`) so the pattern exists — extend it to the application rounds, which are genuinely confusing and carry binding commitments. A student who picks ED without understanding it has made a contractual promise.

---

## Suggested order

**Before any student sees it**
1. Notification toggles — build or remove (§1.1)
2. Essay feedback — turn on or stop advertising (§1.2)
3. Fix the dead timeline button (§3.4)
4. Make gender and nationality optional (§3.2)

**Before calling it a product**
5. Phone layout (§4.4)
6. Make estimated college deadlines honest and correctable (§2.1)
7. A first-run path on the dashboard (§3.1)
8. Account deletion (§1.3)
9. Explain ED/EA/REA before a student picks one (§5)

**Next**
10. Parent/counselor sharing (§4.1)
11. Scholarship freshness (§2.2)
12. Longer-range time pressure (§4.2)

---

## What I could not check

Worth someone doing a real session for:

- **Onboarding pace.** Four timeline questions plus a four-section survey before the dashboard. On paper that's a lot before any payoff; whether it drags needs a real run.
- **The timeline in motion.** It's the most animation-heavy screen and I only saw it as static markup.
- **Screen readers and keyboard-only.** I checked that the new deadline controls have labels and roles; the older screens I did not audit.
- **Real Supabase behaviour** — RLS, load times, what breaks when the session expires mid-edit.
- **Anything in the live auth flow** — sign-up, email confirmation, password reset as a student experiences them.
