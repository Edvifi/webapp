/**
 * The Deadlines card. The other cards are covered by their own preference
 * plumbing; what is worth asserting here is that these three settings reach
 * storage in the shape the views read back, and that the module chips cannot
 * be used to hide every deadline at once.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const H = vi.hoisted(() => ({
  savePreferences: vi.fn(),
  profile: { settings: {} as Record<string, unknown> },
  refreshProfile: vi.fn(),
  error: vi.fn(),
}))
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ profile: H.profile, refreshProfile: H.refreshProfile }),
}))
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ error: H.error, success: vi.fn() }),
}))
vi.mock('../lib/theme', () => ({ applyTheme: vi.fn() }))
vi.mock('../lib/auth', () => ({ changePassword: vi.fn(), MIN_PASSWORD_LENGTH: 8 }))

import * as preferences from '../lib/preferences'
import SettingsPage from './SettingsPage'

/** The card, so a chip labelled like one elsewhere can't be picked up. */
const card = () =>
  screen.getByRole('heading', { name: 'Deadlines' }).closest('.pg-card') as HTMLElement

const lastPatch = () => H.savePreferences.mock.calls.at(-1)![1]

describe('SettingsPage — Deadlines', () => {
  beforeEach(() => {
    H.savePreferences.mockReset().mockResolvedValue(undefined)
    H.refreshProfile.mockReset().mockResolvedValue(undefined)
    H.profile.settings = {}
    vi.spyOn(preferences, 'savePreferences').mockImplementation(H.savePreferences)
  })

  it('stores the urgency window the student picks', async () => {
    render(<SettingsPage />)
    await userEvent.click(within(card()).getByRole('radio', { name: 'A week' }))
    expect(lastPatch()).toEqual({ deadline_urgent_window: 7 })
  })

  it('shows the stored window as the selected one', () => {
    H.profile.settings = { preferences: { deadline_urgent_window: 5 } }
    render(<SettingsPage />)
    expect(within(card()).getByRole('radio', { name: '5 days' })).toBeChecked()
  })

  it('turns estimated dates off', async () => {
    render(<SettingsPage />)
    await userEvent.click(within(card()).getByRole('switch', { name: 'Estimated Dates' }))
    expect(lastPatch()).toEqual({ deadline_show_estimated: false })
  })

  it('starts with every module on', () => {
    render(<SettingsPage />)
    for (const name of ['Applications', 'Financial Aid']) {
      expect(within(card()).getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true')
    }
  })

  it('stores the remaining module when one is turned off', async () => {
    render(<SettingsPage />)
    await userEvent.click(within(card()).getByRole('button', { name: 'Financial Aid' }))
    expect(lastPatch()).toEqual({ deadline_modules: ['Application Tracking'] })
  })

  it('refuses to turn off the last module left on', async () => {
    // Every dated view would empty, which is never what the student meant.
    H.profile.settings = { preferences: { deadline_modules: ['Financial Aid'] } }
    render(<SettingsPage />)
    await userEvent.click(within(card()).getByRole('button', { name: 'Financial Aid' }))
    expect(H.savePreferences).not.toHaveBeenCalled()
  })

  it('stores an empty list once every module is back on', async () => {
    // Empty already means "all", and it keeps a renamed module from being
    // pinned in settings forever.
    H.profile.settings = { preferences: { deadline_modules: ['Financial Aid'] } }
    render(<SettingsPage />)
    await userEvent.click(within(card()).getByRole('button', { name: 'Applications' }))
    expect(lastPatch()).toEqual({ deadline_modules: [] })
  })

  it('puts the setting back and says so when the save fails', async () => {
    H.savePreferences.mockRejectedValue(new Error('offline'))
    render(<SettingsPage />)
    const toggle = within(card()).getByRole('switch', { name: 'Estimated Dates' })
    await userEvent.click(toggle)
    // Optimistic first, then reverted, so the screen never lies about storage.
    await vi.waitFor(() => expect(H.error).toHaveBeenCalled())
    expect(toggle).toBeChecked()
  })
})
