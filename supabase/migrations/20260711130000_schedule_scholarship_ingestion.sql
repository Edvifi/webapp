-- Schedule the scholarship ingestion edge function via pg_cron + pg_net.
--
-- Runs weekly and invokes the `ingest-scholarships` function over HTTP with the
-- shared secret pulled from Supabase Vault (so the secret is never stored in
-- plaintext in cron.job). The job is a harmless no-op (the function returns a
-- configuration error, logged in fafsa_scholarship_ingest_runs) until you set
-- the secrets — see supabase/functions/ingest-scholarships/README.md.
--
-- Before this does real work you must:
--   1) Register for a CareerOneStop token and set the function secrets
--      (INGEST_SECRET, CAREERONESTOP_USER_ID, CAREERONESTOP_TOKEN).
--   2) Store the SAME INGEST_SECRET in Vault so the cron job can send it:
--        select vault.create_secret('<your-ingest-secret>', 'INGEST_SECRET');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Recreate idempotently.
do $$
begin
  perform cron.unschedule('scholarship-ingestion-weekly');
exception when others then null; -- not scheduled yet
end $$;

-- Mondays at 08:00 UTC.
select cron.schedule(
  'scholarship-ingestion-weekly',
  '0 8 * * 1',
  $job$
  select net.http_post(
    url := 'https://oybmtfnarflrceukvays.supabase.co/functions/v1/ingest-scholarships',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-ingest-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'INGEST_SECRET')
    ),
    body := jsonb_build_object('mode', 'run'),
    timeout_milliseconds := 150000
  );
  $job$
);
