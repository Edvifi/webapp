import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApplicationStatusTab from './ApplicationStatusTab'
import { setSharedTask, tasksForEntry } from '../data/applicationTasks'
import type { ApplicationEntry } from '../data/applicationsChecklist'

// Confetti needs a canvas, which jsdom doesn't have.
vi.mock('./Celebration', () => ({ default: () => null }))
// Net price loads the school's cost data from the database.
vi.mock('./NetPriceFact', () => ({ default: () => null }))
// jsdom has no layout, so no scrolling.
Element.prototype.scrollIntoView = vi.fn()

const app = (collegeId: string, name: string, fields: Partial<ApplicationEntry> = {}): ApplicationEntry => ({
  collegeId, name, category: 'match', deadlineType: 'RD', status: 'not-started', ...fields,
})

const APPS = [
  app('sc-1', 'Alpha College', { deadlineType: 'EA' }),
  app('sc-2', 'Beta University', { status: 'accepted' }),
]

/** A school's row in the list (the timeline has its own button per school). */
const schoolRow = (name: string) =>
  screen.getAllByRole('button', { name: new RegExp(name) }).find((b) => b.classList.contains('ast-row'))!

const renderTab = (apps = APPS, initialOpenId: string | null = null) => {
  const onUpdate = vi.fn()
  const onRemove = vi.fn()
  const onSetSharedDue = vi.fn()
  const onSetShared = vi.fn((id: string, done: boolean) => setSharedTask(apps, id, done))
  render(<ApplicationStatusTab apps={apps} onUpdate={onUpdate} onRemove={onRemove} onSetShared={onSetShared} onSetSharedDue={onSetSharedDue} gradeStartIdx={3} initialOpenId={initialOpenId} />)
  return { onUpdate, onRemove, onSetShared, onSetSharedDue }
}

