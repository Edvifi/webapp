# Supabase

## Migrations (`supabase/migrations/`)

The full schema history for the project, in apply order:

| Version | What it does |
| --- | --- |
| `20260411000000_baseline_profiles_and_auth` | **Reconstructed baseline.** `profiles` table + RLS policies + the `handle_new_user` / `on_auth_user_created` trigger. |
| `20260411231046_create_fafsa_tables` | FAFSA reference + saved-items tables |
| `20260411232527_expand_federal_programs_category` | Widen the federal-programs category check |
| `20260412002840_create_fafsa_tracker_and_module_state` | Tracker items + per-user module state |
| `20260412004537_extend_fafsa_scholarships_with_detail_fields` | Extra scholarship detail columns |
| `20260415024642_add_settings_column_to_profiles` | `profiles.settings` jsonb column |
| `20260709070330_add_mark_intro_seen_function` | `mark_intro_seen(text)` RPC (atomic intros_seen append) |
| `20260710060112_add_merge_settings_function` | `merge_settings(jsonb)` RPC (atomic per-key settings merge) |

### Notes

- The **baseline** captures objects that were originally created directly
  against the project (before the migration ledger existed). It is written
  idempotently (`create table if not exists`, `create or replace`,
  `drop … if exists`) so it is a safe no-op against the existing database and
  still rebuilds a fresh one from scratch. Its `20260411000000` version is not
  yet recorded in the remote ledger; a `supabase db push` will reconcile it as
  a no-op. Every other file's version already matches the remote ledger.
- Versions `20260411231046`–`20260415024642` are verbatim copies of the SQL
  recorded in the remote migration ledger.

### Using the Supabase CLI

To manage these with the CLI you'll need to link the project (adds
`supabase/config.toml`):

```sh
supabase link --project-ref <project-ref>
supabase db push          # apply any unrecorded migrations (baseline no-op)
supabase migration list   # verify local ⇄ remote are in sync
```
