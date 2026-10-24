# Ranking check

Runs students through Discover's real ranking, the `match_colleges` SQL then the engine and the feed order, and checks what they'd see. Use it after any change to `web/src/lib/collegeMatch.ts` or the `match_colleges` migration.

It covers:
- 13 hand-written students, plus 672 generated from a grid of state × GPA × SAT × income × distance.
- Rules every feed must keep, for example: no two reaches in a row, long shots last, in-state means in-state, no college that excludes the student's gender.
- Rules about single schools, for example: a higher SAT never gets a worse band, out-of-state is never cheaper than in-state.
- Quality numbers for the top tens: graduation rate, share of well-known schools, reaches, the most repeated schools.
- A diff against the last run's top tens.

## Setup

Needs a local Postgres (any empty database), plus `psql`, `unzip` and Node 22+ on `PATH`.

```sh
createdb ranking
export DATABASE_URL=postgres://postgres@127.0.0.1:5432/ranking

# Load the data. This copies every published college with the app's anon key
# (from web/.env.local) and applies the ranking migrations. It also fills
# Carnegie class and tuition from IPEDS, and single-sex flags from Scorecard;
# DEMO_KEY works, or set SCORECARD_API_KEY.
node scripts/ranking-check/load.mjs

# Run the check
node scripts/ranking-check/check.ts
```

The report goes to `out/report.md`, and the top tens to `out/snapshot.json`. The exit code is 1 if any rule fails. Reload the data only when the migration changes; while iterating on the engine, rerun just the check.

`load.mjs` also installs main's ranking as `match_colleges_main`, for old-versus-new comparisons.
