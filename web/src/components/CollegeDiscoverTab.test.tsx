import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CollegeDiscoverTab from './CollegeDiscoverTab'
import type { College } from '../lib/collegeMatch'

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
    last_seen_at: '2026-01-01T00:00:00Z', raw: null, verified_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', ...over,
  })
  const SAMPLE: College[] = [
    mk({ scorecard_id: 1, slug: 'state_flagship', name: 'State Flagship University', institution_type: '4yr' }),
    mk({ scorecard_id: 2, slug: 'local_cc', name: 'Local Community College', institution_type: '2yr', ownership: 'public', admit_rate: null, avg_net_price_cents: 300000, transfer_rate: 0.3 }),
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
vi.mock('../lib/useCollegePrefs', () => ({
  useCollegePrefs: () => ({ prefs: H.prefs, savePrefs, loaded: true, studentProfile: H.studentProfile }),
}))

describe('CollegeDiscoverTab', () => {
  it('renders scored match cards for the loaded colleges', () => {
    render(<CollegeDiscoverTab open existingIds={[]} onAdd={vi.fn()} />)
    expect(screen.getByRole('heading', { name: /discover your matches/i })).toBeInTheDocument()
    expect(screen.getByText('State Flagship University')).toBeInTheDocument()
    // The CC can appear in multiple surfaces (nudge + gems + main grid).
    expect(screen.getAllByText('Local Community College').length).toBeGreaterThan(0)
    expect(screen.getAllByText('match').length).toBeGreaterThan(0) // fit-% labels
  })

  it('calls onAdd with the college + admission band when adding to the list', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<CollegeDiscoverTab open existingIds={[]} onAdd={onAdd} />)
    await user.click(screen.getAllByRole('button', { name: '+ Add to list' })[0])
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd.mock.calls[0][0]).toEqual(expect.objectContaining({ slug: expect.any(String) }))
    expect(typeof onAdd.mock.calls[0][1]).toBe('string') // admission band
  })

  it('opens the preferences form from "Edit preferences"', async () => {
    const user = userEvent.setup()
    render(<CollegeDiscoverTab open existingIds={[]} onAdd={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /edit preferences/i }))
    expect(screen.getByRole('heading', { name: /best-fit schools/i })).toBeInTheDocument()
  })

  it('shows the net-price-calculator link on cards', () => {
    render(<CollegeDiscoverTab open existingIds={[]} onAdd={vi.fn()} />)
    const links = screen.getAllByRole('link', { name: /net price calculator/i })
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('example.edu/npc'))
  })
})
