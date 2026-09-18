-- Schedule the deadline digest edge function via pg_cron + pg_net.
--
-- Runs daily and invokes `deadline-digest`, which emails each student the
-- deadlines falling in the next seven days, honouring the Email Reminders
-- preference the settings page has been writing since the beginning.
--
-- Like the scholarship ingestion job, this is a harmless no-op until it is
-- configured: without EMAIL_PROVIDER_KEY and EMAIL_FROM the function reports
-- what it would have sent and sends nothing.
--
-- Before this does real work you must:
--   1) Set the function secrets:
--        supabase secrets set DIGEST_SECRET=<random> \
--          EMAIL_PROVIDER_KEY=<resend key> EMAIL_FROM='Edvifi <no-reply@yourdomain>'
--   2) Store the SAME DIGEST_SECRET in Vault so the cron job can send it:
--        select vault.create_secret('<your-digest-secret>', 'DIGEST_SECRET');
--
-- To stop sending without unscheduling: supabase secrets set DIGEST_ENABLED=false

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Recreate idempotently.
do $$
begin
  perform cron.unschedule('deadline-digest-daily');
exception when others then null; -- not scheduled yet
end $$;

-- 13:00 UTC daily — morning across the US, which is where the students are.
-- The function itself refuses to mail the same student twice within 20 hours,
-- so an extra run is safe.
select cron.schedule(
  'deadline-digest-daily',
  '0 13 * * *',
  $job$
  select net.http_post(
    url := 'https://oybmtfnarflrceukvays.supabase.co/functions/v1/deadline-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'DIGEST_SECRET')
    ),
    body := jsonb_build_object('mode', 'run'),
    timeout_milliseconds := 150000
  );
  $job$
);
