/**
 * Invite links — admin-only card on the Settings page.
 *
 * Create a trackable link for each place the waitlist gets shared (a school, a
 * post, a counselor), then watch how many people each one brought in and how
 * far they got: visited → joined the waitlist → invited → signed in →
 * onboarded. Renders nothing for anyone not in `app_admins`; the table and the
 * stats RPC refuse them server-side regardless.
 */

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import {
  createInviteLink, getInviteLinkStats, inviteUrl, isAppAdmin, isValidSlug, MAX_SLUG_LENGTH, rate,
  setInviteLinkArchived, slugify, type InviteLinkStats,
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

export default function InviteLinksPanel() {
  const toast = useToast()
  const [admin, setAdmin] = useState(false)
  const [rows, setRows] = useState<InviteLinkStats[]>([])
  const [loading, setLoading] = useState(true)

  const [label, setLabel] = useState('')
  const [slug, setSlug] = useState('')
  // The slug follows the name until someone types in the slug box themselves.
  const [slugEdited, setSlugEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busySlug, setBusySlug] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setRows(await getInviteLinkStats())
    setLoading(false)
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

  if (!admin) return null

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

  const total = rows.reduce((n, r) => n + r.signups, 0)
  const viaLinks = rows.reduce((n, r) => n + (r.slug != null ? r.signups : 0), 0)
  const live = rows.filter((r) => r.is_link && !r.archived_at).length

  return (
    <div className="pg-card" aria-labelledby="il-title">
      <h3 className="pg-section-title" id="il-title">Invite links</h3>
      <p className="st-row-desc il-intro">
        Share a link per school, post or partner to see who each one brings to the waitlist — and how many go on to sign in.
        Only admins see this.
      </p>

      <div className="il-summary">
        <div className="il-stat"><span className="il-stat-value">{total}</span><span className="il-stat-label">Waitlist signups</span></div>
        <div className="il-stat"><span className="il-stat-value">{pct(rate(viaLinks, total))}</span><span className="il-stat-label">Came through a link</span></div>
        <div className="il-stat"><span className="il-stat-value">{live}</span><span className="il-stat-label">Active links</span></div>
      </div>

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
              placeholder="Lincoln High — counselor email"
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
              placeholder="lincoln-high"
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

      {loading ? (
        <p className="st-row-desc">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="st-row-desc">No links or signups yet. Create a link above and share it.</p>
      ) : (
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
              {rows.map((r) => (
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
      )}
    </div>
  )
}
