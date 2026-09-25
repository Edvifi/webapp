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
