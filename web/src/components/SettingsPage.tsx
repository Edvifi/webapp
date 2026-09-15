/**
 * Settings page — notifications, appearance, timeline, and account.
 *
 * Preferences persist to `profiles.settings.preferences` via merge_settings,
 * with optimistic toggles that revert (and toast) on failure. Change Password
 * calls supabase.auth.updateUser directly.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { changePassword } from '../lib/auth'
import { resolvePreferences, savePreferences } from '../lib/preferences'
import { applyTheme } from '../lib/theme'
import type { ThemePref, UserPreferences } from '../types/user'

const EASE_OUT = [0.22, 1, 0.36, 1] as const

const MIN_PASSWORD_LENGTH = 8

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
          {toggleRow('email_reminders', 'Email Reminders', 'Get notified about upcoming deadlines')}
          {toggleRow('weekly_summary', 'Weekly Summary', 'Receive a weekly progress digest')}
          {toggleRow('push_notifications', 'Push Notifications', 'Browser push for urgent tasks')}
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
        </div>
      </div>
    </motion.div>
  )
}
