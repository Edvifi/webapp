# Email setup (custom SMTP)

This app sends three transactional emails, and all three matter.

**Password reset** is the only way a student who forgets their password gets
back to their essays. **Invites** are the only way anyone gets an account at
all, once signups are closed — see `../docs/waitlist.md`. **Signup
confirmation** became load-bearing on 2026-10-24, when auto-confirm was turned
off: an account does not work until its link is clicked, so a confirmation
email that fails to arrive is a student who cannot sign up at all.

All three run on Resend over custom SMTP as of 2026-10-24. Before that they
used Supabase's built-in sender, capped at 2 sends per hour project-wide and
documented by Supabase as not for production.

Current state is recorded in `../PRODUCTION-READINESS.md`.

> **`disable_signup` is false, so the waitlist is not actually gating
> anything.** Anyone who finds `app.edvifi.ai` can create an account; the
> invite flow is one route in, not the only one. That is worth deciding on
> deliberately rather than inheriting — it is the difference between a closed
> beta and an open signup, and confirmation-on-signup only became load-bearing
> because this is open.

---

## What is actually true today

Read off the project's auth config and the domain's DNS, rather than assumed.
Re-read after the 2026-10-24 cutover; every row below was verified against the
live config, not inferred from this file:

| | |
| --- | --- |
| `smtp_host` | `smtp.resend.com` ✓ — sender `Edvifi <noreply@edvifi.ai>` |
| `rate_limit_email_sent` | **30** per hour, project-wide |
| `smtp_max_frequency` | 60s minimum between messages to one address |
| `mailer_otp_exp` | **86400** ✓ — emailed links last 24h |
| `mailer_autoconfirm` | **off** ✓ — signup requires a confirmed address |
| `mailer_allow_unverified_email_sign_ins` | **false** ✓ — unconfirmed accounts cannot sign in |
| `disable_signup` | **false** — self-signup is open, *not* invite-only |
| `site_url` | `https://app.edvifi.ai` ✓ |
| `uri_allow_list` | includes `https://app.edvifi.ai/**` ✓ |
| Invite, reset + confirmation templates | **written** (see "Templates", below) |
| Every other template | Supabase stock |

**`mailer_otp_exp` was 3600 and is now 86400.** A link that died in an hour
would be dead before most teenagers opened the email. That was tolerable while
auto-confirm was on and the link was optional; it stopped being tolerable the
moment signup started depending on it, because a student who opened the mail
the next morning would have had a dead link *and* an account they could neither
sign into nor reset. The two settings had to move together. 86400 is Supabase's
own default and is shared with reset links, which is ordinary practice for
both.

### The domain has no email authentication at all

| Record | State |
| --- | --- |
| MX | Google Workspace (`aspmx.l.google.com` et al) — inbound mail works |
| SPF | **none.** Only two `google-site-verification` TXT records |
| DKIM | **none.** No selector responds, `google._domainkey` included |
| DMARC | **none** |

DNS is on Google Cloud DNS (`ns-cloud-e*.googledomains.com`) through
Squarespace Domains, so records go in **Squarespace → Domains → edvifi.ai →
DNS**.

**Send from a subdomain** — `send.edvifi.ai` — rather than the root. A domain
may have only one `v=spf1` TXT record, so putting a provider's SPF on the root
means merging it by hand with whatever Google Workspace needs later, and
getting that wrong silently breaks mail you are already sending. A subdomain
keeps the two apart and isolates sending reputation from the domain students
receive mail *at*.

Worth doing separately, and not part of this: the root domain publishes no SPF
and no DKIM, so mail sent from Google Workspace as `@edvifi.ai` is already
unauthenticated.

---

## 1. Choose a provider

| Provider | Free tier | Notes |
| --- | --- | --- |
| **Resend** | 3,000/month | Simplest setup. Ample at this size. |
| **Postmark** | 100/month trial | Best deliverability for transactional mail; paid after trial. |
| **AWS SES** | 3,000/month (in free tier) | Cheapest at volume, fiddliest setup, starts sandboxed. |

Resend is the recommendation here. At 8 accounts you will use a handful of
emails a month, and the setup is the shortest path to working delivery.

## 2. Verify a sending domain

**Do not skip this.** It is the difference between reset emails arriving and
reset emails landing in spam, and it is the step that actually takes time
because DNS has to propagate.

The provider will give you records to add wherever the domain's DNS lives:

- **SPF** — a TXT record saying this provider may send as your domain
- **DKIM** — a TXT or CNAME record carrying the signing key
- **Return-Path / custom MAIL FROM** — usually a CNAME, improves alignment

