import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { DEFAULT_PREFERENCES, resolvePreferences } from './preferences'

describe('email reminder default', () => {
  it('treats an unset value as on, and an explicit false as off', () => {
    expect(DEFAULT_PREFERENCES.email_reminders).toBe(true)
    expect(resolvePreferences({}).email_reminders).toBe(true)
    expect(resolvePreferences({ preferences: {} }).email_reminders).toBe(true)
    expect(resolvePreferences({ preferences: { email_reminders: false } }).email_reminders).toBe(false)
  })

  it('agrees with the digest function, which decides who is actually mailed', () => {
    // These live in two runtimes and cannot share a constant: this file ships to
    // the browser, the digest runs on Deno. If they disagree the failure is
    // silent and one-directional — the student sees the switch on and no mail
    // ever arrives — so the coupling is asserted against the source itself.
    // cwd is web/ under vitest; import.meta.url is not a file: URL here.
    const digest = readFileSync('../supabase/functions/deadline-digest/index.ts', 'utf8')
    expect(digest).toContain('prefs.email_reminders === false')
    expect(digest).not.toContain('prefs.email_reminders !== true')
  })
})
