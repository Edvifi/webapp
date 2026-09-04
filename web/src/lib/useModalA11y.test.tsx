import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useModalA11y } from './useModalA11y'

/** Minimal stand-in for the real dialogs: a container plus three controls. */
function Dialog({ onClose }: { onClose: () => void }) {
  const ref = useModalA11y<HTMLDivElement>(onClose)
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Test dialog" tabIndex={-1}>
      <button>first</button>
      <button>middle</button>
      <button>last</button>
    </div>
  )
}

/** Wraps the dialog behind a trigger, so focus restoration can be observed. */
function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>open</button>
      {open && <Dialog onClose={() => { onClose(); setOpen(false) }} />}
    </>
  )
}

describe('useModalA11y', () => {
  it('moves focus to the dialog container on open', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByText('open'))
    // The container, not the first button — so screen readers announce the
    // dialog's label rather than opening on a control.
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
  })

  it('restores focus to the trigger on close', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const trigger = screen.getByText('open')
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(document.activeElement).toBe(trigger)
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await user.click(screen.getByText('open'))
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('wraps Tab from the last control back to the first', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByText('open'))
    screen.getByText('last').focus()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByText('first'))
  })

  it('wraps Shift+Tab from the first control to the last', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByText('open'))
    screen.getByText('first').focus()
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(screen.getByText('last'))
  })

  it('pulls focus back in when it has escaped the dialog', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByText('open'))
    // Focus sitting outside the dialog (e.g. the browser chrome returned it
    // to body) must not let Tab walk further away.
    ;(document.body as HTMLElement).focus()
    await user.tab()
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  })
})
