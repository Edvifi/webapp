// Deadline digest edge function.
//
//   POST { mode: "run" | "dry" }  →  { sent, skipped, failed, dry }
//
// Sends each student the deadlines falling in the next few days, honouring the
// notification preferences the settings page has been writing all along. Until
// this existed those switches were decorative: two of them defaulted to on, so
// a student who never opened settings had been silently told they would be
// emailed about deadlines, and nothing ever was.
//
// Called by pg_cron daily (see the accompanying migration). Authenticated with
// the same shared-secret header pattern as ingest-scholarships, because cron
// cannot hold a user JWT.
//
// It computes deadlines the way the app does, and deliberately only the parts
// that need no college catalogue: tracked scholarships with a real date, and
// the dates a student set themselves. Re-deriving college application
// deadlines here would mean a second implementation of the cycle-year rules in
// web/src/data/applicationDeadlines.ts, and two implementations of that drift.
// A student gets an honest partial digest rather than a wrong complete one.
//
// Secrets:
//   DIGEST_SECRET      shared with the cron job (required)
//   EMAIL_PROVIDER_KEY API key for the mail provider (required to send)
//   EMAIL_FROM         verified sender address (required to send)
//   DIGEST_ENABLED     set to "false" to stop sending without unscheduling
// Auto-provided: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// Without EMAIL_PROVIDER_KEY / EMAIL_FROM the function still runs, reports what
// it *would* have sent, and sends nothing — so the cron job is a harmless
// no-op until the provider is configured, exactly like ingest-scholarships.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-digest-secret",
}

/** How far ahead a digest looks. Matches the dashboard panel's week. */
const WINDOW_DAYS = 7
/** Never mail a student twice in one day, however often cron fires. */
const MIN_HOURS_BETWEEN = 20

interface Deadline {
  title: string
  date: string
  kind: string
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  })

const isoDay = (d: Date) => d.toISOString().slice(0, 10)

/** Local-midnight parse of `YYYY-MM-DD`; a bare Date() would read it as UTC. */
function parseDay(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const d = new Date(`${iso}T00:00:00Z`)
  return isNaN(d.getTime()) ? null : d
}

/**
 * The dates this function can compute without the college catalogue: tracked
 * scholarships that carry a real date, and the student's own entries. Rows the
 * student has already ticked are skipped — `submitted` is what a tick writes.
 */
async function deadlinesFor(
  admin: SupabaseClient,
  userId: string,
  settings: Record<string, unknown> | null,
  today: Date,
  horizon: Date,
): Promise<Deadline[]> {
  const out: Deadline[] = []

  const { data: tracked } = await admin
    .from("fafsa_tracker_items")
    .select("name, deadline_date, status")
    .eq("user_id", userId)
    .in("status", ["researching", "planning", "ready"])
    .not("deadline_date", "is", null)

  for (const row of tracked ?? []) {
    const date = parseDay(String(row.deadline_date))
    if (!date || date < today || date > horizon) continue
    out.push({ title: String(row.name ?? "Scholarship"), date: isoDay(date), kind: "Scholarship" })
  }

  // Self-set dates live in settings.module_data.deadlines, written by the web
  // app through merge_settings.
  const moduleData = (settings?.module_data ?? {}) as Record<string, Record<string, unknown>>
  const own = moduleData?.deadlines?.own
  const done = new Set(
    (Array.isArray(moduleData?.deadlines?.done) ? moduleData.deadlines.done : [])
      .filter((x): x is string => typeof x === "string"),
  )
  if (Array.isArray(own)) {
    for (const raw of own) {
      if (typeof raw !== "object" || raw === null) continue
      const { id, title, date: iso } = raw as Record<string, unknown>
      if (typeof id !== "string" || typeof title !== "string" || typeof iso !== "string") continue
      if (done.has(id)) continue
      const date = parseDay(iso)
      if (!date || date < today || date > horizon) continue
      out.push({ title, date: isoDay(date), kind: "Yours" })
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date))
}

