import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FeeWaiverNotice from './FeeWaiverNotice'

describe('FeeWaiverNotice', () => {
  it('stays silent for students above the waiver line', () => {
    // The whole point of the income gate: no banner for people it can't help.
    const { container } = render(
      <FeeWaiverNotice eligibility="unlikely" variant="dashboard" onPrimary={vi.fn()} onDismiss={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('tells a qualifying student they likely qualify', () => {
    render(<FeeWaiverNotice eligibility="likely" variant="module" onPrimary={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByRole('heading', { name: /likely qualify for application fee waivers/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /how to claim them/i })).toBeInTheDocument()
  })

  it('asks a student with no income on file to add it', () => {
    render(<FeeWaiverNotice eligibility="unknown" variant="dashboard" onPrimary={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByRole('heading', { name: /could application fees be waived/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add your income/i })).toBeInTheDocument()
  })

  it('never tells an unknown-income student they qualify', () => {
    // Phrasing matters: we don't know yet, so the copy must not assert eligibility.
    render(<FeeWaiverNotice eligibility="unknown" variant="dashboard" onPrimary={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.queryByText(/you likely qualify/i)).not.toBeInTheDocument()
  })

  it('fires the primary action', async () => {
    const user = userEvent.setup()
    const onPrimary = vi.fn()
    render(<FeeWaiverNotice eligibility="likely" variant="module" onPrimary={onPrimary} onDismiss={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /how to claim them/i }))
    expect(onPrimary).toHaveBeenCalledOnce()
  })

  it('fires dismiss from the labelled close control', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<FeeWaiverNotice eligibility="likely" variant="module" onPrimary={vi.fn()} onDismiss={onDismiss} />)
    await user.click(screen.getByRole('button', { name: /dismiss fee waiver notice/i }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
