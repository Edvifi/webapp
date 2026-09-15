import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const H = vi.hoisted(() => ({
  completePasswordReset: vi.fn(),
  endRecovery: vi.fn(),
  success: vi.fn(),
}))
vi.mock('../lib/auth', () => ({ completePasswordReset: H.completePasswordReset }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ endRecovery: H.endRecovery }) }))
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ success: H.success, error: vi.fn(), info: vi.fn() }),
}))

import ResetPasswordScreen from './ResetPasswordScreen'

const fill = async (pw: string, confirm: string) => {
  const user = userEvent.setup()
  const [first, second] = screen.getAllByPlaceholderText(/characters|••••/)
  await user.type(first, pw)
  await user.type(second, confirm)
  await user.click(screen.getByRole('button', { name: /set password/i }))
}

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    H.completePasswordReset.mockReset()
    H.endRecovery.mockReset()
  })

  it('never asks for the current password', () => {
    // Asking would be asking for the thing the student came here to reset.
    render(<ResetPasswordScreen />)
    expect(screen.queryByPlaceholderText(/current password/i)).not.toBeInTheDocument()
  })

  it('sets the password and leaves recovery', async () => {
    H.completePasswordReset.mockResolvedValue({ error: null })
    render(<ResetPasswordScreen />)
    await fill('a-good-password', 'a-good-password')
    await waitFor(() => expect(H.completePasswordReset).toHaveBeenCalledWith('a-good-password'))
    await waitFor(() => expect(H.endRecovery).toHaveBeenCalledTimes(1))
  })

  it('refuses a mismatch without calling the server', async () => {
    render(<ResetPasswordScreen />)
    await fill('a-good-password', 'a-different-one')
    expect(await screen.findByText(/don't match/i)).toBeInTheDocument()
    expect(H.completePasswordReset).not.toHaveBeenCalled()
  })

  it('refuses a short password without calling the server', async () => {
    render(<ResetPasswordScreen />)
    await fill('short', 'short')
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(H.completePasswordReset).not.toHaveBeenCalled()
  })

  it('keeps the student here when the update fails', async () => {
    // Leaving recovery on failure would strand them: signed in, still no
    // password, and Settings asks for the one they forgot.
    H.completePasswordReset.mockResolvedValue({ error: 'Password is too weak' })
    render(<ResetPasswordScreen />)
    await fill('a-good-password', 'a-good-password')
    expect(await screen.findByText(/too weak/i)).toBeInTheDocument()
    expect(H.endRecovery).not.toHaveBeenCalled()
  })
})
