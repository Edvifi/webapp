# Backup export

Dumps every row of student-authored data to timestamped JSON.

## Why

On the free tier there are no daily backups and no point-in-time recovery, and
every essay, college list and answer lives in one `profiles.settings` JSONB
column. One bad write and it is unrecoverable.

Keep this after upgrading to Pro. Daily backups restore the whole database to
yesterday; they cannot restore one student's drafts without rolling everyone
else back too.

## Run it

```sh
SUPABASE_SERVICE_ROLE_KEY=... node scripts/backup/export.mjs
```

The key is in Supabase → Settings → API. It bypasses row-level security, which
is the point — it has to read every student's rows. Pass it inline rather than
exporting it, and never put it in `web/.env.local`, which ships to the browser.

Output lands in `backups/<timestamp>/`, one file per table plus a manifest.
`backups/` is gitignored: these files contain minors' essays, demographics and
income brackets, and must not reach the repository.

## Schedule it

Daily is enough at this size. On macOS:

```sh
0 3 * * *  cd /path/to/webapp && SUPABASE_SERVICE_ROLE_KEY=... node scripts/backup/export.mjs >> /tmp/edvifi-backup.log 2>&1
```

Store the output somewhere that is not the same machine.
