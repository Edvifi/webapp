# Common App deadline ingest

Fills in application deadlines on `public.colleges` from the
[Common App requirements grid](https://content.commonapp.org/Files/ReqGrid.pdf),
the PDF Common App publishes and keeps current through the cycle.

**46** of 6,273 colleges had a real deadline. Everything else fell back to a
typical date for the round and was shown to the student as an estimate. This
brings that to **~980**.

## Run

```bash
cd scripts/ingest-deadlines
node --test parse.test.mjs   # the parser is the fragile part; test it first
node ingest.mjs              # dry run: prints what it would change, writes nothing
node ingest.mjs -v           # the same, plus every row
node ingest.mjs --apply      # write
```

Needs `pdftotext` (`brew install poppler`) on PATH. Reads Supabase credentials
from `web/.env.local`. Re-runnable: it only ever fills blanks.

## What it brings in

Per round: Early Decision, Early Action and Regular Decision dates.

Per school: the US application fee and whether a fee waiver is accepted. Worth
having because the answer is so often "nothing" — of the 1,128 schools the grid
lists a fee for, **611 charge $0**. The median is $0, the 90th percentile $70,
the highest $150. Waivers are accepted at 540, US-only at 90, refused at 29.

Needs the `application_fee_cents` / `fee_waiver_policy` columns, added in
`20261001000000_college_application_fees.sql`. Apply that before running.

## Writing: use emit-sql

`public.colleges` is **RLS read-only** in normal operation, so the anon key
cannot update it. Rather than open a hole to let the script write, emit the
same changes as SQL and run them as the project owner:

```bash
node emit-sql.mjs deadlines.sql   # same selection as --apply, writes no rows
```

Paste the result into the Supabase SQL editor. It is one statement, so it
lands whole or not at all, and every column is written through
`coalesce(new, existing)` — a curated value survives even if the selection
logic were wrong.

Deadlines only ever fill a blank. Fees are refreshed on every run: nobody
curates those by hand, the grid is their only source, and a school that drops
its fee should stop being shown as charging one.

This is how the September 2026 run was applied: 935 rows, taking real
regular-decision dates from 46 colleges to 977.

### --apply, and why it needs care

`--apply` writes with the anon key, so it only works bracketed by a temporary
policy that must be dropped straight after — the procedure
`scripts/ingest-colleges` documents:

```sql
create policy "colleges temp deadline update" on public.colleges
  for update to anon using (true) with check (true);
-- ... run ...
drop policy if exists "colleges temp deadline update" on public.colleges;
```

That policy lets anyone holding the anon key — which is public in the JS
bundle — rewrite the table for as long as it exists. `emit-sql` avoids the
window entirely, which is why it is the path above.

Without the policy PostgREST accepts every UPDATE and changes nothing: an
RLS-filtered update is zero rows, not an error. That is not hypothetical — a
run reported a confident `wrote 935/935` having written nothing at all. The
script now counts the rows that actually came back and stops on the first that
changed none.

Current run: 1,127 schools parsed, 955 matched, **935 rows to fill**, 0 overwritten.

## What it will not do

**It never overwrites a value that is already there.** Spot-checking the
disagreements found the grid right about Stanford (Jan 5, where we held a wrong
Jan 2) and wrong about Georgetown (Jan 1, where Jan 10 is the real date), so
neither source wins outright. The 46 curated rows were checked by hand and a
bulk import does not get to quietly undo that. Disagreements print as
`differs:` lines for someone to settle by hand — there are 13, and 30 other
values agree exactly, which is the main evidence the parse is sound.

**It does not guess between campuses.** A grid row matches a college by
normalised name, or by a name prefix when exactly one college matches. Arizona
State, Kent State and Colorado State each have six or more campus rows, so
those stay unmatched rather than risk putting the main campus's deadline on a
branch. Of 169 unmatched, most are foreign universities absent from the
Scorecard dataset (Aberystwyth, Dublin City, Esade, IE) and the rest are
multi-campus systems.

**It does not store EDII or EAII.** 185 schools publish them; the app's
`AppDeadlineType` has no round for them, and a column nothing renders is data
nobody reads.

**Schools listed more than once are skipped** — a few appear once per program
with different deadlines under one name, and there is no way to tell which
program a student means.

## The parser

`parse.mjs` is where everything fragile lives, which is why it is separate and
tested without a network or a database.

The grid repeats its column header on every one of its 55 pages, and **the
columns are in a different place on each**. Across pages `ED` sits anywhere
from column 36 to 39 and the drift compounds rightward — by `RD` two pages can
be 28 characters apart. So a round is identified by calibrating against that
page's own header, never a fixed offset.

This was not theoretical: fixed bands read Yale's restrictive-early date as its
regular-decision deadline, because on Yale's page REA sits where other pages
keep RD. `parse.test.mjs` pins that case and the other four that broke.

If Common App changes the layout, the parser needs revisiting, and it is built
to fail loudly rather than mis-file a round: `ingest.mjs` throws if fewer than
900 schools parse, and refuses to let two grid rows claim one college.
