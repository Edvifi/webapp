import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AidForms, FinancialAid101Tab } from './FinancialAidModule'
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

  it('shows its first schools before it opens, and the rest once it does', async () => {
    const dated = (name: string, day: number) => school(name, { financialAidDeadlines: { fafsaPriority: `Jan ${day}, 2027`, cssProfile: null, aidNotification: null } })
    render(<AidForms aid={state([dated('E', 5), dated('A', 1), dated('D', 4), dated('B', 2), dated('C', 3)])} gradeStartIdx={null} />)
    const fafsa = screen.getByRole('button', { name: /^FAFSA/ }).parentElement!
    // Soonest first, three of them, and a toggle that says how many there are.
    expect(within(fafsa).getAllByText(/^Jan \d, 2027$/).map((d) => d.textContent)).toEqual(['Jan 1, 2027', 'Jan 2, 2027', 'Jan 3, 2027'])
    expect(within(fafsa).queryByText(/studentaid\.gov/)).not.toBeInTheDocument()
    await userEvent.click(within(fafsa).getByRole('button', { name: 'Show all 5 schools' }))
    expect(within(fafsa).getAllByText(/^Jan \d, 2027$/)).toHaveLength(5)
    expect(within(fafsa).getByText(/studentaid\.gov/)).toBeInTheDocument()
    await userEvent.click(within(fafsa).getByRole('button', { name: 'Show less' }))
    expect(within(fafsa).getAllByText(/^Jan \d, 2027$/)).toHaveLength(3)
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

  it('takes the student’s own date where none is on file', async () => {
    const set = vi.fn()
    const mine: Record<string, { fafsa?: string; css?: string }> = { Duke: {}, UNC: {}, Elon: { fafsa: '2027-01-05' } }
    render(<AidForms aid={list} gradeStartIdx={null} ownDates={{ get: (id) => mine[id] ?? null, set }} />)
    // Elon's own date is the earliest, so it leads.
    expect(screen.getByText('Your earliest school date: Jan 5, 2027 (Elon)')).toBeInTheDocument()

    const fafsa = screen.getByRole('button', { name: /^FAFSA/ })
    await userEvent.click(fafsa)
    // Duke and UNC have dates on file: nothing to add there.
    expect(within(fafsa.parentElement!).queryAllByRole('button', { name: /Add a due date/ })).toHaveLength(0)
    expect(screen.getByRole('button', { name: /Change the due date for Elon’s FAFSA priority date/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^CSS Profile/ }))
    // Elon may need it and has no date: the student can add one.
    await userEvent.click(screen.getByRole('button', { name: 'Add a due date for Elon’s CSS Profile date' }))
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'date')
    expect(set).not.toHaveBeenCalled()
  })

  it('points an empty list at Application Tracking', async () => {
    render(<AidForms aid={state([])} gradeStartIdx={null} />)
    expect(screen.getAllByText('Add schools in Application Tracking to see what each one asks for')).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: /FAFSA/ }))
    expect(screen.getByRole('link', { name: 'Application Tracking' })).toHaveAttribute('href', '#/dashboard/application-tracking/discover')
  })
})

describe('Financial Aid 101', () => {
  it('starts with the kinds of aid, then the six scholarship steps, and opens each one', async () => {
    const onToggle = vi.fn()
    // The open article belongs to the module now, so stand in for it.
    const Harness = () => {
      const [activeId, setActiveId] = useState<string | null>(null)
      return <FinancialAid101Tab progress={{ 'sr-1': 'completed' }} onToggle={onToggle} activeId={activeId} onOpenContent={setActiveId} />
    }
    render(<Harness />)
    expect(screen.getByText('1/18 completed')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Grants vs. loans vs. work-study'))
    expect(onToggle).toHaveBeenCalledWith('at-1')
    expect(screen.getByText('1 of 18')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'The Three Pillars of Financial Aid' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back to Financial Aid 101/ })).toBeInTheDocument()
    // The scholarship steps follow the four aid-type items, and each has its article.
    await userEvent.click(screen.getByRole('button', { name: /Back to Financial Aid 101/ }))
    await userEvent.click(screen.getByText('Understanding scholarships: types, eligibility, and how they work'))
    expect(screen.getByText('5 of 18')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'What Is a Scholarship?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Back to Financial Aid 101/ }))
    await userEvent.click(screen.getByText('Identify 10 scholarships to apply to senior year'))
    expect(screen.getByText('10 of 18')).toBeInTheDocument()
    expect(screen.queryByText('Content not found for this item.')).not.toBeInTheDocument()
  })

  it('holds the rest of the checklist in order, and opens an article to read without starting it', () => {
    const onToggle = vi.fn()
    const { unmount } = render(<FinancialAid101Tab progress={{}} onToggle={onToggle} activeId={null} onOpenContent={vi.fn()} />)
    const sections = screen.getAllByRole('button', { expanded: true }).map((b) => b.textContent)
    const order = ['Understanding Aid Types', 'Scholarships', 'FAFSA Preparation', 'Net Price Calculators']
    expect(sections).toHaveLength(order.length)
    order.forEach((title, i) => expect(sections[i]).toMatch(new RegExp(`^${title}`)))
    unmount()
    // Opened straight onto by the module (Overview's "Start FAFSA prep").
    render(<FinancialAid101Tab progress={{}} onToggle={onToggle} activeId="fp-1" onOpenContent={vi.fn()} />)
    expect(screen.getByText('What is FAFSA and why every student should file', { exact: false })).toBeInTheDocument()
    expect(onToggle).not.toHaveBeenCalled()
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
