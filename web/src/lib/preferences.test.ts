import { describe, it, expect } from 'vitest'
import { resolveDeadlinePreferences, resolvePreferences, DEFAULT_PREFERENCES, URGENT_WINDOWS } from './preferences'
import type { UserSettings } from '../types/user'

const settings = (preferences: Record<string, unknown>) =>
  ({ preferences } as unknown as UserSettings)

describe('resolveDeadlinePreferences', () => {
  it('falls back to the defaults when nothing is stored', () => {
    const p = resolveDeadlinePreferences(null)
    expect(p).toEqual({ urgentWindow: 3, showEstimated: true, modules: [] })
  })

  it('uses a stored window that the settings page offers', () => {
    for (const w of URGENT_WINDOWS) {
      expect(resolveDeadlinePreferences(settings({ deadline_urgent_window: w })).urgentWindow).toBe(w)
    }
  })

  it.each([[0], [-1], [400], [2.5], ['a week'], [null]])(
    'ignores a stored window of %p', (stored) => {
      // Settings are user-writable JSON. A 0 would mark nothing urgent and a
      // 400 would mark everything, so an unoffered value falls back.
      expect(resolveDeadlinePreferences(
        settings({ deadline_urgent_window: stored }),
      ).urgentWindow).toBe(3)
    },
  )

  it('treats estimated dates as shown unless explicitly turned off', () => {
    expect(resolveDeadlinePreferences(settings({})).showEstimated).toBe(true)
    expect(resolveDeadlinePreferences(
      settings({ deadline_show_estimated: false }),
    ).showEstimated).toBe(false)
  })

  it('keeps only string module names', () => {
    expect(resolveDeadlinePreferences(
      settings({ deadline_modules: ['Financial Aid', 7, null, 'Application Tracking'] }),
    ).modules).toEqual(['Financial Aid', 'Application Tracking'])
  })

  it('shows a module added since the list was saved (Custom), since it was never a choice', () => {
    // Saved before Custom existed, with Financial Aid turned off.
    expect(resolveDeadlinePreferences(settings({ deadline_modules: ['Application Tracking'] })).modules)
      .toEqual(['Application Tracking', 'Custom'])
  })

  it('keeps Custom off for a list that could only have been saved with Custom on offer', () => {
    // Both legacy modules on was stored as [] before Custom, so this list turned Custom off.
    expect(resolveDeadlinePreferences(settings({ deadline_modules: ['Application Tracking', 'Financial Aid'] })).modules)
      .toEqual(['Application Tracking', 'Financial Aid'])
  })

  it('keeps Custom off when it was switched off deliberately', () => {
    expect(resolveDeadlinePreferences(settings({
      deadline_modules: ['Application Tracking'],
      deadline_modules_known: ['Application Tracking', 'Financial Aid', 'Custom'],
    })).modules).toEqual(['Application Tracking'])
  })

  it('reads a non-array module list as none stored', () => {
    expect(resolveDeadlinePreferences(settings({ deadline_modules: 'all' })).modules).toEqual([])
  })
})

describe('email reminders are opt-in', () => {
  it('is off for a student who has never opened Settings', () => {
    // The digest function is a deliberate no-op without a mail provider, so
    // defaulting this on told every new student they would be emailed before
    // a deadline and then sent nothing. It also has to stay in step with
    // deadline-digest, which mails only an explicit `true`: were they to
    // disagree, adding a provider key would mail everyone who never chose it.
    expect(DEFAULT_PREFERENCES.email_reminders).toBe(false)
  })

  it('keeps a student\'s own choice', () => {
    expect(resolvePreferences(settings({ email_reminders: true })).email_reminders).toBe(true)
    expect(resolvePreferences(settings({ email_reminders: false })).email_reminders).toBe(false)
  })
})
