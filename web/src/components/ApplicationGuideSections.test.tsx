import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApplicationGuideSections, { ApplicationRounds } from './ApplicationGuideSections'
import type { ApplicationEntry } from '../data/applicationsChecklist'

vi.mock('../lib/supabase', () => ({ supabase: {} }))

const app = (name: string, over: Partial<ApplicationEntry> = {}): ApplicationEntry => ({
  collegeId: `test-${name}`, name, category: 'reach', deadlineType: 'RD', status: 'not-started', ...over,
})
const apps = [
  app('Duke', { deadlineType: 'ED', customDeadline: '2099-11-01', applicationFeeCents: 8500 }),
  app('UNC', { customDeadline: '2099-01-15', applicationFeeCents: 0 }),
  app('Elon', { customDeadline: '2099-01-10', applicationFeeCents: 6000 }),
  app('Wake Tech', { deadlineType: 'Rolling', institutionType: '2yr' }),
  app('Rice', { deadlineType: 'EA', status: 'submitted', applicationFeeCents: 7500 }),
]

describe('ApplicationRounds', () => {
  it('places the schools still to send in each round', async () => {
    const onSeeSchools = vi.fn()
    render(<ApplicationRounds apps={apps} gradeStartIdx={null} onSeeSchools={onSeeSchools} />)
    expect(screen.getByText('Applying early to 1 school: Duke, Nov 1, 2099')).toBeInTheDocument()
    expect(screen.getByText('2 schools in Regular Decision; Elon is first, Jan 10, 2099; 1 more is rolling')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Regular Decision/ }))
    expect(onSeeSchools).toHaveBeenCalledOnce()
  })

  it('points an empty list at Discover', () => {
    render(<ApplicationRounds apps={[]} gradeStartIdx={null} onSeeSchools={() => {}} />)
    expect(screen.getAllByText('Add schools in Discover to see where yours fall')).toHaveLength(2)
  })

  it('says an early application is in rather than missing', () => {
    render(<ApplicationRounds apps={apps.filter((a) => a.name !== 'Duke')} gradeStartIdx={null} onSeeSchools={() => {}} />)
    expect(screen.getByText('Your early application is in')).toBeInTheDocument()
  })
})

describe('ApplicationGuideSections', () => {
  it('sums up the list and opens onto Application 101', async () => {
    const onRead = vi.fn()
    render(<ApplicationGuideSections apps={apps} onRead={onRead} onSeeSchools={() => {}} />)
    // Rice is in, so its fee is off the bill; Wake Tech has none on file.
    expect(screen.getByText('Your list: $145 for 2 schools, 1 free, 1 not on file')).toBeInTheDocument()
    expect(screen.getByText('On your list: 1 ED, 1 EA, 2 RD, 1 rolling')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^Application rounds/ }))
    expect(screen.getByText('2 on your list', { exact: false })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Should I apply ED/ }))
    expect(onRead).toHaveBeenCalledWith('as-2')
  })

  it('leaves fees general until one is on file', () => {
    render(<ApplicationGuideSections apps={[app('Elon'), app('Duke')]} onRead={() => {}} onSeeSchools={() => {}} />)
    expect(screen.getByText('Many schools are free, and a waiver covers the rest for many families')).toBeInTheDocument()
  })
})
