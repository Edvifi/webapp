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

## Other

- Deadlines: real (curated) for well-known schools, estimated defaults for the
  rest (flagged `deadlines_estimated`). Overlay is applied to the `colleges`
  table (single source). Broadening curated coverage is a data task.
- Logos via logo.dev (client-side from domain). Favicon/emoji fallback remain.
