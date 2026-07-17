import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CollegePrefsForm from './CollegePrefsForm'
import { DEFAULT_COLLEGE_PREFS } from '../lib/collegeMatch'

// US_STATES comes from fafsaData, which imports the supabase client — stub it out.
vi.mock('../lib/supabase', () => ({ supabase: {} }))

describe('CollegePrefsForm', () => {
  it('renders the intake and reflects the current prefs', () => {
    render(<CollegePrefsForm value={{ ...DEFAULT_COLLEGE_PREFS, intendedFields: ['computer'] }} onSave={vi.fn()} />)
    expect(screen.getByRole('heading', { name: /best-fit schools/i })).toBeInTheDocument()
    // A preselected major chip renders (its exact color/aria isn't asserted, just presence).
    expect(screen.getByRole('button', { name: 'Computer Science' })).toBeInTheDocument()
    // Transfer nudge defaults on.
    expect(DEFAULT_COLLEGE_PREFS.openToTransfer).toBe(true)
  })

  it('submits the edited preferences with completed=true', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<CollegePrefsForm value={DEFAULT_COLLEGE_PREFS} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Engineering' })) // exact — won't match "Engineering Tech"
    await user.click(screen.getByRole('button', { name: /Trade & career\/technical/i })) // toggle on
    await user.click(screen.getByRole('button', { name: /find my matches/i }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const saved = onSave.mock.calls[0][0]
    expect(saved.completed).toBe(true)
    expect(saved.intendedFields).toContain('engineering')
    expect(saved.openToTrade).toBe(true)
  })

  it('deselects a major chip on second click', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<CollegePrefsForm value={DEFAULT_COLLEGE_PREFS} onSave={onSave} />)
    await user.click(screen.getByRole('button', { name: 'Biology' }))
    await user.click(screen.getByRole('button', { name: 'Biology' }))
    await user.click(screen.getByRole('button', { name: /find my matches/i }))
    expect(onSave.mock.calls[0][0].intendedFields).not.toContain('biological')
  })
})
