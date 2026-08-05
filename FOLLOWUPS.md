# Follow-ups (colleges DB / recommendations)

Captured during the colleges-DB build to fold into the PR description.

## Recommendation inputs we don't use yet

Recommendations today rank by: household **income** (cost fit) + **list balance**
(reach/match/safety spread) + **selectivity** (absolute acceptance rate). Missing:

- **Intended major / field of study** — *not collected in intake.* Highest-value
  add: filter/boost schools strong in the student's field. College Scorecard
  exposes program-level data (`latest.programs.cip_4_digit`) and field-of-study
  earnings/completion, so this is feasible once a major field exists in the
  survey.
- **Test scores (SAT/ACT)** — *not collected.* With scores + GPA we could compute
  **true per-student reach/match/safety** (admit probability vs the school's
  median stats) instead of the current absolute acceptance-rate bands.
- **GPA** — *already collected* (`demographics.gpa`), currently **unused** by
  recommendations. Low-hanging fruit: combine with acceptance rate for
  personalized selectivity.
- **Home state / zipcode** — *already collected* (`demographics.zipcode`),
  currently **unused**. Would let us use **in-state vs out-of-state** cost for
  public schools (we currently rank on in-state COA only) and surface in-state
  publics.
- **Preferences** — *not collected.* School size, setting (urban/rural), region,
  public/private, distance from home. Useful as soft filters/boosts.

Quick wins (data already in intake): **GPA-personalized selectivity**,
**in/out-of-state cost via zipcode**.
Needs new intake fields: **major**, **test scores**, **preferences**.

## Application deadlines — NEEDS REAL DATA (populate before/after launch)

Current state: deadlines are **computed client-side in
`web/src/data/applicationDeadlines.ts`** — there is no deadline column in the
`colleges` table and no ingest step for them.

- The **46 legacy static colleges** in `web/src/data/collegeData.ts` carry
  curated month/day deadlines (`applicationDeadlines` / `financialAidDeadlines`).
- **Every other school** (all ~6,273 DB-sourced rows) falls back to a smart
  default keyed on the application type the student picked: ED/EA/REA → Nov 1,
  RD → Jan 1, FAFSA → Feb 1.
- The **year** comes from the student's own application cycle
  (`seniorFallYear`, derived from `profiles.grade_start_idx`), not from the
  stored string — so a junior sees the cycle they'll actually apply in.
- `DeadlineEvent.estimated` is derived per event: true for any smart default,
  and also for a curated date whose year had to be shifted into a future cycle
  (only its month/day is known real). The UI renders that as "· est."

> Earlier revisions of this file described a `colleges.deadlines_estimated`
> column and a `scripts/ingest-colleges/curated-deadlines.json` overlay. Neither
> was ever built — that was a design sketch, not the implementation.

**The data wall (researched):** there is **no free structured source** for US
college application deadlines. IPEDS and College Scorecard do **not** carry them;
Common App has **no public API**. They live only on each school's website /
Common Data Set. So "all real" can't come from a dataset — it's inherently a
curation/scrape effort.

Options to raise real coverage (in effort order):
1. **Open-admission → Rolling (cheap, authoritative).** Scorecard's
   `school.open_admissions_policy` (1 = open) is real; for those schools
   "Rolling" is the true answer. Add the field to the ingest, and treat it as a
   real (non-estimated) answer. Covers a real chunk of the long tail for ~zero
   manual work.
2. **Expand curated coverage** beyond the 46 static entries to the most-applied
   selective schools (top ~150–300). This is also the point at which the curated
   set should move out of `collegeData.ts` and into the `colleges` table (a
   deadlines column + an ingest overlay), so it isn't bounded by the static
   file. Each school needs an individual lookup/verify (school site or Common
   Data Set) — real work, not automatable reliably.
3. **Long tail** (selective, non-curated, not open-admission): genuinely no
   source. Decide per product: keep flagged-estimated (plausible, marked) vs.
   null "check school site" (honest, but no timeline/calendar pin).

