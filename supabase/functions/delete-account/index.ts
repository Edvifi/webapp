// Account deletion edge function.
//
//   POST { confirm: "DELETE" }  →  { deleted: true }
//
// Why this needs a server at all: deleting a user from `auth.users` requires
// the service role key, which must never reach a browser. Everything else
// cascades — profiles, fafsa_tracker_items, fafsa_saved_items,
// fafsa_user_module_state and essay_feedback_requests all declare
// `references auth.users(id) on delete cascade`, so removing the auth row
// removes the student's data with it. That is checked below rather than
// assumed: a table added later without a cascade would otherwise leave
// orphaned rows behind a "your account is deleted" message, which is the one
// outcome worse than not offering deletion at all.
//
// Auth: the platform `verify_jwt` check runs first, but the project's public
// anon key is itself a valid JWT, so the bearer token is resolved to a real
// user here. A caller can only ever delete themselves — there is no id in the
// request body to tamper with.
//
// Secrets: auto-provided by the platform (SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY). No configuration needed.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

/** Typed by the caller. Deletion is irreversible, so it is never one click. */
const CONFIRM_PHRASE = "DELETE"

/**
 * Tables that must disappear with the account. Verified after the delete
 * rather than trusted: this is the list a future migration is most likely to
 * forget to extend.
 */
const USER_TABLES = [
  "profiles",
  "fafsa_tracker_items",
  "fafsa_saved_items",
  "fafsa_user_module_state",
  "essay_feedback_requests",
] as const

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  })

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const url = Deno.env.get("SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !serviceKey) return json({ error: "Not configured" }, 503)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return json({ error: "Sign in first" }, 401)

  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  const user = userData?.user
  if (userErr || !user) return json({ error: "Sign in first" }, 401)

  let body: { confirm?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: "Bad request" }, 400)
  }
  if (body.confirm !== CONFIRM_PHRASE) {
    return json({ error: `Type ${CONFIRM_PHRASE} to confirm` }, 400)
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr) {
    console.error("delete-account: auth delete failed", delErr.message)
    return json({ error: "Could not delete the account" }, 500)
  }

  // The cascades should have emptied every per-user table. Check, and say so
  // loudly if one did not: telling a student their data is gone when rows
  // remain is the failure this endpoint exists to avoid.
  const leftovers: string[] = []
  for (const table of USER_TABLES) {
    const column = table === "profiles" ? "id" : "user_id"
    const { count, error } = await admin
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(column, user.id)
    if (error) {
      console.error(`delete-account: could not verify ${table}`, error.message)
      leftovers.push(table)
    } else if ((count ?? 0) > 0) {
      leftovers.push(table)
    }
  }

  if (leftovers.length > 0) {
    // The auth row is already gone, so the account cannot be recovered and the
    // student is signed out either way. Report it rather than claim success.
    console.error("delete-account: rows survived the cascade", leftovers.join(", "))
    return json({ deleted: true, incomplete: leftovers }, 200)
  }

  return json({ deleted: true }, 200)
})
