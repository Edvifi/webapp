import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import LoadingScreen from './LoadingScreen'

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })

describe('LoadingScreen', () => {
  afterEach(() => vi.useRealTimers())

  it('shows nothing at all for a load that resolves quickly', () => {
    vi.useFakeTimers()
    render(<LoadingScreen />)
    // A spinner flashed for 200ms reads as jank, not as speed.
    advance(300)
    expect(screen.queryByText(/Loading your dashboard/)).not.toBeInTheDocument()
  })

  it('says it is working once the wait is noticeable', () => {
    vi.useFakeTimers()
    render(<LoadingScreen />)
    advance(500)
    expect(screen.getByText('Loading your dashboard…')).toBeInTheDocument()
  })

  it('admits something is wrong, and offers the reload people were already doing', () => {
    vi.useFakeTimers()
    render(<LoadingScreen />)
    advance(9500)
    expect(screen.getByText('Still loading…')).toBeInTheDocument()
    expect(screen.getByText(/connection may have dropped/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })

  it('is announced, so it is not silence to a screen reader either', () => {
    vi.useFakeTimers()
    render(<LoadingScreen />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })
})