Add them, then click verify in the provider's dashboard. Propagation is usually
minutes but can take hours.

If you have no domain ready, you can start on the provider's own sandbox domain
to prove the plumbing works, then come back and do this before real students
rely on it. Sandbox senders get filtered aggressively.

## 3. Get SMTP credentials

For Resend:

| Field | Value |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `587` |
| Username | `resend` |
| Password | your Resend API key |

Other providers differ; take the values from their SMTP page rather than
guessing. Port 587 with STARTTLS is the safe default. **Port 25 is blocked** by
Supabase Edge Functions and many hosts, so do not use it.

## 4. Enter them in Supabase

Dashboard → **Authentication → Emails → SMTP Settings**:

- Enable custom SMTP
- Host, port, username, password from above
- **Sender email** on the domain you just verified, e.g. `no-reply@edvifi.com`
- **Sender name** a student will recognise, e.g. `Edvifi` — this appears in the
  inbox, and an unfamiliar name reads as phishing

Save. Supabase validates the connection on save, so a wrong password fails
immediately rather than silently.

## 5. Test it end to end

Sending from the app is the only test that proves the whole path:

1. Open the production site, click **Forgot password?**, enter a real address
2. The email should arrive within a minute
3. Follow the link — it must land on **"Choose a new password"**, not the
   dashboard. Landing on the dashboard means the redirect allow-list is wrong —
   though as of 2026-10-24 it is right: Site URL is `https://app.edvifi.ai` and
   the allow-list covers `https://app.edvifi.ai/**`, the Vercel preview host and
   localhost. Changing the domain means changing both.
4. Set a password of at least 8 characters and confirm you are signed in

If the email never arrives, check the provider's own activity log first. It will
tell you whether Supabase handed the message over, which separates an SMTP
problem from a deliverability one.

## 6. Afterwards

All three follow-ups below were done on 2026-10-24, once step 5 passed. Kept
with their reasoning rather than deleted, because each is a knob someone may
need to reconsider:

**Raise the send rate limit.** ✅ Now 30/hour. It was 2/hour, a Supabase
default sized for its built-in service, which was pointlessly low with real
SMTP behind it. Kept bounded on purpose: the reset endpoint is public and
unthrottled until CAPTCHA is enabled.

**Raise `mailer_otp_exp`.** ✅ Now 86400. See the note at the top for why it
could not stay at 3600 once auto-confirm came off.

**Turn off auto-confirm.** ✅ Done. It was on, so addresses were never
verified: anyone could sign up as any address, and a typo'd address created an
account that could never receive a reset. The right call for a product holding
minors' data, and it depends entirely on this SMTP working, so it went last.

The app already expected this. `AuthScreen` has always shown "Check your email"
after signup — with auto-confirm on, that screen was a lie — and
`friendlyError` already maps `email not confirmed`. Verified by signing up for
real: the response withheld the session (`confirmed_at: null`,
`access_token: null`) and set `confirmation_sent_at`. The confirmation template
was Supabase stock and is now branded like the invite and reset ones, since it
is the first email a student ever gets from us.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Save fails in Supabase | Wrong password or port. Try 587/STARTTLS. |
| Email never arrives, nothing in provider log | Supabase never sent it — recheck SMTP settings, or you hit the rate limit |
| Arrives in spam | Domain not verified, or sender name/address mismatched |
| Link lands on the dashboard | Redirect allow-list missing the production origin |
| Link says expired | Reset links are short-lived and single-use; request a fresh one |

---

## Templates

The invite and password-reset emails are written; everything else is still
Supabase stock. Both name Edvifi, say what the link does, say it expires, say
which address it went to, and say what to do if you did not ask for it — which
matters more than usual when the recipient is fifteen and the stock template
read "You have been invited to create a user on https://app.edvifi.ai".

They are plain inline-styled tables with one image (`/logos/logo-color.png`,
publicly served), so they degrade to readable text when a client blocks images.

Edit them in Authentication → Emails → Templates, or over the Management API:

```sh
TOKEN=...   # Supabase account token; the CLI keeps one in the macOS keychain
curl -X PATCH "https://api.supabase.com/v1/projects/oybmtfnarflrceukvays/config/auth" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"mailer_subjects_invite":"Your Edvifi invite is ready"}'
```

The same endpoint sets SMTP, which is quicker than the dashboard once you have
a key — `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `smtp_sender_name`,
`smtp_admin_email`. Read the config back afterwards rather than trusting the
write.
