/**
 * Invite links — the admin-only page behind the sidebar's Invite links item.
 *
 * Create a trackable link for each place the waitlist gets shared (a subreddit,
 * a Nextdoor group, a counselor), then watch how many people each one brought
 * in and how far they got: visited → joined the waitlist → invited → signed in
 * → onboarded. Totals lead, then the same numbers per platform, then every link
 * with its own row. Anyone not in `app_admins` gets a line saying so; the table
 * and the stats RPC refuse them server-side regardless.
 */

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useToast } from '../contexts/ToastContext'
import { EASE_OUT } from '../lib/designTokens'
import {
  byPlatform, createInviteLink, getInviteLinkStats, inviteUrl, isAppAdmin, isValidSlug, MAX_SLUG_LENGTH,
  platformOf, rate, setInviteLinkArchived, slugify, totals, type InviteLinkStats,
} from '../lib/inviteLinks'

const pct = (n: number | null) => (n == null ? '—' : `${n}%`)

const fmtDate = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function rowName(r: InviteLinkStats): string {
  if (r.slug == null) return 'No link'
  return r.label ?? r.slug
}

function rowNote(r: InviteLinkStats): string {
  if (r.slug == null) return 'Signed up without a ref in the URL'
  if (!r.is_link) return `?ref=${r.slug} — not a link you created`
  return `?ref=${r.slug}`
}

function Stat({ value, label, sub }: { value: number | string; label: string; sub?: string }) {
  return (
    <div className="il-stat">
      <span className="il-stat-value">{value}</span>
      <span className="il-stat-label">{label}</span>
      {sub && <span className="il-stat-sub">{sub}</span>}
    </div>
  )
}