describe('ApplicationStatusTab', () => {
  it('shows a summary, the shared tasks and one row per school', () => {
    renderTab()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Your applications')
    expect(screen.getByRole('button', { name: /1 to submit/ })).toBeInTheDocument()
    expect(screen.getByText('Shared across your list')).toBeInTheDocument()
    expect(screen.getByText('Request teacher recommendations')).toBeInTheDocument()
    expect(schoolRow('Alpha College')).toBeInTheDocument()
    expect(schoolRow('Beta University')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Next up: Alpha College/ })).toBeInTheDocument()
    // Per-school tasks stay on the school page.
    expect(screen.queryByText('Draft the supplemental essay(s)')).not.toBeInTheDocument()
  })

  it('checks a shared task for every school in one click', async () => {
    const { onSetShared } = renderTab()
    await userEvent.click(screen.getByText('Request teacher recommendations'))
    expect(onSetShared).toHaveBeenCalledWith('recs', true)
  })

  it('opens a school page with its own checklist, and goes back', async () => {
    renderTab()
    await userEvent.click(schoolRow('Alpha College'))
    expect(screen.getByRole('heading', { name: 'Alpha College' })).toBeInTheDocument()
    expect(screen.getByText('Draft the supplemental essay(s)')).toBeInTheDocument()
    expect(screen.getAllByText('Shared with 1 other school').length).toBeGreaterThan(0)
    await userEvent.click(screen.getByText('← All applications'))
    expect(screen.getByText('Shared across your list')).toBeInTheDocument()
  })

  it('routes a shared task ticked on a school page to every school', async () => {
    const { onSetShared, onUpdate } = renderTab()
    await userEvent.click(schoolRow('Alpha College'))
    const row = screen.getByText('Request teacher recommendations').parentElement!
    await userEvent.click(row.querySelector('button')!)
    expect(onSetShared).toHaveBeenCalledWith('recs', true)
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('pins only schools still to submit on the timeline, and opens them from it', async () => {
    renderTab()
    expect(screen.queryByRole('button', { name: /^Beta University,/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Alpha College, Early Action/ }))
    expect(screen.getByRole('heading', { name: 'Alpha College' })).toBeInTheDocument()
  })

  it('folds a crowded date into a "+N" bubble that lists every school', async () => {
    const names = ['Ash', 'Birch', 'Cedar', 'Dogwood', 'Elm']
    renderTab(names.map((n, i) => app(`sc-${i}`, `${n} College`)))
    // All five share the RD date: two pins, then "+3".
    await userEvent.click(screen.getByRole('button', { name: /3 more schools/ }))
    const list = screen.getByRole('dialog')
    for (const n of names) expect(list).toHaveTextContent(`${n} College`)
    await userEvent.click(within(list).getByText('Elm College'))
    expect(screen.getByRole('heading', { name: 'Elm College' })).toBeInTheDocument()
  })

  it('filters the school list from the status strip', async () => {
    renderTab([app('sc-1', 'Alpha College'), app('sc-2', 'Beta University', { status: 'accepted' })])
    await userEvent.click(screen.getByRole('button', { name: /1 accepted/ }))
    expect(schoolRow('Beta University')).toBeInTheDocument()
    expect(schoolRow('Alpha College')).toBeUndefined()
    await userEvent.click(screen.getByText('Show all'))
    expect(schoolRow('Alpha College')).toBeInTheDocument()
  })

  it('opens straight onto a school when asked to', () => {
    renderTab(APPS, 'sc-2')
    expect(screen.getByRole('heading', { name: 'Beta University' })).toBeInTheDocument()
  })

  it('edits category and round from the school page', async () => {
    const { onUpdate } = renderTab()
    await userEvent.click(schoolRow('Alpha College'))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Reach, match or safety' }), 'reach')
    expect(onUpdate).toHaveBeenCalledWith('sc-1', { category: 'reach' })
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Application round' }), 'ED')
    expect(onUpdate).toHaveBeenCalledWith('sc-1', { deadlineType: 'ED' })
  })

  it('removes a school only after confirming', async () => {
    const { onRemove } = renderTab()
    await userEvent.click(schoolRow('Alpha College'))
    await userEvent.click(screen.getByText('Remove from my list'))
    expect(onRemove).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onRemove).toHaveBeenCalledWith('sc-1')
  })

  it('sorts schools still to submit ahead of decided ones', () => {
    renderTab([app('sc-2', 'Beta University', { status: 'accepted' }), app('sc-1', 'Alpha College')])
    const rows = screen.getAllByRole('button', { name: /Alpha College|Beta University/ }).filter((b) => b.classList.contains('ast-row'))
    expect(rows.map((r) => r.textContent?.match(/Alpha College|Beta University/)?.[0])).toEqual(['Alpha College', 'Beta University'])
  })

  it('picks Next up from schools still to submit, skipping submitted ones', () => {
    renderTab([
      app('sc-1', 'Alpha College', { deadlineType: 'EA', status: 'submitted' }),
      app('sc-2', 'Beta University', { deadlineType: 'RD' }),
    ])
    expect(screen.getByRole('button', { name: /^Next up: Beta University/ })).toBeInTheDocument()
  })

  it('keeps the checklist in step when the round changes', async () => {
    const saved = app('sc-1', 'Alpha College', { deadlineType: 'RD' })
    const withTasks = { ...saved, tasks: tasksForEntry(saved) }
    const { onUpdate } = renderTab([withTasks])
    await userEvent.click(schoolRow('Alpha College'))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Application round' }), 'ED')
    const fields = onUpdate.mock.calls.at(-1)![1]
    expect(fields.deadlineType).toBe('ED')
    expect(fields.tasks.some((t: { id: string }) => t.id === 'agreement')).toBe(true)
  })

  it('dates a per-school task on that school, and a shared task on every school', async () => {
    const { onUpdate, onSetSharedDue } = renderTab()
    await userEvent.click(schoolRow('Alpha College'))
    const essayBox = screen.getByLabelText('Due date for Draft the supplemental essay(s)')
    fireEvent.focus(essayBox)
    fireEvent.change(essayBox, { target: { value: '2026-10-12' } })
    fireEvent.blur(essayBox)
    const [id, fields] = onUpdate.mock.calls.at(-1)!
    expect(id).toBe('sc-1')
    expect(fields.tasks.find((t: { id: string }) => t.id === 'essays').due).toBe('2026-10-12')
    const recsBox = screen.getByLabelText('Due date for Request teacher recommendations')
    fireEvent.focus(recsBox)
    fireEvent.change(recsBox, { target: { value: '2026-10-15' } })
    fireEvent.blur(recsBox)
    expect(onSetSharedDue).toHaveBeenCalledWith('recs', '2026-10-15')
  })

  it('offers a way to Discover when the list is empty', async () => {
    const onFindColleges = vi.fn()
    render(<ApplicationStatusTab apps={[]} onUpdate={vi.fn()} onRemove={vi.fn()} onSetShared={vi.fn()} onSetSharedDue={vi.fn()} gradeStartIdx={3} onFindColleges={onFindColleges} />)
    await userEvent.click(screen.getByRole('button', { name: 'Find colleges in Discover' }))
    expect(onFindColleges).toHaveBeenCalled()
  })

  it('saves the date box once typing settles, not each in-between value', async () => {
    const { onUpdate } = renderTab()
    await userEvent.click(schoolRow('Alpha College'))
    const box = screen.getByLabelText('Due date for Draft the supplemental essay(s)')
    onUpdate.mockClear()
    fireEvent.focus(box)
    // Typing a year, then a month: half-typed years and January-on-the-way-to-November.
    for (const v of ['0002-10-12', '0202-10-12', '2026-10-12', '2026-01-12', '2026-11-12']) {
      fireEvent.change(box, { target: { value: v } })
    }
    expect(onUpdate).not.toHaveBeenCalled()
    fireEvent.blur(box)
    expect(onUpdate).toHaveBeenCalledTimes(1)
    const fields = onUpdate.mock.calls[0][1]
    expect(fields.tasks.find((t: { id: string }) => t.id === 'essays').due).toBe('2026-11-12')
  })

  it('does not clear a date while a segment is being retyped, only on leaving it empty', async () => {
    const saved = app('sc-1', 'Alpha College')
    const withDue = { ...saved, tasks: tasksForEntry(saved).map((t) => (t.id === 'essays' ? { ...t, due: '2026-10-12' } : t)) }
    const { onUpdate } = renderTab([withDue])
    await userEvent.click(schoolRow('Alpha College'))
    const box = screen.getByLabelText('Due date for Draft the supplemental essay(s)')
    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: '' } })
    expect(onUpdate).not.toHaveBeenCalled()
    fireEvent.blur(box)
    expect(onUpdate.mock.calls.at(-1)![1].tasks.find((t: { id: string }) => t.id === 'essays').due).toBeUndefined()
  })

  it('groups schools under reach / match / safety when sorted by category', async () => {
    renderTab([
      app('sc-1', 'Alpha College', { category: 'safety' }),
      app('sc-2', 'Beta University', { category: 'reach' }),
      app('sc-3', 'Gamma Institute', { category: 'reach' }),
    ])
    await userEvent.click(screen.getByRole('button', { name: 'Category' }))
    // Group headings (bold), not the category label inside each row.
    const headings = screen.getAllByText(/^(Reach|Match|Safety|Unranked)$/).filter((el) => el.tagName === 'B').map((el) => el.textContent)
    expect(headings).toEqual(['Reach', 'Safety']) // empty groups are left out, reach first
    const rows = screen.getAllByRole('button', { name: /Alpha College|Beta University|Gamma Institute/ }).filter((b) => b.classList.contains('ast-row'))
    expect(rows.map((r) => r.textContent?.match(/Alpha College|Beta University|Gamma Institute/)?.[0])).toEqual(['Beta University', 'Gamma Institute', 'Alpha College'])
  })

  it('reverts rather than clears when leaving a half-edited date', async () => {
    const saved = app('sc-1', 'Alpha College')
    const withDue = { ...saved, tasks: tasksForEntry(saved).map((t) => (t.id === 'essays' ? { ...t, due: '2026-10-12' } : t)) }
    const { onUpdate } = renderTab([withDue])
    await userEvent.click(schoolRow('Alpha College'))
    const box = screen.getByLabelText('Due date for Draft the supplemental essay(s)') as HTMLInputElement
    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: '' } })
    // Some segments filled, some wiped: the browser reports '' plus badInput.
    Object.defineProperty(box, 'validity', { value: { badInput: true }, configurable: true })
    fireEvent.blur(box)
    expect(onUpdate).not.toHaveBeenCalled()
    expect(box.value).toBe('2026-10-12')
  })

})
