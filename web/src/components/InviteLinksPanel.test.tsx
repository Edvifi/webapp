/**
 * The invite-links card: hidden from students, shows each link's funnel to an
 * admin, and creates links with a slug derived from the name.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { InviteLinkStats } from '../lib/inviteLinks'

const H = vi.hoisted(() => ({
  isAppAdmin: vi.fn(),
  getInviteLinkStats: vi.fn(),
  createInviteLink: vi.fn(),
  setInviteLinkArchived: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ success: H.success, error: H.error }),
}))
vi.mock('../lib/inviteLinks', async (orig) => ({
  ...(await orig<typeof import('../lib/inviteLinks')>()),
  isAppAdmin: H.isAppAdmin,
  getInviteLinkStats: H.getInviteLinkStats,
  createInviteLink: H.createInviteLink,
  setInviteLinkArchived: H.setInviteLinkArchived,
}))
vi.mock('../lib/supabase', () => ({ supabase: {} }))

import InviteLinksPanel from './InviteLinksPanel'

const row = (o: Partial<InviteLinkStats>): InviteLinkStats => ({
  slug: 'x', label: null, is_link: true, created_at: null, archived_at: null,
  visits: 0, signups: 0, invited: 0, joined: 0, onboarded: 0, last_signup_at: null, ...o,
})

beforeEach(() => {
  vi.clearAllMocks()
  H.createInviteLink.mockResolvedValue({ error: null })
  H.setInviteLinkArchived.mockResolvedValue({ error: null })
})

describe('InviteLinksPanel', () => {
  it('renders nothing for a non-admin and never asks for stats', async () => {
    H.isAppAdmin.mockResolvedValue(false)
    const { container } = render(<InviteLinksPanel />)
    await vi.waitFor(() => expect(H.isAppAdmin).toHaveBeenCalled())
    await Promise.resolve()
    expect(container).toBeEmptyDOMElement()
    expect(H.getInviteLinkStats).not.toHaveBeenCalled()
  })

  it('shows each link’s funnel, the no-link row and stray refs', async () => {
    H.isAppAdmin.mockResolvedValue(true)
    H.getInviteLinkStats.mockResolvedValue([
      row({ slug: 'lincoln-high', label: 'Lincoln High', visits: 40, signups: 10, invited: 8, joined: 6, onboarded: 5 }),
      row({ slug: 'typo-link', is_link: false, signups: 2 }),
      row({ slug: null, is_link: false, signups: 8 }),
    ])
    render(<InviteLinksPanel />)

    const lincoln = (await screen.findByText('Lincoln High')).closest('tr')!
    const cells = within(lincoln).getAllByRole('cell').map((c) => c.textContent)
    // visits, signups, conversion, invited, joined (+ rate of invited), onboarded
    expect(cells.slice(0, 6)).toEqual(['40', '10', '25%', '8', '6 75%', '5'])

    expect(screen.getByText('No link')).toBeInTheDocument()
    expect(screen.getByText('Unknown')).toBeInTheDocument()
    // 12 of 20 signups came through some ref.
    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('creates a link with the slug worked out from its name', async () => {
    H.isAppAdmin.mockResolvedValue(true)
    H.getInviteLinkStats.mockResolvedValue([])
    const user = userEvent.setup()
    render(<InviteLinksPanel />)

    await user.type(await screen.findByPlaceholderText(/Lincoln High/), 'Roosevelt HS — Fall')
    expect(screen.getByPlaceholderText('lincoln-high')).toHaveValue('roosevelt-hs-fall')
    expect(screen.getByText('https://edvifi.ai/home?ref=roosevelt-hs-fall#waitlist')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create link' }))
    expect(H.createInviteLink).toHaveBeenCalledWith('roosevelt-hs-fall', 'Roosevelt HS — Fall')
    expect(H.success).toHaveBeenCalled()
  })

  it('offers to adopt a stray ref as a real link', async () => {
    H.isAppAdmin.mockResolvedValue(true)
    H.getInviteLinkStats.mockResolvedValue([row({ slug: 'typo-link', is_link: false, signups: 2 })])
    const user = userEvent.setup()
    render(<InviteLinksPanel />)

    await user.click(await screen.findByRole('button', { name: 'Create a link for typo-link' }))
    expect(screen.getByPlaceholderText('lincoln-high')).toHaveValue('typo-link')
  })

  it('archives a link', async () => {
    H.isAppAdmin.mockResolvedValue(true)
    H.getInviteLinkStats.mockResolvedValue([row({ slug: 'old', label: 'Old post' })])
    const user = userEvent.setup()
    render(<InviteLinksPanel />)

    await user.click(await screen.findByRole('button', { name: 'Archive Old post' }))
    expect(H.setInviteLinkArchived).toHaveBeenCalledWith('old', true)
  })
})