export default function InviteLinksPage() {
  const toast = useToast()
  const [admin, setAdmin] = useState(false)
  const [rows, setRows] = useState<InviteLinkStats[]>([])
  const [loading, setLoading] = useState(true)
  // null shows every link; otherwise only that platform's.
  const [platform, setPlatform] = useState<string | null>(null)

  const [label, setLabel] = useState('')
  const [slug, setSlug] = useState('')
  // The slug follows the name until someone types in the slug box themselves.
  const [slugEdited, setSlugEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busySlug, setBusySlug] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setRows(await getInviteLinkStats())
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const ok = await isAppAdmin()
      if (cancelled) return
      setAdmin(ok)
      if (ok) {
        const r = await getInviteLinkStats()
        if (cancelled) return
        setRows(r)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const effectiveSlug = slugEdited ? slug : slugify(label)
  const slugOk = isValidSlug(effectiveSlug)

  const submit = async () => {
    if (saving) return
    setSaving(true)
    const { error } = await createInviteLink(effectiveSlug, label)
    setSaving(false)
    if (error) { toast.error(error); return }
    toast.success('Link created.')
    setLabel(''); setSlug(''); setSlugEdited(false)
    await reload()
  }

  const copy = async (s: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(s))
      toast.success('Link copied.')
    } catch {
      toast.error('Couldn’t copy — select the link and copy it by hand.')
    }
  }

  const toggleArchived = async (r: InviteLinkStats) => {
    if (!r.slug) return
    setBusySlug(r.slug)
    const { error } = await setInviteLinkArchived(r.slug, !r.archived_at)
    setBusySlug(null)
    if (error) { toast.error(error); return }
    await reload()
  }

  /** A stray ref someone is already using: offer to make it a real link. */
  const adopt = (s: string) => {
    setSlug(s); setSlugEdited(true)
    setLabel((l) => l || s)
  }

  const all = totals(rows)
  const viaLinks = rows.reduce((n, r) => n + (r.slug != null ? r.signups : 0), 0)
  const live = rows.filter((r) => r.is_link && !r.archived_at).length
  const platforms = byPlatform(rows)
  const shown = platform == null ? rows : rows.filter((r) => platformOf(r) === platform)

  let body
  if (loading) {
    body = <p className="st-row-desc">Loading…</p>
  } else if (!admin) {
    body = <p className="st-row-desc">This page is for Edvifi admins.</p>
  } else {
    body = (
      <div className="pg-grid il-page">
        <section className="pg-card" aria-labelledby="il-funnel-title">
          <h3 className="pg-section-title" id="il-funnel-title">Funnel</h3>
          <div className="il-summary">
            {/* Conversion over link signups only: visits are counted on links,
                so signups that came with no ref have no visit to divide by. */}
            <Stat value={all.visits} label="Visits" sub={`${live} active links · ${pct(rate(viaLinks, all.visits))} signed up`} />
            <Stat value={all.signups} label="Waitlist signups" sub={`${pct(rate(viaLinks, all.signups))} through a link`} />
            {/* Each step as a share of signups rather than of the step before:
                someone who had an account before the waitlist counts as joined
                without an invite, which would push "of invited" past 100%. */}
            <Stat value={all.invited} label="Invited" sub={`${pct(rate(all.invited, all.signups))} of signups`} />
            <Stat value={all.joined} label="Joined" sub={`${pct(rate(all.joined, all.signups))} of signups`} />
            <Stat value={all.onboarded} label="Onboarded" sub={`${pct(rate(all.onboarded, all.signups))} of signups`} />
          </div>
        </section>

        {rows.length > 0 && (
          <section className="pg-card" aria-labelledby="il-platforms-title">
            <h3 className="pg-section-title" id="il-platforms-title">By platform</h3>
            <div className="il-table-wrap">
              <table className="il-table">
                <thead>
                  <tr>
                    <th scope="col">Platform</th>
                    <th scope="col">Links</th>
                    <th scope="col" title="Browsers that opened one of its links">Visits</th>
                    <th scope="col" title="Joined the waitlist">Signups</th>
                    <th scope="col" title="Signups ÷ visits">Conv.</th>
                    <th scope="col">Invited</th>
                    <th scope="col" title="Signed in to an account">Joined</th>
                    <th scope="col">Onboarded</th>
                  </tr>
                </thead>
                <tbody>
                  {platforms.map((p) => (
                    <tr key={p.platform}>
                      <th scope="row"><span className="il-name">{p.platform}</span></th>
                      <td>{p.links || '—'}</td>
                      <td>{p.links ? p.visits : '—'}</td>
                      <td>{p.signups}</td>
                      <td>{p.links ? pct(rate(p.signups, p.visits)) : '—'}</td>
                      <td>{p.invited}</td>
                      <td>{p.joined}</td>
                      <td>{p.onboarded}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="pg-card" aria-labelledby="il-links-title">
          <h3 className="pg-section-title" id="il-links-title">Links</h3>
          <p className="st-row-desc il-intro">
            Share a link per subreddit, group, school or partner. Start its name with the platform and a colon,
            like “Reddit: r/FAFSA”, and it is counted under that platform above.
          </p>

          <form
            className="il-form"
            onSubmit={(e) => { e.preventDefault(); void submit() }}
          >
            <div className="il-form-fields">
              <label className="il-field">
                <span className="pg-label">Name</span>
                <input
                  className="pg-input pg-input--edit"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Reddit: r/FAFSA"
                  maxLength={120}
                  disabled={saving}
                />
              </label>
              <label className="il-field">
                <span className="pg-label">Slug</span>
                <input
                  className="pg-input pg-input--edit"
                  value={effectiveSlug}
                  onChange={(e) => { setSlugEdited(true); setSlug(e.target.value.toLowerCase()) }}
                  placeholder="reddit-fafsa"
                  maxLength={MAX_SLUG_LENGTH}
                  spellCheck={false}
                  autoCapitalize="off"
                  disabled={saving}
                  aria-invalid={effectiveSlug !== '' && !slugOk}
                />
              </label>
            </div>
            <div className="il-form-foot">
              <code className="il-preview" title="The link you will share">
                {effectiveSlug ? inviteUrl(effectiveSlug) : inviteUrl('your-slug')}
              </code>
              <button className="st-btn st-btn--primary" type="submit" disabled={saving || !label.trim() || !slugOk}>
                {saving ? 'Creating…' : 'Create link'}
              </button>
            </div>
            {effectiveSlug !== '' && !slugOk && (
              <p className="pg-field-error">Lowercase letters, numbers and dashes only, starting with a letter or number.</p>
            )}
          </form>

          {rows.length === 0 ? (
            <p className="st-row-desc">No links or signups yet. Create a link above and share it.</p>
          ) : (
            <>
              <div className="st-chip-group il-filter" role="radiogroup" aria-label="Show links from">
                {[null, ...platforms.map((p) => p.platform)].map((p) => (
                  <button
                    key={p ?? 'all'}
                    type="button"
                    role="radio"
                    aria-checked={platform === p}
                    className={`st-chip ${platform === p ? 'st-chip--active' : ''}`}
                    onClick={() => setPlatform(p)}
                  >
                    {p ?? 'All'}
                  </button>
                ))}
              </div>
              <div className="il-table-wrap">
                <table className="il-table">
                  <thead>
                    <tr>
                      <th scope="col">Link</th>
                      <th scope="col" title="Browsers that opened the link">Visits</th>
                      <th scope="col" title="Joined the waitlist">Signups</th>
                      <th scope="col" title="Signups ÷ visits">Conv.</th>
                      <th scope="col">Invited</th>
                      <th scope="col" title="Accepted the invite and signed in">Joined</th>
                      <th scope="col">Onboarded</th>
                      <th scope="col"><span className="il-sr">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.slug ?? '∅'} className={r.archived_at ? 'il-row--archived' : undefined}>
                        <th scope="row">
                          <span className="il-name">
                            {rowName(r)}
                            {r.archived_at && <span className="il-badge">Archived</span>}
                            {r.slug != null && !r.is_link && <span className="il-badge il-badge--warn">Unknown</span>}
                          </span>
                          <span className="il-note">{rowNote(r)}</span>
                          {r.last_signup_at && <span className="il-note">Last signup {fmtDate(r.last_signup_at)}</span>}
                        </th>
                        <td>{r.is_link ? r.visits : '—'}</td>
                        <td>{r.signups}</td>
                        <td>{r.is_link ? pct(rate(r.signups, r.visits)) : '—'}</td>
                        <td>{r.invited}</td>
                        <td>{r.joined}{r.invited > 0 && <span className="il-sub"> {pct(rate(r.joined, r.invited))}</span>}</td>
                        <td>{r.onboarded}</td>
                        <td>
                          <div className="il-actions">
                          {r.is_link && r.slug && (
                            <>
                              {!r.archived_at && (
                                <button type="button" className="st-btn" onClick={() => void copy(r.slug!)} aria-label={`Copy link for ${rowName(r)}`}>
                                  Copy
                                </button>
                              )}
                              <button
                                type="button"
                                className="st-btn"
                                onClick={() => void toggleArchived(r)}
                                disabled={busySlug === r.slug}
                                aria-label={`${r.archived_at ? 'Restore' : 'Archive'} ${rowName(r)}`}
                              >
                                {r.archived_at ? 'Restore' : 'Archive'}
                              </button>
                            </>
                          )}
                          {!r.is_link && r.slug && (
                            <button type="button" className="st-btn" onClick={() => adopt(r.slug!)} aria-label={`Create a link for ${r.slug}`}>
                              Create
                            </button>
                          )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    )
  }

  return (
    <motion.div key="invite-links" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
      <div className="dash-header">
        <h1 className="dash-title">Invite links</h1>
        <p className="dash-subtitle">Where waitlist signups come from, and how far each one gets. Only admins see this page.</p>
      </div>
      {body}
    </motion.div>
  )
}
