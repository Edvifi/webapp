import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AidForms, Scholarships101Tab } from './FinancialAidModule'
import { ContentBlockRenderer } from './contentBlocks'
import type { AidCollege } from '../lib/aidColleges'

vi.mock('../lib/supabase', () => ({ supabase: {} }))

const school = (name: string, over: Partial<AidCollege> = {}): AidCollege => ({
  id: name, canonicalId: name, name, emoji: '🎓', domain: null, type: '4-year', control: 'Private', isPublic: false,
  city: null, state: null, npcUrl: null, costOfAttendance: null, costOutOfState: null,
  applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: null },
  financialAidDeadlines: { fafsaPriority: null, cssProfile: null, aidNotification: null },
  meetsFullNeed: false, noLoanPolicy: false, curated: false, guarantee: null,
  ...over,
})
const state = (colleges: AidCollege[]) => ({ colleges, loading: false, failed: false, unresolved: [] })

describe('AidForms', () => {
  const list = state([
    school('Duke', { curated: true, financialAidDeadlines: { fafsaPriority: 'Feb 1, 2027', cssProfile: 'Nov 1, 2026', aidNotification: null } }),
    school('UNC', { isPublic: true, control: 'Public', financialAidDeadlines: { fafsaPriority: 'Jan 15, 2027', cssProfile: null, aidNotification: null } }),
    school('Elon'),
  ])

  it('sums up the list and opens onto each school', async () => {
    render(<AidForms aid={list} gradeStartIdx={null} />)
    expect(screen.getByText(/^Your earliest school date: Jan 15, \d{4} \(UNC\)$/)).toBeInTheDocument()
    expect(screen.getByText('Needed by 1 of your 3 schools; 1 more may need it')).toBeInTheDocument()

    const css = screen.getByRole('button', { name: /CSS Profile/ })
    expect(css).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(css)
    expect(css).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/^Nov 1, \d{4}$/)).toBeInTheDocument()
    expect(screen.getByText('Check its aid page')).toBeInTheDocument()
    expect(screen.getByText('Not usually')).toBeInTheDocument()
  })

  it('goes to Aid Tracker instead of opening on Overview', async () => {
    const onSeeSchools = vi.fn()
    render(<AidForms aid={list} gradeStartIdx={null} onSeeSchools={onSeeSchools} />)
    const fafsa = screen.getByRole('button', { name: /FAFSA/ })
    expect(fafsa).not.toHaveAttribute('aria-expanded')
    await userEvent.click(fafsa)
    expect(onSeeSchools).toHaveBeenCalledOnce()
    expect(screen.queryByText('No date on file')).not.toBeInTheDocument()
  })

  it('points an empty list at Application Tracking', async () => {
    render(<AidForms aid={state([])} gradeStartIdx={null} />)
    expect(screen.getAllByText('Add schools in Application Tracking to see what each one asks for')).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: /FAFSA/ }))
    expect(screen.getByRole('link', { name: 'Application Tracking' })).toHaveAttribute('href', '#/dashboard/application-tracking/discover')
  })
})

describe('Scholarships 101', () => {
  it('lists the six steps in order and opens each one', async () => {
    const onToggle = vi.fn()
    render(<Scholarships101Tab progress={{ 'sr-1': 'completed' }} onToggle={onToggle} />)
    expect(screen.getByText('1/6 completed')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Understanding scholarships: types, eligibility, and how they work'))
    expect(onToggle).toHaveBeenCalledWith('sr-5')
    expect(screen.getByText('1 of 6')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'What Is a Scholarship?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back to Scholarships 101/ })).toBeInTheDocument()
    // Last step's article is there too, and the "next" button stops at it.
    await userEvent.click(screen.getByRole('button', { name: /Back to Scholarships 101/ }))
    await userEvent.click(screen.getByText('Identify 10 scholarships to apply to senior year'))
    expect(screen.getByText('6 of 6')).toBeInTheDocument()
    expect(screen.queryByText('Content not found for this item.')).not.toBeInTheDocument()
  })
})

describe('content blocks', () => {
  it('renders bold, italic, numbered lists and tables', () => {
    const { container } = render(<>
      <ContentBlockRenderer accentColor="#000" block={{ kind: 'paragraph', text: 'Pay **how often** you *can* get it, 3 * 2' }} />
      <ContentBlockRenderer accentColor="#000" block={{ kind: 'list', ordered: true, items: ['First', 'Second'] }} />
      <ContentBlockRenderer accentColor="#000" block={{ kind: 'table', head: ['Factor', 'Ask'], rows: [['Eligibility', 'Do I **qualify**?']] }} />
    </>)
    expect(container.querySelector('strong')?.textContent).toBe('how often')
    expect(container.querySelector('em')?.textContent).toBe('can')
    expect(screen.getByText(/, 3 \* 2$/)).toBeInTheDocument()
    expect(container.querySelector('ol')?.textContent).toBe('1.First2.Second')
    expect(screen.getByRole('columnheader', { name: 'Factor' })).toBeInTheDocument()
    expect(container.querySelectorAll('td')[1].innerHTML).toBe('Do I <strong style="font-weight: 700;">qualify</strong>?')
  })
})
