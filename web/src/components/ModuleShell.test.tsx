import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ModuleShell from './ModuleShell'

describe('ModuleShell Escape', () => {
  it('leaves Escape in a field to the field, steps back out of an open page, else closes', () => {
    const onClose = vi.fn()
    const onBack = vi.fn()
    const { rerender } = render(
      <ModuleShell open onClose={onClose} breadcrumbLabel="Application Tracking" tabLabel="Application Status" pageLabel="Ohio Wesleyan University" onBack={onBack}>
        <select aria-label="Application status"><option>Submitted</option></select>
      </ModuleShell>,
    )
    // On a school's page, from the status dropdown: closed the whole module.
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Application status' }), { key: 'Escape' })
    expect(onBack).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()

    rerender(<ModuleShell open onClose={onClose} breadcrumbLabel="Application Tracking" tabLabel="Application Status"><div /></ModuleShell>)
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
