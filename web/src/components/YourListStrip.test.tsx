/**
 * The strip moved from Discover to the module Overview, so its own coverage
 * moved here with it and now renders the component directly rather than
 * reaching it through Discover's feed.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import YourListStrip from './YourListStrip'
import type { College, StudentCollegeProfile } from '../lib/collegeMatch'
import type { ApplicationEntry } from '../data/applicationsChecklist'

const H = vi.hoisted(() => {
  // Only the fields the strip reads: where the pin goes, what the cost box
  // shows, and enough for the fit score. The cast keeps the other ~40 columns
  // of the row out of a test that never looks at them.
  const FLAGSHIP = {
    id: 'id-state_flagship', scorecard_id: 1, name: 'State Flagship University', slug: 'state_flagship',
    institution_type: '4yr', city: 'Testville', state: 'CA', region: 'West', ownership: 'public',
    locale: 'city', latitude: 34, longitude: -118, size: 9000, admit_rate: 0.6,
    sat_reading_25: 550, sat_reading_75: 650, sat_math_25: 560, sat_math_75: 660, act_25: 24, act_75: 30,
    avg_net_price_cents: 1200000, net_price_by_income: { '48k_75k': 900000 },
    cost_of_attendance_cents: 3000000, programs: { engineering: 0.2 }, grad_rate: 0.8,
    median_earnings_10yr_cents: 6000000, pell_pct: 0.3, source: 'scorecard', status: 'published',
  } as unknown as College
  return { FLAGSHIP }
})

vi.mock('../lib/supabase', () => ({ supabase: {} }))
vi.mock('../lib/collegeSearch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/collegeSearch')>()),
  fetchSavedColleges: vi.fn(async () => new Map([['sc-1', H.FLAGSHIP]])),
}))

const PROFILE: StudentCollegeProfile = {
  gpa: 3.6, satTotal: 1300, act: null, intendedFields: ['engineering'], familyIncomeCents: 6000000,
  homeState: 'CA', prefSize: null, prefSettings: null, prefOwnership: 'either',
  prefMaxDistance: 'anywhere', openToTransfer: true, openToTrade: false,
}

const FLAGSHIP_ENTRY: ApplicationEntry = {
  collegeId: 'sc-1', name: 'State Flagship University', category: 'match',
  deadlineType: 'RD', status: 'not-started', state: 'CA',
}

const renderStrip = (apps: ApplicationEntry[] = []) => {
  const onOpenSchool = vi.fn(), onDiscover = vi.fn(), onSeeAll = vi.fn()
  render(<YourListStrip apps={apps} profile={PROFILE} origin={null} onOpenSchool={onOpenSchool} onDiscover={onDiscover} onSeeAll={onSeeAll} />)
  return { onOpenSchool, onDiscover, onSeeAll }
}

describe('YourListStrip', () => {
  it('shows an empty strip until a school is added, pointing at Discover', async () => {
    const user = userEvent.setup()
    const { onDiscover } = renderStrip()
    expect(screen.getByText('Your list is empty.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /discover colleges/i }))
    expect(onDiscover).toHaveBeenCalled()
  })

  it('shows the list with its map and average costs', async () => {
    renderStrip([FLAGSHIP_ENTRY])
    expect(screen.getByText('Your list · 1 school')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /us map of your college list/i })).toBeInTheDocument()
    expect(screen.getByText('Avg. net price')).toBeInTheDocument()
    // cost_of_attendance_cents 3,000,000 → $30,000/yr
    expect(await screen.findByText('$30,000/yr')).toBeInTheDocument()
    // Where: one school, in the student's home state (CA).
    expect(screen.getByText('1 state')).toBeInTheDocument()
    expect(screen.getByText(/in California/)).toBeInTheDocument()
  })

  it('shows a school in the cost box from its logo, then opens its application', async () => {
    const user = userEvent.setup()
    const { onOpenSchool } = renderStrip([FLAGSHIP_ENTRY])
    await user.click(screen.getByRole('button', { name: 'Show State Flagship University' }))
    expect(await screen.findByText('Cost of attendance')).toBeInTheDocument()
    expect(screen.getByText('Net price for you')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /open its application/i }))
    expect(onOpenSchool).toHaveBeenCalledWith('sc-1')
  })

  it('sends the main link to Discover, not to Application Status', async () => {
    const user = userEvent.setup()
    const { onDiscover } = renderStrip([FLAGSHIP_ENTRY])
    await user.click(screen.getByRole('button', { name: /discover colleges/i }))
    expect(onDiscover).toHaveBeenCalled()
  })

  it('hides the map when the strip is collapsed', async () => {
    const user = userEvent.setup()
    renderStrip([FLAGSHIP_ENTRY])
    await user.click(screen.getByRole('button', { name: /hide map/i }))
    expect(screen.queryByRole('img', { name: /us map of your college list/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /show map/i }))
    expect(screen.getByRole('img', { name: /us map of your college list/i })).toBeInTheDocument()
  })
})
