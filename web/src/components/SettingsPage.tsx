/**
 * Settings page — notifications, appearance, deadlines, timeline, and account.
 *
 * Preferences persist to `profiles.settings.preferences` via merge_settings,
 * with optimistic toggles that revert (and toast) on failure. Change Password
 * calls supabase.auth.updateUser directly.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import {
  changePassword, MIN_PASSWORD_LENGTH, deleteAccount, DELETE_CONFIRM_PHRASE, signOut,
} from '../lib/auth'
import { resolvePreferences, savePreferences, URGENT_WINDOWS } from '../lib/preferences'
import { DEADLINE_MODULES, MODULE_SHORT_LABEL } from '../data/applicationDeadlines'
import { applyTheme } from '../lib/theme'
import type { ThemePref, UserPreferences } from '../types/user'

const EASE_OUT = [0.22, 1, 0.36, 1] as const




function Toggle({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`st-toggle ${on ? 'st-toggle--on' : ''}`}
      onClick={onToggle}
    >
      <div className="st-toggle-knob" />
    </button>
  )
}

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth()
  const toast = useToast()

  // Optimistic overlay so toggles respond instantly; reverted on save failure.
  const [optimistic, setOptimistic] = useState<Partial<UserPreferences>>({})
  const prefs = { ...resolvePreferences(profile?.settings), ...optimistic }

  const setPref = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setOptimistic(o => ({ ...o, [key]: value }))
    if (key === 'theme') applyTheme(value as ThemePref)
    savePreferences(profile?.settings, { [key]: value })
      .then(refreshProfile)
      .catch(() => {
        setOptimistic(o => {
          const next = { ...o }
          delete next[key]
          return next
        })
        if (key === 'theme') applyTheme(resolvePreferences(profile?.settings).theme)
        toast.error("Couldn't save that setting — please try again.")
      })
  }

  const toggleRow = (key: keyof UserPreferences, label: string, desc: string) => (
    <div className="st-row">
      <div className="st-row-text">
        <span className="st-row-label">{label}</span>
        <span className="st-row-desc">{desc}</span>
      </div>
      <Toggle on={prefs[key] === true} label={label} onToggle={() => setPref(key, !prefs[key])} />
    </div>
  )

  /** Stored empty means "all", so the chips read as all-on until one is off. */
  const stored = prefs.deadline_modules ?? []
  const enabledModules = stored.length === 0 ? [...DEADLINE_MODULES] : stored

  /**
   * Turning the last module off would empty every dated view, which is never
   * what the student meant, so the last one on cannot be switched off. Turning
   * all of them back on stores the empty list again, which is the same thing
   * and keeps a stale module name from being pinned in settings forever.
   */
  const toggleModule = (module: string) => {
    const next = enabledModules.includes(module)
      ? enabledModules.filter(m => m !== module)
      : [...enabledModules, module]
    if (next.length === 0) return
    setPref('deadline_modules', next.length === DEADLINE_MODULES.length ? [] : next)
  }

  // Delete-account state. Separate from the password form so opening one
  // never leaves the other half-filled.
  const [delOpen, setDelOpen] = useState(false)
  const [delConfirm, setDelConfirm] = useState('')
  const [delBusy, setDelBusy] = useState(false)

  const submitDelete = async () => {
    if (delBusy) return
    setDelBusy(true)
    try {
      const { error, incomplete } = await deleteAccount(delConfirm)
      if (error) { toast.error(error); return }
      if (incomplete?.length) {
        // The account is gone, but something did not cascade. Say so rather
        // than let the student believe in a clean sweep that did not happen.
        toast.error(`Account deleted, but some data may remain (${incomplete.join(', ')}). Please contact support.`)
      }
      // The auth row is gone, so the session in this tab points at nothing.
      // Clearing it drops the app back to the sign-in screen, which is the
      // only honest place to be after deleting your account.
      await signOut()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete the account.')
    } finally {
      setDelBusy(false)
    }
  }

  // Change-password form state
  const [pwOpen, setPwOpen] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pw, setPw] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  const submitPassword = async () => {
    if (pwSaving) return
    if (pw.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (pw !== pwConfirm) {
      toast.error("Passwords don't match.")
      return
    }
    setPwSaving(true)
    try {
      // Proving the current password matters more than it looks: without it a
      // walked-away session on a shared computer is enough to take the account.
      const { error } = await changePassword(pwCurrent, pw)
      if (error) { toast.error(error); return }
      toast.success('Password updated.')
      setPwOpen(false)
      setPwCurrent('')
      setPw('')
      setPwConfirm('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update password.')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <motion.div key="settings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
      <div className="dash-header">
        <h1 className="dash-title">Settings</h1>
        <p className="dash-subtitle">Manage your preferences and account.</p>
      </div>
      <div className="pg-grid">
        <div className="pg-card">
          <h3 className="pg-section-title">Notifications</h3>
          {toggleRow(
            'email_reminders',
            'Email Reminders',
            'A daily email when a scholarship or one of your own dates is within a week',
          )}
          {/* The other two had no implementation behind them either. Only the
              one that now does is offered; promising a weekly digest and
              browser push again would repeat the original mistake. */}
        </div>
        <div className="pg-card">
          <h3 className="pg-section-title">Appearance</h3>
          <div className="st-row">
            <div className="st-row-text">
              <span className="st-row-label">Theme</span>
              <span className="st-row-desc">Choose your visual preference</span>
            </div>
            <div className="st-chip-group" role="radiogroup" aria-label="Theme">
              {(['light', 'dark', 'system'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={prefs.theme === t}
                  className={`st-chip ${prefs.theme === t ? 'st-chip--active' : ''}`}
                  onClick={() => setPref('theme', t)}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="pg-card">
          <h3 className="pg-section-title">Deadlines</h3>
          <div className="st-row">
            <div className="st-row-text">
              <span className="st-row-label">Mark as urgent within</span>
              <span className="st-row-desc">
                Inside this window a date turns red. The panel always covers the next seven days.
              </span>
            </div>
            <div className="st-chip-group" role="radiogroup" aria-label="Mark as urgent within">
              {URGENT_WINDOWS.map(d => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={prefs.deadline_urgent_window === d}
                  className={`st-chip ${prefs.deadline_urgent_window === d ? 'st-chip--active' : ''}`}
                  onClick={() => setPref('deadline_urgent_window', d)}
                >
                  {d === 1 ? '1 day' : d === 7 ? 'A week' : `${d} days`}
                </button>
              ))}
            </div>
          </div>
          {toggleRow(
            'deadline_show_estimated',
            'Estimated Dates',
            'Show dates worked out from recurring text, marked est.',
          )}
          <div className="st-row">
            <div className="st-row-text">
              <span className="st-row-label">Modules</span>
              <span className="st-row-desc">
                Turn a module off and its dates leave the panel, the week and the calendar.
              </span>
            </div>
            <div className="st-chip-group">
              {DEADLINE_MODULES.map(m => {
                const on = enabledModules.includes(m)
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={on}
                    className={`st-chip ${on ? 'st-chip--active' : ''}`}
                    onClick={() => toggleModule(m)}
                  >
                    {MODULE_SHORT_LABEL[m]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="pg-card">
          <h3 className="pg-section-title">Timeline</h3>
          {toggleRow('timeline_show_completed', 'Show Completed Tasks', 'Display past milestones on the timeline')}
          {toggleRow('timeline_auto_advance', 'Auto-advance Progress', 'Update timeline position based on current date')}
        </div>
        <div className="pg-card">
          <h3 className="pg-section-title">Account</h3>
          <div className="st-row" style={pwOpen ? { borderBottom: 'none', paddingBottom: 4 } : undefined}>
            <div className="st-row-text">
              <span className="st-row-label">Change Password</span>
              <span className="st-row-desc">Update your account password</span>
            </div>
            <button
              className="st-btn"
              onClick={() => setPwOpen(o => {
                // Closing must not leave the typed current password in state,
                // ready to refill the form for whoever opens it next.
                if (o) { setPwCurrent(''); setPw(''); setPwConfirm('') }
                return !o
              })}
            >
              {pwOpen ? 'Cancel' : 'Change'}
            </button>
          </div>
          {pwOpen && (
            <div className="st-pw-form">
              <input
                className="pg-input pg-input--edit"
                type="password"
                autoComplete="current-password"
                placeholder="Current password"
                value={pwCurrent}
                onChange={e => setPwCurrent(e.target.value)}
                disabled={pwSaving}
              />
              <input
                className="pg-input pg-input--edit"
                type="password"
                autoComplete="new-password"
                placeholder={`New password (min ${MIN_PASSWORD_LENGTH} characters)`}
                value={pw}
                onChange={e => setPw(e.target.value)}
                disabled={pwSaving}
              />
              <input
                className="pg-input pg-input--edit"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={pwConfirm}
                onChange={e => setPwConfirm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void submitPassword() }}
                disabled={pwSaving}
              />
              <button
                className="st-btn st-btn--primary"
                onClick={() => void submitPassword()}
                disabled={pwSaving || !pwCurrent || !pw || !pwConfirm}
              >
                {pwSaving ? 'Saving…' : 'Save Password'}
              </button>
            </div>
          )}
          <div className="st-row st-row--danger">
            <div className="st-row-text">
              <span className="st-row-label">Delete Account</span>
              <span className="st-row-desc">
                Erases your profile, college list, scholarships, essays and saved dates. This cannot be undone.
              </span>
            </div>
            <button
              className="st-btn st-btn--danger"
              onClick={() => setDelOpen(o => { if (o) setDelConfirm(''); return !o })}
            >
              {delOpen ? 'Cancel' : 'Delete'}
            </button>
          </div>
          {delOpen && (
            <div className="st-pw-form">
              <label className="st-danger-label" htmlFor="st-del-confirm">
                Type {DELETE_CONFIRM_PHRASE} to confirm
              </label>
              <input
                id="st-del-confirm"
                className="pg-input pg-input--edit"
                value={delConfirm}
                onChange={e => setDelConfirm(e.target.value)}
                placeholder={DELETE_CONFIRM_PHRASE}
                autoComplete="off"
                disabled={delBusy}
              />
              <button
                className="st-btn st-btn--danger"
                onClick={submitDelete}
                disabled={delBusy || delConfirm !== DELETE_CONFIRM_PHRASE}
              >
                {delBusy ? 'Deleting…' : 'Delete my account for good'}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
