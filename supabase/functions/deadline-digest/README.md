# deadline-digest

Emails each student the deadlines falling in the next seven days.

Until this existed the three switches under Settings → Notifications wrote a
preference nobody read. Two of them default to on, so a student who never
opened settings had been told they would be emailed about deadlines, and
nothing ever was. This is the other half of that promise.

## What it sends, and what it leaves out

Tracked scholarships that carry a real date, and dates the student set
themselves. Rows already ticked off are skipped.

**Not** college application deadlines. Those are derived in
`web/src/data/applicationDeadlines.ts` from the student's college list, the
curated deadline set and their application cycle year — re-deriving them here
would be a second implementation of rules that are genuinely intricate, and two
implementations of that drift apart. The email says so, and points at the app.
A partial digest that is right beats a complete one that is wrong.

## Deploy

It is a no-op until configured — without a provider key it reports what it
would have sent and sends nothing.

```sh
supabase functions deploy deadline-digest

supabase secrets set \
  DIGEST_SECRET="$(openssl rand -hex 32)" \
  EMAIL_PROVIDER_KEY=re_xxx \
  EMAIL_FROM='Edvifi <no-reply@yourdomain.com>'
```

Then store the same `DIGEST_SECRET` in Vault so the cron job can authenticate:

```sql
select vault.create_secret('<the same value>', 'DIGEST_SECRET');
```

Check it before letting it loose:

```sh
curl -X POST https://<ref>.supabase.co/functions/v1/deadline-digest \
  -H "x-digest-secret: <secret>" -H 'content-type: application/json' \
  -d '{"mode":"dry"}'
# → {"sent":N,"skipped":M,"failed":0,"dry":true}
```

`sent` in a dry run is how many students *would* be emailed.

## Provider

Written against [Resend](https://resend.com). Swapping providers means changing
`sendEmail()` and nothing else. The sender domain must be verified with the
provider or every send fails.

## Switches

| Secret | Effect |
|---|---|
| `DIGEST_ENABLED=false` | Refuses every request with 503. Stops sending without unscheduling the cron job. |
| unset `EMAIL_PROVIDER_KEY` or `EMAIL_FROM` | Runs as a dry run regardless of what the caller asked for. |

## Frequency

The cron job fires daily at 13:00 UTC. The function refuses to mail the same
student twice within 20 hours, stamped in `profiles.settings.digest_last_sent_at`
only after a successful send — so a provider outage retries tomorrow instead of
skipping that student for the day.
