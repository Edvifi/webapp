/**
 * ResetPasswordScreen — shown when the session came from a password-reset
 * email.
 *
 * Supabase signs the student in so they can set a new password. Without this
 * screen they would land on the dashboard still not knowing their password,
 * and Settings asks for the current one, which is exactly what they forgot.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { completePasswordReset } from '../lib/auth'

const MIN_PASSWORD_LENGTH = 8

export default function ResetPasswordScreen() {
  const { endRecovery } = useAuth()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setError(null)
    setSaving(true)
    try {
      const { error: err } = await completePasswordReset(password)
      if (err) { setError(err); return }
      toast.success('Password updated. You’re all set.')
      endRecovery()
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      key="reset"
      className="auth"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="auth-grain" />
      <div className="auth-orb auth-orb--1" />
      <div className="auth-orb auth-orb--2" />
      <div className="auth-content">
        <div className="auth-logo">
          <img src="/logos/logo-color.png" alt="Edvifi" className="auth-logo-img" />
        </div>
        <div className="auth-card">
          <div className="auth-card-grain" />
          <div className="auth-card-paper auth-card-paper--back" />
          <div className="auth-card-inner">
            <h1 className="auth-heading" style={{ textAlign: 'center' }}>Choose a new password</h1>
            <p className="auth-subheading" style={{ textAlign: 'center' }}>
              You followed a reset link, so there&rsquo;s no need for your old password.
            </p>

            <form className="auth-form" onSubmit={submit}>
              <label className="auth-label">
                <span className="auth-label-text">New password</span>
                <input
                  className="auth-input"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null) }}
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  disabled={saving}
                />
              </label>

              <label className="auth-label">
                <span className="auth-label-text">Confirm new password</span>
                <input
                  className="auth-input"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(null) }}
                  placeholder="••••••••"
                  disabled={saving}
                />
              </label>

              {error && <div className="auth-error">{error}</div>}

              <button className="auth-submit" type="submit" disabled={saving || !password || !confirm}>
                {saving ? 'Saving…' : 'Set password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
