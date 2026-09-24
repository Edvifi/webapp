import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CollegeDiscoverTab from './CollegeDiscoverTab'
import type { ComponentProps } from 'react'
import type { College } from '../lib/collegeMatch'
import type { ApplicationEntry } from '../data/applicationsChecklist'

// Deterministic data layer: real engine, mocked I/O.
const H = vi.hoisted(() => {
  const mk = (over: Partial<College>): College => ({
    id: 'id-' + over.slug, scorecard_id: 1, name: 'X', slug: 'x', institution_type: '4yr',
    city: 'Testville', state: 'CA', region: 'West', ownership: 'public', locale: 'city',
    latitude: 34, longitude: -118, size: 9000, admit_rate: 0.6,
    sat_reading_25: 550, sat_reading_75: 650, sat_math_25: 560, sat_math_75: 660, act_25: 24, act_75: 30,
    avg_net_price_cents: 1200000, net_price_by_income: { '48k_75k': 900000 }, cost_of_attendance_cents: 3000000,
    programs: { engineering: 0.2 }, grad_rate: 0.8, transfer_rate: null, median_earnings_10yr_cents: 6000000,
    pell_pct: 0.3, npc_url: 'www.example.edu/npc', url: 'www.example.edu', source: 'scorecard', status: 'published',
    last_seen_at: '2026-01-01T00:00:00Z', raw: null, verified_at: '2026-01-01T00:00:00Z', student_body: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    // Curated editorial fields: null is the common case (45/6273 rows carry them).
    cost_out_of_state_cents: null,
    legacy_slug: null, emoji: null, early_action: null, early_decision: null, regular_decision: null,
    fafsa_priority: null, css_profile: null, aid_notification: null, meets_full_need: null,
    no_loan_policy: null, curated_at: null,
    ...over,
  })
  const SAMPLE: College[] = [
    mk({ scorecard_id: 1, slug: 'state_flagship', name: 'State Flagship University', institution_type: '4yr' }),
    mk({ scorecard_id: 2, slug: 'local_cc', name: 'Local Community College', institution_type: '2yr', ownership: 'public', admit_rate: null, avg_net_price_cents: 300000, transfer_rate: 0.3 }),
    mk({ scorecard_id: 3, slug: 'private_college', name: 'Private Liberal Arts College', ownership: 'private_nonprofit' }),
  ]
  const studentProfile = {
    gpa: 3.6, satTotal: 1300, act: null, intendedFields: ['engineering'], familyIncomeCents: 6000000,
    homeState: 'CA', prefSize: null, prefSettings: null, prefOwnership: 'either' as const,
    prefMaxDistance: 'anywhere' as const, openToTransfer: true, openToTrade: false,
  }
  const prefs = { homeState: 'CA', intendedFields: ['engineering'], satTotal: 1300, act: null, prefSize: null,
    prefSettings: [], prefOwnership: 'either' as const, prefMaxDistance: 'anywhere' as const,
    openToTransfer: true, openToTrade: false, completed: true }
  return { SAMPLE, studentProfile, prefs }
})

const savePrefs = vi.fn()
vi.mock('../lib/supabase', () => ({ supabase: {} }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ profile: { demographics: { zipcode: null } } }) }))
vi.mock('../lib/geoZip', () => ({ geocodeZip: vi.fn().mockResolvedValue(null) }))
vi.mock('../lib/useColleges', () => ({ useColleges: () => ({ rows: H.SAMPLE, loading: false, error: null }) }))
vi.mock('../lib/collegeSearch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/collegeSearch')>()),
  // The saved list's DB rows: State Flagship is 'sc-1'.
  fetchSavedColleges: vi.fn(async () => new Map([['sc-1', H.SAMPLE[0]]])),
}))
vi.mock('../lib/useCollegePrefs', () => ({
  useCollegePrefs: () => ({ prefs: H.prefs, savePrefs, loaded: true, studentProfile: H.studentProfile }),
}))

const FLAGSHIP_ENTRY: ApplicationEntry = {
  collegeId: 'sc-1', name: 'State Flagship University', category: 'match', deadlineType: 'RD', status: 'not-started',
}

const renderTab = (over: Partial<ComponentProps<typeof CollegeDiscoverTab>> = {}) => {
  const props = { open: true, apps: [], onAdd: vi.fn(), onOpenSchool: vi.fn(), onManageList: vi.fn(), ...over }
  render(<CollegeDiscoverTab {...props} />)
  return props
}

