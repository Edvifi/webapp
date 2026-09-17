/**
 * AuthScreen — Login / Register
 *
 * Warm skeuomorphic card on parchment background.
 * Toggles between sign-in and create-account modes.
 * Email+password plus Google & Apple SSO.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  signUpWithEmail,
  signInWithEmail,
  sendPasswordReset,
  MIN_PASSWORD_LENGTH,
  signInWithGoogle,
  signInWithApple,
} from '../lib/auth'
import Captcha from './Captcha'

const EASE_OUT = [0.22, 1, 0.36, 1] as const

/** Map raw Supabase errors to user-friendly messages */
function friendlyError(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('invalid login credentials')) return 'Incorrect email or password.'
  if (lower.includes('email not confirmed')) return 'Please check your email to confirm your account.'
  if (lower.includes('user already registered')) return 'An account with this email already exists.'
  if (lower.includes('email rate limit')) return 'Too many attempts. Please try again later.'
  if (lower.includes('password should be')) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  if (lower.includes('invalid email') || lower.includes('unable to validate')) return 'Please enter a valid email address.'
  return msg
}

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  // Turnstile tokens are single-use, so a failed attempt must remount the
  // widget to get a fresh one rather than retry a spent token.
  const [captchaNonce, setCaptchaNonce] = useState(0)
  const resetCaptcha = () => { setCaptchaToken(''); setCaptchaNonce(n => n + 1) }
  const [resetSent, setResetSent] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Without this a student who forgets their password is locked out of their
  // own essays for good: nothing else in the app can get them back in.
  const handleForgotPassword = async () => {
    if (resetting) return
    clearError()
    if (!email.trim()) {
      setError('Enter your email first, then choose Forgot password.')
      return
    }
    setResetting(true)
    try {
      const { error: err } = await sendPasswordReset(email, captchaToken || undefined)
      if (err) { setError(err); resetCaptcha(); return }
      setResetSent(true)
    } finally {
      setResetting(false)
    }
  }

  const clearError = () => setError(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!email.trim() || !password) {
      setError('Please fill in all fields.')
      return
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (mode === 'register' && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'register') {
        const { error: err } = await signUpWithEmail(email, password, captchaToken || undefined)
        if (err) throw err
        setCheckEmail(true)
      } else {
        const { error: err } = await signInWithEmail(email, password, captchaToken || undefined)
        if (err) throw err
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Something went wrong.'
      setError(friendlyError(raw))
      // The token was spent on the attempt that just failed; retrying with it
      // would be rejected for reuse rather than for the real reason.
      resetCaptcha()
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    clearError()
    const { error: err } = await signInWithGoogle()
    if (err) setError(friendlyError(err.message))
  }

  const handleApple = async () => {
    clearError()
    const { error: err } = await signInWithApple()
    if (err) setError(friendlyError(err.message))
  }

  const toggleMode = () => {
    setMode(m => (m === 'login' ? 'register' : 'login'))
    setCheckEmail(false)
    setResetSent(false)
    clearError()
  }

  // Post-registration confirmation message
  if (checkEmail) {
    return (
      <motion.div
        className="auth"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-grain" />
        <div className="auth-orb auth-orb--1" />
        <div className="auth-orb auth-orb--2" />

        <div className="auth-content">
          <motion.div
            className="auth-logo"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          >
            <img src="/logos/logo-color.png" alt="Edvifi" className="auth-logo-img" />
          </motion.div>

          <motion.div
            className="auth-card"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.55, ease: EASE_OUT }}
          >
            <div className="auth-card-grain" />
            <div className="auth-card-paper auth-card-paper--back" />
            <div className="auth-card-inner" style={{ textAlign: 'center', padding: '40px 28px' }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{ fontSize: '48px', marginBottom: '16px' }}
              >
                ✉️
              </motion.div>
              <h1 className="auth-heading" style={{ textAlign: 'center' }}>Check your email</h1>
              <p className="auth-subheading" style={{ textAlign: 'center' }}>
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
              </p>
              <button className="auth-toggle-btn" onClick={toggleMode} style={{ marginTop: '8px' }}>
                Back to sign in
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="auth"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5 }}
    >
      <div className="auth-grain" />
      <div className="auth-orb auth-orb--1" />
      <div className="auth-orb auth-orb--2" />
      <div className="auth-orb auth-orb--3" />

      <div className="auth-content">
        {/* Logo */}
        <motion.div
          className="auth-logo"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        >
          <img src="/logos/logo-color.png" alt="Edvifi" className="auth-logo-img" />
        </motion.div>

        {/* Card */}
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.55, ease: EASE_OUT }}
        >
          <div className="auth-card-grain" />
          <div className="auth-card-paper auth-card-paper--back" />

          <div className="auth-card-inner">
            {/* Heading */}
            <motion.h1
              className="auth-heading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.5, ease: EASE_OUT }}
            >
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </motion.h1>
            <motion.p
              className="auth-subheading"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24, duration: 0.45, ease: EASE_OUT }}
            >
              {mode === 'login'
                ? 'Sign in to continue your journey.'
                : 'Start mapping your path to college.'}
            </motion.p>

            {/* SSO Buttons */}
            <motion.div
              className="auth-sso-row"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.45, ease: EASE_OUT }}
            >
              <button
                className="auth-sso-btn auth-sso-btn--google"
                onClick={handleGoogle}
                disabled={submitting}
                type="button"
              >
                <svg className="auth-sso-icon" viewBox="0 0 24 24" width="18" height="18">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Google</span>
              </button>

              <button
                className="auth-sso-btn auth-sso-btn--apple"
                onClick={handleApple}
                disabled={submitting}
                type="button"
              >
                <svg className="auth-sso-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                <span>Apple</span>
              </button>
            </motion.div>

            {/* Divider */}
            <motion.div
              className="auth-divider"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.36, duration: 0.4 }}
            >
              <span className="auth-divider-line" />
              <span className="auth-divider-text">or</span>
              <span className="auth-divider-line" />
            </motion.div>

            {/* Form */}
            <motion.form
              className="auth-form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.45, ease: EASE_OUT }}
            >
              <label className="auth-label">
                <span className="auth-label-text">Email</span>
                <input
                  className="auth-input"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setResetSent(false); clearError() }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={submitting}
                />
              </label>

              <label className="auth-label">
                <span className="auth-label-text">Password</span>
                <input
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearError() }}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  disabled={submitting}
                />
              </label>

              <AnimatePresence>
                {mode === 'register' && (
                  <motion.label
                    className="auth-label"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: EASE_OUT }}
                  >
                    <span className="auth-label-text">Confirm password</span>
                    <input
                      className="auth-input"
                      type="password"
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); clearError() }}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      disabled={submitting}
                    />
                  </motion.label>
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="auth-error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <Captcha key={captchaNonce} onToken={setCaptchaToken} />

              <button
                className="auth-submit"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? 'Hold on...'
                  : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>

              {mode === 'login' && (
                resetSent ? (
                  <p className="auth-reset-note">
                    If that email has an account, a reset link is on its way. Check your inbox.
                  </p>
                ) : (
                  <button
                    type="button"
                    className="auth-reset-link"
                    onClick={() => void handleForgotPassword()}
                    disabled={resetting || submitting}
                  >
                    {resetting ? 'Sending…' : 'Forgot password?'}
                  </button>
                )
              )}
            </motion.form>

            {/* Toggle */}
            <motion.p
              className="auth-toggle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              {' '}
              <button className="auth-toggle-btn" onClick={toggleMode} type="button">
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </motion.p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
