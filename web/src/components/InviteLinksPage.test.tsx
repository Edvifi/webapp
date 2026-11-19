/**
 * The invite-links page: closed to students, shows an admin the funnel in
 * total, per platform and per link, and creates links with a slug derived from
 * the name.
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

import InviteLinksPage from './InviteLinksPage'

const row = (o: Partial<InviteLinkStats>): InviteLinkStats => ({
  slug: 'x', label: null, is_link: true, created_at: null, archived_at: null,
  visits: 0, signups: 0, invited: 0, joined: 0, onboarded: 0, last_signup_at: null, ...o,
})

/** The per-link table, which is the one with a "Link" column. */
const linksTable = () => screen.getByRole('columnheader', { name: 'Link' }).closest('table')!

beforeEach(() => {
  vi.clearAllMocks()
  H.createInviteLink.mockResolvedValue({ error: null })
  H.setInviteLinkArchived.mockResolvedValue({ error: null })
})

describe('InviteLinksPage', () => {
  it('tells a non-admin it is not for them and never asks for stats', async () => {
    H.isAppAdmin.mockResolvedValue(false)
    render(<InviteLinksPage />)
    expect(await screen.findByText('This page is for Edvifi admins.')).toBeInTheDocument()
    expect(H.getInviteLinkStats).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Create link' })).not.toBeInTheDocument()
  })

  it('shows each link’s funnel, the no-link row and stray refs', async () => {
    H.isAppAdmin.mockResolvedValue(true)
    H.getInviteLinkStats.mockResolvedValue([
      row({ slug: 'lincoln-high', label: 'Lincoln High', visits: 40, signups: 10, invited: 8, joined: 6, onboarded: 5 }),
      row({ slug: 'typo-link', is_link: false, signups: 2 }),
      row({ slug: null, is_link: false, signups: 8 }),
    ])
    render(<InviteLinksPage />)

    const lincoln = (await screen.findByText('Lincoln High')).closest('tr')!
    const cells = within(lincoln).getAllByRole('cell').map((c) => c.textContent)
    // visits, signups, conversion, invited, joined (+ rate of invited), onboarded
    expect(cells.slice(0, 6)).toEqual(['40', '10', '25%', '8', '6 75%', '5'])

    expect(within(linksTable()).getByText('No link')).toBeInTheDocument()
    expect(screen.getByText('Unknown')).toBeInTheDocument()
    // 12 of 20 signups came through some ref.
    expect(screen.getByText('60% through a link')).toBeInTheDocument()
  })

  it('adds up each platform and filters the links to one', async () => {
    H.isAppAdmin.mockResolvedValue(true)
    H.getInviteLinkStats.mockResolvedValue([
      row({ slug: 'reddit-fafsa', label: 'Reddit: r/FAFSA', visits: 30, signups: 3 }),
      row({ slug: 'reddit-act', label: 'Reddit: r/ACT', visits: 10, signups: 1 }),
      row({ slug: 'nextdoor-cv', label: 'Nextdoor: Carmel Valley', visits: 5, signups: 2 }),
    ])
    const user = userEvent.setup()
    render(<InviteLinksPage />)

    const byPlatform = (await screen.findByRole('heading', { name: 'By platform' })).closest('section')!
    const reddit = within(byPlatform).getByText('Reddit').closest('tr')!
    // links, visits, signups, conversion
    expect(within(reddit).getAllByRole('cell').slice(0, 4).map((c) => c.textContent)).toEqual(['2', '40', '4', '10%'])

    await user.click(screen.getByRole('radio', { name: 'Nextdoor' }))
    expect(within(linksTable()).getByText('Nextdoor: Carmel Valley')).toBeInTheDocument()
    expect(within(linksTable()).queryByText('Reddit: r/FAFSA')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'All' }))
    expect(within(linksTable()).getByText('Reddit: r/FAFSA')).toBeInTheDocument()
  })

  it('creates a link with the slug worked out from its name', async () => {
    H.isAppAdmin.mockResolvedValue(true)
    H.getInviteLinkStats.mockResolvedValue([])
    const user = userEvent.setup()
    render(<InviteLinksPage />)

    await user.type(await screen.findByPlaceholderText('Reddit: r/FAFSA'), 'Roosevelt HS — Fall')
    expect(screen.getByPlaceholderText('reddit-fafsa')).toHaveValue('roosevelt-hs-fall')
    expect(screen.getByText('https://edvifi.ai/?ref=roosevelt-hs-fall#waitlist')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create link' }))
    expect(H.createInviteLink).toHaveBeenCalledWith('roosevelt-hs-fall', 'Roosevelt HS — Fall')
    expect(H.success).toHaveBeenCalled()
  })

  it('offers to adopt a stray ref as a real link', async () => {
    H.isAppAdmin.mockResolvedValue(true)
    H.getInviteLinkStats.mockResolvedValue([row({ slug: 'typo-link', is_link: false, signups: 2 })])
    const user = userEvent.setup()
    render(<InviteLinksPage />)

    await user.click(await screen.findByRole('button', { name: 'Create a link for typo-link' }))
    expect(screen.getByPlaceholderText('reddit-fafsa')).toHaveValue('typo-link')
  })

  it('archives a link', async () => {
    H.isAppAdmin.mockResolvedValue(true)
    H.getInviteLinkStats.mockResolvedValue([row({ slug: 'old', label: 'Old post' })])
    const user = userEvent.setup()
    render(<InviteLinksPage />)

    await user.click(await screen.findByRole('button', { name: 'Archive Old post' }))
    expect(H.setInviteLinkArchived).toHaveBeenCalledWith('old', true)
  })
})
