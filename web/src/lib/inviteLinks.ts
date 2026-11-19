/**
 * Custom invite links: trackable URLs for the edvifi.ai waitlist.
 *
 * A link is just a slug. Shared as `https://edvifi.ai/home?ref=<slug>#waitlist`,
 * the waitlist form records the slug against the signup, and
 * `get_invite_link_stats` follows each signup through invite, first sign-in and
 * onboarding. Everything here is admin-only: RLS hides the table from anyone
 * not in `app_admins`, and the stats RPC returns nothing for them.
 *
 * See supabase/migrations/20261119000000_invite_links.sql and docs/waitlist.md.
 */
import { supabase } from './supabase'

/**
 * The page the waitlist form lives on. `#waitlist` is the section anchor
 * docs/waitlist.md asks for, so a link lands on the form rather than the top of
 * the page.
 */
export const INVITE_LINK_BASE = 'https://edvifi.ai/home'

/** Must match `invite_links_slug_shape` and `waitlist_ref_shape` in SQL. */
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,47}$/
export const MAX_SLUG_LENGTH = 48

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug)
}

/** "TikTok — Fall Push!" → "tiktok-fall-push". Empty when nothing usable is left. */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, '')
}

export function inviteUrl(slug: string): string {
  return `${INVITE_LINK_BASE}?ref=${encodeURIComponent(slug)}#waitlist`
}

/** Share of `part` in `whole`, as a whole-number percent; null when there's no base to divide by. */
export function rate(part: number, whole: number): number | null {
  if (!whole) return null
  return Math.round((part / whole) * 100)
}

export interface InviteLinkStats {
  /** null for the "no link" row: signups that arrived without any ref. */
  slug: string | null
  label: string | null
  /** False for a ref that appears on signups but was never created as a link. */
  is_link: boolean
  created_at: string | null
  archived_at: string | null
  visits: number
  signups: number
  invited: number
  joined: number
  onboarded: number
  last_signup_at: string | null
}

/** Is the signed-in user an admin? False on any error, so the panel stays hidden. */
export async function isAppAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_app_admin')
  return !error && data === true
}

/** Per-link funnel. [] for non-admins and on error. Counts arrive as bigint, so coerce. */
export async function getInviteLinkStats(): Promise<InviteLinkStats[]> {
  const { data, error } = await supabase.rpc('get_invite_link_stats')
  if (error || !data) return []
  return data.map((r) => ({
    ...r,
    visits: Number(r.visits),
    signups: Number(r.signups),
    invited: Number(r.invited),
    joined: Number(r.joined),
    onboarded: Number(r.onboarded),
  }))
}

export async function createInviteLink(slug: string, label: string): Promise<{ error: string | null }> {
  const clean = slug.trim().toLowerCase()
  if (!isValidSlug(clean)) {
    return { error: 'Use lowercase letters, numbers and dashes (up to 48), starting with a letter or number.' }
  }
  if (!label.trim()) return { error: 'Give the link a name.' }
  const { error } = await supabase.from('invite_links').insert({ slug: clean, label: label.trim() })
  if (!error) return { error: null }
  // 23505: the slug is the primary key. Say which thing collided.
  if (error.code === '23505') return { error: `There is already a link called “${clean}”.` }
  return { error: error.message }
}

/** Archive (or restore, with `archived = false`). Archived links keep their signups but stop counting visits. */
export async function setInviteLinkArchived(slug: string, archived: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('invite_links')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('slug', slug)
  return { error: error ? error.message : null }
}