function renderEmail(name: string, deadlines: Deadline[]): { subject: string; text: string } {
  const lines = deadlines.map((d) => `  ${d.date}  ${d.title} (${d.kind})`)
  const subject = deadlines.length === 1
    ? `1 deadline this week: ${deadlines[0].title}`
    : `${deadlines.length} deadlines this week`
  const text = [
    `Hi ${name},`,
    ``,
    `Coming up in the next ${WINDOW_DAYS} days:`,
    ``,
    ...lines,
    ``,
    `This covers your scholarships and the dates you set yourself.`,
    `Open Edvifi to see your college application deadlines too.`,
    ``,
    `To stop these, turn off Email Reminders in Settings.`,
  ].join("\n")
  return { subject, text }
}

/** Resend's API. Swapping providers means changing this one function. */
async function sendEmail(
  apiKey: string, from: string, to: string, subject: string, text: string,
): Promise<string | null> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
  })
  if (!res.ok) return `${res.status} ${await res.text().catch(() => "")}`.slice(0, 200)
  return null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const secret = Deno.env.get("DIGEST_SECRET")
  if (!secret || req.headers.get("x-digest-secret") !== secret) {
    return json({ error: "Forbidden" }, 403)
  }
  if (Deno.env.get("DIGEST_ENABLED") === "false") return json({ error: "Disabled" }, 503)

  const url = Deno.env.get("SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !serviceKey) return json({ error: "Not configured" }, 503)

  const apiKey = Deno.env.get("EMAIL_PROVIDER_KEY")
  const from = Deno.env.get("EMAIL_FROM")
  let body: { mode?: unknown } = {}
  try { body = await req.json() } catch { /* an empty body means a real run */ }
  // No provider configured means no sending, whatever the caller asked for.
  const dry = body.mode === "dry" || !apiKey || !from

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const today = parseDay(isoDay(new Date()))!
  const horizon = new Date(today.getTime() + WINDOW_DAYS * 86_400_000)
  const cutoff = new Date(Date.now() - MIN_HOURS_BETWEEN * 3_600_000).toISOString()

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, email, display_name, settings")
  if (error) return json({ error: "Could not read profiles" }, 500)

  let sent = 0, skipped = 0, failed = 0

  for (const profile of profiles ?? []) {
    const settings = (profile.settings ?? {}) as Record<string, unknown>
    const prefs = (settings.preferences ?? {}) as Record<string, unknown>
    // Unset means on, matching DEFAULT_PREFERENCES in the web app.
    if (prefs.email_reminders === false) { skipped++; continue }
    if (typeof profile.email !== "string" || !profile.email) { skipped++; continue }

    const lastSent = (settings.digest_last_sent_at ?? null) as string | null
    if (typeof lastSent === "string" && lastSent > cutoff) { skipped++; continue }

    const deadlines = await deadlinesFor(admin, profile.id, settings, today, horizon)
    if (deadlines.length === 0) { skipped++; continue }

    if (dry) { sent++; continue }

    const name = typeof profile.display_name === "string" && profile.display_name
      ? profile.display_name.split(" ")[0]
      : "there"
    const { subject, text } = renderEmail(name, deadlines)
    const err = await sendEmail(apiKey!, from!, profile.email, subject, text)
    if (err) {
      console.error(`deadline-digest: send failed for ${profile.id}: ${err}`)
      failed++
      continue
    }

    // Stamped only after a successful send, so a provider outage retries
    // tomorrow rather than skipping the student for a day.
    //
    // Written as a whole merged object rather than through merge_settings(),
    // which merges into auth.uid() — there is no user context here. The read
    // happened at the top of this loop, so a settings change made by the
    // student in the last few milliseconds could be overwritten; the only key
    // this touches is one the app never writes.
    const { error: stampErr } = await admin
      .from("profiles")
      .update({
        settings: { ...settings, digest_last_sent_at: new Date().toISOString() },
      } as never)
      .eq("id", profile.id)
      .select("id")
      .single()
    if (stampErr) console.error(`deadline-digest: could not stamp ${profile.id}`, stampErr.message)
    sent++
  }

  return json({ sent, skipped, failed, dry })
})