Recommendation: do (1) now-ish (authoritative + cheap), grow (2) over time,
and pick a policy for (3).

## College List map — persisted projection has no re-projection path

Each list entry stores `mapX`/`mapY`, projected at add-time by `projectToMap`
(`web/src/lib/mapProjection.ts`, baked geoAlbersUsa affines) and consumed by
`web/src/components/CollegeListMap.tsx`. That keeps the map dependency-free and
avoids a DB lookup per pin, but it means the coordinates are a **snapshot of
the projection constants**: if those affines or the SVG viewBox
(`US_MAP_VIEWBOX` in `web/src/data/usStatesGeo.ts`) ever change, every
previously-saved entry keeps its old coordinates and its pin lands in the wrong
place, with no migration to fix it.

Options if the projection ever needs to change: re-project on read (keep
lat/lon on the entry snapshot and drop `mapX`/`mapY`), or version the constants
and re-project stored entries when the version moves.

## Module scope & content boundaries (Application Tracking)

The Overview strategy checklist is accurate and evergreen; these are scope/
boundary items surfaced while reviewing it, not bugs:

- **Financial-fit lives in two modules.** Application Tracking's Discover tab
  shows a rough "Est. ~$Xk/yr" ranking signal; the Financial Aid module owns the
  real numbers (per-school Net Price Calculator links + net-cost comparison).
  Boundary to hold as both grow: **App Tracking = rough ranking, Financial Aid =
  real numbers.** Overview content now points readers to Financial Aid for the
  actual NPC.
- **No Testing (SAT/ACT) module on this branch**, yet Application Tracking
  content leans on test scores repeatedly ("haven't taken the SAT/ACT," "test
  scores officially sent"). Scores are also the missing input for true
  per-student reach/match/safety (see Recommendation inputs above).
- **No Extracurriculars/Activities module on this branch** (one exists on
  `feature/module-framework`). The `as-4` "activities-list article" cross-ref was
  dead here and has been reworded to inline guidance; if an Activities module
  lands, restore the pointer.

## Theme contrast — deliberately deferred

The palette now clears WCAG AA in both themes (measured: 678 sub-AA elements in
dark and 569 in light, down to 20 apiece, all false positives — see below).
Four things were left alone on purpose:

- **~29 decorative colors are still theme-pinned.** Splash/auth/demo orbs, some
  radial glows and box-shadows hold the palette pre-expanded as decimal channels
  (`rgba(45,158,114,0.08)`), so they keep rendering the light-mode hue in dark
  mode. None is text, so none affects readability, and the ESLint guard matches
  hex literals rather than these. Converting them would be a visual design
  change with no measured problem behind it. Mostly `index.css`; also
  `TimelineScreen.tsx:204`, `TimelineZoomed.tsx:319`,
  `ApplicationTrackingModule.tsx:351,471,472`.
- **The audit never sees the auth or demo screens.** It logs in first, so
  everything before the dashboard is unmeasured. That is how
  `.auth-sso-btn--apple` (white on `var(--text)` — cream on cream in dark) sat
  unnoticed; it was found by reading, not measuring. Worth extending the
  harness to cover the pre-login routes.
- **`.dash-module-emoji` reports as failing and is a false positive.** Color
  emoji paint from the emoji font and ignore the CSS `color` property, so
  comparing that color against the background measures nothing. A future audit
  should skip elements whose text is emoji-only, or 20 phantom failures will
  mask real ones.
- **`--text-muted` and `--text-faint` have largely converged** (0.70/0.60 light,
  0.66/0.55 dark). Both must clear 4.5:1 because both carry real text —
  `--text-faint` holds the small uppercase eyebrow labels — and there is no room
  for a third readable tier below muted. The two tokens are now nearly
  redundant; consider retiring one, or reserving `--text-faint` strictly for
  non-informational decoration.

## Other

- Logos via logo.dev (client-side from domain). Favicon/emoji fallback remain.
