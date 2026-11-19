/**
 * Custom invite links: trackable URLs for the edvifi.ai waitlist.
 *
 * A link is just a slug. Shared as `https://edvifi.ai/?ref=<slug>#waitlist`,
 * the waitlist form records the slug against the signup, and
 * `get_invite_link_stats` follows each signup through invite, first sign-in and
 * onboarding. Everything here is admin-only: RLS hides the table from anyone
 * not in `app_admins`, and the stats RPC returns nothing for them.
 *
 * See supabase/migrations/20261119000000_invite_links.sql and docs/waitlist.md.
 */
import { supabase } from './supabase'

/**
 * The page the waitlist form lives on: edvifi.ai is one static page
 * (Edvifi/landing), and any other path is a 404 that would lose the ref.
 * `#waitlist` is the form's section, so a link lands on the form rather than
 * the top of the page.
 */
export const INVITE_LINK_BASE = 'https://edvifi.ai/'

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

/** The platform row for signups that arrived without any ref. */
export const NO_LINK = 'No link'

/**
 * The platform a link belongs to: whatever comes before the colon in its name,
 * so "Reddit: r/FAFSA" is Reddit. The links made from the GTM tracker are named
 * that way, and naming a new link the same way puts it in the same group. A name
 * with no colon, or a stray ref with no name at all, falls under Other.
 */
export function platformOf(r: Pick<InviteLinkStats, 'slug' | 'label'>): string {
  if (r.slug == null) return NO_LINK
  return r.label?.match(/^([^:]{1,40}):\s/)?.[1].trim() || 'Other'
}

export interface LinkTotals {
  /** Rows created as links; stray refs and the no-link row are not links. */
  links: number
  visits: number
  signups: number
  invited: number
  joined: number
  onboarded: number
}

export function totals(rows: InviteLinkStats[]): LinkTotals {
  const t: LinkTotals = { links: 0, visits: 0, signups: 0, invited: 0, joined: 0, onboarded: 0 }
  for (const r of rows) {
    if (r.is_link) t.links++
    t.visits += r.visits
    t.signups += r.signups
    t.invited += r.invited
    t.joined += r.joined
    t.onboarded += r.onboarded
  }
  return t
}

/**
 * One row per platform, most signups first. "No link" goes last whatever its
 * count: it is where signups land when nobody shared a link, not a platform
 * anyone chose, and leading with it would bury the comparison the table is for.
 */
export function byPlatform(rows: InviteLinkStats[]): Array<LinkTotals & { platform: string }> {
  const groups = new Map<string, InviteLinkStats[]>()
  for (const r of rows) {
    const p = platformOf(r)
    groups.set(p, [...(groups.get(p) ?? []), r])
  }
  return [...groups]
    .map(([platform, rs]) => ({ platform, ...totals(rs) }))
    .sort((a, b) =>
      Number(a.platform === NO_LINK) - Number(b.platform === NO_LINK)
      || b.signups - a.signups
      || b.links - a.links
      || a.platform.localeCompare(b.platform))
}

/** Is the signed-in user an admin? False on any error, so admin pages stay hidden. */
export async function isAppAdmin(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_app_admin')
    return !error && data === true
  } catch {
    // The sidebar asks on every load, so a failed call must read as "not an
    // admin" rather than surface as an error a student would see.
    return false
  }
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
