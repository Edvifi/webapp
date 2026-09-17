# Email setup (custom SMTP)

Password reset is the only transactional email this app sends, and it is the
only way a student who forgets their password can get back to their essays. It
is currently running on Supabase's built-in email service, which is **capped at
2 sends per hour for the whole project** and which Supabase documents as not for
production use.

Two reset requests therefore lock the feature for everyone for an hour. Until
this is set up, treat password reset as best-effort.

Current state is recorded in `../PRODUCTION-READINESS.md`.

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
   dashboard. Landing on the dashboard means the redirect allow-list is wrong;
   check Authentication → URL Configuration against
   `https://timeline-prototype.pages.dev`
4. Set a password of at least 8 characters and confirm you are signed in

If the email never arrives, check the provider's own activity log first. It will
tell you whether Supabase handed the message over, which separates an SMTP
problem from a deliverability one.

## 6. Afterwards

Two follow-ups that only make sense once delivery works:

**Raise the send rate limit.** `rate_limit_email_sent` is still 2/hour, a
Supabase default sized for its built-in service. With real SMTP behind it that
is pointlessly low. Something like 30/hour is reasonable for this size; keep it
bounded, because the reset endpoint is public and unthrottled until CAPTCHA is
enabled.

**Turn off auto-confirm.** `mailer_autoconfirm` is currently on, so email
addresses are never verified: anyone can sign up as any address, and a typo'd
address creates an account that can never receive a reset. Turning it off makes
students confirm by email before the account works. It is the right call for a
product holding minors' data, it adds a step to signup, and it depends entirely
on this SMTP working — so do it after step 5 passes, never before.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Save fails in Supabase | Wrong password or port. Try 587/STARTTLS. |
| Email never arrives, nothing in provider log | Supabase never sent it — recheck SMTP settings, or you hit the rate limit |
| Arrives in spam | Domain not verified, or sender name/address mismatched |
| Link lands on the dashboard | Redirect allow-list missing the production origin |
| Link says expired | Reset links are short-lived and single-use; request a fresh one |
