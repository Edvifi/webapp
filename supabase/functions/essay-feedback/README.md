# essay-feedback

AI feedback for the Essays module. The client `POST`s a draft and gets back
structured, coach-style feedback (summary, strengths with evidence,
improvements by area, next steps) as schema-validated JSON from Claude.

```
POST /functions/v1/essay-feedback
Authorization: Bearer <user session JWT>      (supabase.functions.invoke sends this)
{ "essay": "...", "prompt"?: "...", "title"?: "...", "wordTarget"?: 650, "draftId"?: "essay-…" }

200 { "feedback": { summary, strengths[], improvements[], next_steps[] } }
4xx/5xx { "error": "<message safe to show the student>" }
```

Client wrapper: `web/src/lib/essayFeedback.ts`.

## Student-facing guardrails

The coach prompt describes the *writing*, never its origin: it is explicitly
told not to accuse a student of plagiarism or AI use, because it cannot know
and a false accusation aimed at a teenager does real harm. Generic-sounding
drafts get specificity coaching instead. The panel also carries a standing note
that feedback is a starting point and that drafts should go to a counselor or
teacher too.

## Feature flag

The feature is dark by default on both sides:

| Side | Variable | Default | Effect when off |
| ---- | -------- | ------- | --------------- |
| Web app (build-time) | `VITE_FEATURE_ESSAY_FEEDBACK` | off | No "Get feedback" button or panel; no requests are made |
| Edge function (runtime) | `ESSAY_FEEDBACK_ENABLED` | on | Every request → 503 before auth or any model call (kill switch for direct API callers too) |

Set `VITE_FEATURE_ESSAY_FEEDBACK=true` in the hosting provider's env (or
`web/.env.local`) and rebuild to turn it on for users. To shut it off in an
emergency without a frontend deploy: `supabase secrets set ESSAY_FEEDBACK_ENABLED=false`.

## Auth

`verify_jwt` stays **on** (the default). That platform check only proves the
bearer token is a JWT signed by the project — and the public anon key is one.
So the function also resolves the token to a signed-in user with
`auth.getUser()`:

| Caller                      | Result |
| --------------------------- | ------ |
| Signed-in user              | ✅ 200 |
| Anon key only (not signed in) | 401  |
| Anonymous-sign-in user      | 403    |
| No / malformed bearer       | 401 (from the platform) |

## Cost controls

| Control | Value | Override |
| ------- | ----- | -------- |
| Model | `claude-sonnet-5` ($2 / $10 per MTok) | `ESSAY_FEEDBACK_MODEL` (allowlisted) |
| Effort | `medium` (adaptive thinking) | `ESSAY_FEEDBACK_EFFORT` = low · medium · high · xhigh · max |
| Per-user cap | 10 requests per rolling 24 h → 429 | `ESSAY_FEEDBACK_DAILY_LIMIT` |
| Global cap | 500 requests per rolling 24 h → 503 | `ESSAY_FEEDBACK_GLOBAL_DAILY_LIMIT` (`0` disables) |
| Output cap | `max_tokens` 8,000 → ≤ $0.08 of output per call | — |
| Input caps | essay ≤ 40,000 chars (≥ 30 words), prompt ≤ 4,000, title ≤ 300 | — |
| Model deadline | 90 s, **no retries** | — |

Typical cost per request: **$0.03–0.05** (a 650-word essay is ~1.7k input
tokens; thinking plus the JSON answer is ~2–4k output tokens). The enforced
worst case is ~$0.10, so the two caps bound spend at roughly **$1/day per
account** and **$50/day overall**.

Three things make those bounds real rather than nominal:

- **The rate limit is atomic.** Counting and inserting happen inside
  `claim_essay_feedback_slot()` under an advisory lock, so 200 parallel requests
  from one account cannot all read the same pre-insert count and all proceed.
- **Nothing is retried.** The API bills an aborted or failed generation, so an
  automatic retry would pay twice for one answer. Failures surface to the
  student instead.
- **Billed failures count against the quota.** Only failures that provably
  burned no tokens (connection errors, upstream 429s, auth and request errors)
  are exempt. Timeouts, `max_tokens` stops and malformed output all consume a
  slot, because they all consumed spend.

A `pending` row whose isolate died mid-call stops counting after 10 minutes, so
a crash cannot cost a student a slot for the rest of the window.

Overrides are read per request, so a secret change takes effect on the next
invocation with no redeploy and no waiting for warm workers to recycle.
`ESSAY_FEEDBACK_MODEL` is checked against an allowlist of adaptive-thinking
models; an unsupported value is logged and ignored rather than 400ing every
request.

**This is not a substitute for a spend limit on the Anthropic key.** Signup is
open, so a determined attacker can create accounts. Set a monthly cap on the
workspace key and consider enabling captcha on signup.

## Secrets

| Name | Required | Notes |
| ---- | -------- | ----- |
| `ANTHROPIC_API_KEY` | yes | `supabase secrets set ANTHROPIC_API_KEY=sk-ant-…` |
| `ESSAY_FEEDBACK_ENABLED` | no | default `true`; `false` = kill switch (503) |
| `ESSAY_FEEDBACK_MODEL` | no | default `claude-sonnet-5` |
| `ESSAY_FEEDBACK_EFFORT` | no | default `medium` |
| `ESSAY_FEEDBACK_DAILY_LIMIT` | no | default `10` (per user, rolling 24 h) |
| `ESSAY_FEEDBACK_GLOBAL_DAILY_LIMIT` | no | default `500`; `0` disables the global ceiling |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform.

## Deploy

1. **Apply the migration first.** It creates the table *and*
   `claim_essay_feedback_slot()`, which the function calls before every model
   request. Without it the function fails closed with a 500 — deliberate: no
   rate limiter, no spend.
2. Deploy with JWT verification left on:
   `supabase functions deploy essay-feedback`
   (or the Supabase MCP `deploy_edge_function` with `verify_jwt: true`).
3. Smoke test without spending anything — a call with only the anon key must
   be rejected by the in-function user check (the platform check lets it
   through because the anon key is a valid JWT):
   ```sh
   curl -s -X POST "$SUPABASE_URL/functions/v1/essay-feedback" \
     -H "Authorization: Bearer $ANON_KEY" -H "apikey: $ANON_KEY" \
     -H "Content-Type: application/json" -d '{}'
   # → {"error":"Sign in to request feedback"}   (HTTP 401)
   ```
4. Then request feedback on a real draft in the app and confirm a row appears
   in `essay_feedback_requests` with `status = 'ok'` and token counts.