describe('CollegeDiscoverTab', () => {
  it('renders scored match cards for the loaded colleges', () => {
    renderTab()
    expect(screen.getByRole('heading', { name: /discover your matches/i })).toBeInTheDocument()
    expect(screen.getByText('State Flagship University')).toBeInTheDocument()
    // The CC can appear in multiple surfaces (nudge + gems + main grid).
    expect(screen.getAllByText('Local Community College').length).toBeGreaterThan(0)
    expect(screen.getAllByText('match').length).toBeGreaterThan(0) // fit-% labels
  })

  it('calls onAdd with the college + admission band when adding to the list', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    renderTab({ onAdd })
    await user.click(screen.getAllByRole('button', { name: '+ Add to list' })[0])
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd.mock.calls[0][0]).toEqual(expect.objectContaining({ slug: expect.any(String) }))
    expect(typeof onAdd.mock.calls[0][1]).toBe('string') // admission band
  })

  it('marks a college already on the list (by stable scorecard id) as added', () => {
    renderTab({ apps: [FLAGSHIP_ENTRY] })
    // State Flagship has scorecard_id 1 -> collegeAppId 'sc-1'.
    expect(screen.getAllByText('✓ On your list').length).toBeGreaterThan(0)
  })

  it('opens the preferences form from "Edit preferences"', async () => {
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByRole('button', { name: /edit preferences/i }))
    expect(screen.getByRole('heading', { name: /best-fit schools/i })).toBeInTheDocument()
  })

  it('opens the school detail popup when a card is clicked', async () => {
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getAllByText('State Flagship University')[0])
    expect(await screen.findByRole('dialog', { name: /state flagship university/i })).toBeInTheDocument()
  })

  it('shows an empty list strip until a school is added', () => {
    renderTab()
    expect(screen.getByText('Your list is empty.')).toBeInTheDocument()
  })

  it('shows the list with its map and average costs', async () => {
    renderTab({ apps: [FLAGSHIP_ENTRY] })
    expect(screen.getByText('Your list · 1 school')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /us map of your college list/i })).toBeInTheDocument()
    expect(screen.getByText('Avg. net price')).toBeInTheDocument()
    // cost_of_attendance_cents 3,000,000 → $30,000/yr
    expect(await screen.findByText('$30,000/yr')).toBeInTheDocument()
  })

  it('shows a school in the cost box from its logo, then opens its application', async () => {
    const user = userEvent.setup()
    const { onOpenSchool, onManageList } = renderTab({ apps: [FLAGSHIP_ENTRY] })
    await user.click(screen.getByRole('button', { name: 'Show State Flagship University' }))
    expect(await screen.findByText('Cost of attendance')).toBeInTheDocument()
    expect(screen.getByText('Net price for you')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /open its application/i }))
    expect(onOpenSchool).toHaveBeenCalledWith('sc-1')
    await user.click(screen.getByRole('button', { name: /manage in application status/i }))
    expect(onManageList).toHaveBeenCalled()
  })

  it('hides the map when the strip is collapsed', async () => {
    const user = userEvent.setup()
    renderTab({ apps: [FLAGSHIP_ENTRY] })
    await user.click(screen.getByRole('button', { name: /hide map/i }))
    expect(screen.queryByRole('img', { name: /us map of your college list/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /show map/i }))
    expect(screen.getByRole('img', { name: /us map of your college list/i })).toBeInTheDocument()
  })

  it('tags each pick with why it was picked', () => {
    renderTab()
    expect(screen.getByText('Picked for you')).toBeInTheDocument()
    const reasons = screen.getAllByText(/^(Path to your dream school|Affordable, close to home|Strong fit, likely admit)$/)
    expect(reasons.length).toBeGreaterThan(0)
  })

  it('keeps the page in place while a search runs', async () => {
    const user = userEvent.setup()
    renderTab()
    await user.type(screen.getByPlaceholderText('Search by name…'), 'St')
    // Nothing above the search box disappears, and the cards stay (dimmed)
    // instead of collapsing to a one-line loading message.
    expect(screen.getByText('Picked for you')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Searching all colleges…')
    expect(screen.getAllByText('State Flagship University').length).toBeGreaterThan(0)
  })

  it('filters to public schools (community colleges included) or private ones', async () => {
    const user = userEvent.setup()
    renderTab()
    const grid = () => screen.getByText(/^Showing \d+ of \d+$/).textContent
    await user.click(screen.getByRole('button', { name: 'Private' }))
    expect(grid()).toBe('Showing 1 of 1')
    expect(screen.getAllByText('Private Liberal Arts College').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Public' }))
    expect(grid()).toBe('Showing 2 of 2') // flagship + community college
    await user.click(screen.getByRole('button', { name: 'Public' })) // click again clears it
    expect(grid()).toBe('Showing 3 of 3')
  })
})
