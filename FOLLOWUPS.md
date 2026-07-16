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

Current state: **42 well-known 4-year schools have real, verified deadlines**
(`deadlines_estimated=false`, curated overlay in
`scripts/ingest-colleges/curated-deadlines.json`). The other ~2,168 use smart
defaults (EA Nov 1 / RD Jan 1 / FAFSA Feb 1), flagged `deadlines_estimated=true`
and surfaced in the UI as "· est." Deadlines are single-source in the `colleges`
table.

**The data wall (researched):** there is **no free structured source** for US
college application deadlines. IPEDS and College Scorecard do **not** carry them;
Common App has **no public API**. They live only on each school's website /
Common Data Set. So "all real" can't come from a dataset — it's inherently a
curation/scrape effort.

Options to raise real coverage (in effort order):
1. **Open-admission → Rolling (cheap, authoritative).** Scorecard's
   `school.open_admissions_policy` (1 = open) is real; for those schools
   "Rolling" is the true answer. Add the field to the ingest and set
   `regularDecision='Rolling'`, `deadlines_estimated=false`. Covers a real chunk
   of the long tail for ~zero manual work.
2. **Expand curated** beyond 42 to the most-applied selective schools (top
   ~150–300). Each needs an individual lookup/verify (school site or Common Data
   Set) — real work, not automatable reliably.
3. **Long tail** (selective, non-curated, not open-admission): genuinely no
   source. Decide per product: keep flagged-estimated (plausible, marked) vs.
   null "check school site" (honest, but no timeline/calendar pin).

Recommendation: do (1) now-ish (authoritative + cheap), grow (2) over time,
and pick a policy for (3).

## Other

- Logos via logo.dev (client-side from domain). Favicon/emoji fallback remain.
