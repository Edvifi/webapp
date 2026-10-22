# Privacy policy — draft

> **Don't publish this.**
>
> It describes what the app does, which is the easy half. Whether that's
> lawful is the half I can't answer. Edvifi takes race, religion and
> immigration answers from teenagers, so it probably isn't simple.
>
> The open questions at the end matter more than the policy text. Several are
> decisions about the product, not the wording, and they have to be settled
> before anyone writes a final version.

Drafted 2026-09-27 against `main` @ `1df1925`.

---

## About Edvifi

Edvifi helps high-school students organise college applications: deadlines,
college lists, essay drafts, scholarships and financial aid.

This policy covers anyone with an account. Our users are high-school students.
Most are under 18. Some may be under 13.

## What we collect

### Your account

**Email address**, so you can sign in, reset your password, and receive
deadline reminders if you ask for them.

**Password.** Our authentication provider stores a hash of it. We never see
the password itself.

### The intro survey

Four answers are required. The other ten are optional, and you can skip any of
them or answer "Prefer not to say".

| Question | Required | Why we ask |
|---|---|---|
| First name | Yes | To address you in the app |
| Age | Yes | See question 1 below |
| ZIP code | Yes | Colleges near you, and scholarships limited to your area |
| High-school name | Yes | School-specific scholarships are among the easiest to win |
| Gender | No | Some scholarships are open only to certain applicants |
| Nationality † | No | Citizenship decides FAFSA eligibility and some scholarships |
| Race † | No | Many scholarships are restricted to specific backgrounds |
| Hispanic or Latino † | No | Federal forms treat this separately from race |
| Native American or Alaska Native † | No | Tribal affiliation opens specific aid, including tuition waivers |
| Religion † | No | Faith-based organisations fund many local scholarships |
| GPA | No | Scholarship matching, and your fit for each college |
| Household income | No | Aid estimates, fee waivers, need-based scholarships |
| Parent's highest education | No | First-generation students qualify for a category of aid |
| Parents are immigrants † | No | Some scholarships are for immigrant and first-generation families |

† Sensitive categories under several state privacy laws. We use these answers
to match you to scholarships and for nothing else. We never sell them and
never share them for advertising.

### What you make in the app

Your college list and where each application stands. Deadlines you set and
tasks you tick off. Essay drafts. Scholarships you're tracking. Your settings
and progress.

### What arrives on its own

**Crash reports.** When the app breaks we record the error and the line of
code it came from. These aren't tied to your account: the tool is set never to
build a profile of you, and we don't record your screen, your clicks or the
pages you visit.

**Server logs.** Our host records IP addresses and request details, as hosts
do.

## What we do with it

Run the app. Match you to scholarships and colleges, which is the only thing
the optional answers are for. Estimate financial aid from the income and
family questions. Email you about deadlines if you switch that on, which is
off unless you do. Fix crashes.

We don't sell your information, share it for advertising, or train machine
learning models on it.

## Who else sees it

| Service | What it gets | What for |
|---|---|---|
| Supabase | Everything in your account | Database and sign-in |
| Vercel | IP address, request logs | Hosting |
| PostHog | Error messages and stack traces | Fixing crashes. Set not to profile users |
| Cloudflare Turnstile | IP address, browser signals | The sign-up bot check |
| Zippopotam.us | Your ZIP code, nothing else | Converting a ZIP to a map location |
| Resend | Email address, reminder contents | Deadline reminders, if you turn them on |

Beyond these, we disclose nothing unless the law requires it.

## What you can do

Leave any optional question blank. The app works without them; you'll see
fewer scholarship matches.

Change your answers in your profile at any time.

Switch reminder emails on or off in Settings.

Delete your account in Settings. That removes your profile, survey answers,
college list, essays, tracked scholarships and progress, permanently.

## Security

Database rules let each account read and write only its own records. Traffic
is encrypted in transit. Your password is hashed by our authentication
provider and never visible to us.

No system is perfectly secure and we don't claim otherwise.

## Changes and contact

If this policy changes we'll update the date above, and tell you in the app if
the change is significant.

**[ADDRESS NEEDED]** for privacy questions, requests about your data, or
anything a parent or guardian wants to raise.

---
---

# Open questions

The policy above describes the software honestly. These are the places where
nobody has checked the software against the law. Several need a product
decision before the wording can be settled.

## 1. Under-13 users

Age is a dropdown starting at 13. Nothing stops a twelve-year-old picking it.
There's no age gate, no parental consent, and nothing that treats a younger
user differently.

COPPA wants verifiable parental consent before collecting anything from
children under 13. The choices are to block under-13 sign-ups and say so, to
build a consent flow, or to carry on and absorb the risk.

Separately: age is collected and then never used. Nothing reads it. That's
hard to defend under data minimisation on its own. It should either gate
something or come out of the survey.

## 2. Nobody has agreed to anything

No consent checkbox at sign-up. No terms of service. No policy link anywhere
in the app. A student reaches the survey and answers questions about race and
their parents' immigration status without being shown what happens to any of
it.

Whatever the final text says, it needs a place to appear and a record that
someone saw it.

## 3. Sensitive categories

CPRA, the Virginia CDPA and the Colorado Privacy Act treat race, religion and
immigration status as sensitive. Some require opt-in consent for that data
specifically, separate from any general consent. Right now there's neither.

## 4. Users aged 13 to 17

Several states set separate rules for minors over 13, covering opt-in for
sharing and limits on profiling. Which ones apply depends on where the users
actually are, which is a question about the user base rather than the code.

## 5. FERPA

If a school ever adopts Edvifi for its students, rather than students finding
it themselves, FERPA and state student-privacy laws may apply. That's a
different regime. Ask before it happens.

## 6. No export

Deletion works. Export doesn't exist. Laws that require deletion usually
require access or portability too.

## 7. No retention rule

Nothing expires. An abandoned account keeps its data forever. Decide a rule
and implement it first, rather than writing one into a policy the code
doesn't follow.

## 8. Processor agreements

Supabase, Vercel, PostHog, Cloudflare and Resend each need a DPA. Check which
are signed.

Zippopotam.us is the odd one. It's a free public API with no key and no
agreement of any kind, and it receives a student's ZIP code on every profile
load. The data is low-sensitivity, but it's an unbound third party in the
flow. A local ZIP-to-coordinates table removes it; that's a small change
whenever you want it.

## 9. Not covered here

No lawful basis, no governing law, no international transfers, no GDPR or UK
text. This draft assumes US-only users. If that's wrong, or becomes wrong, the
document needs a different shape.
