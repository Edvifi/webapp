/**
 * The checklist's two failure paths. Both used to be silent, and both look to
 * a student like their work vanished rather than like a dropped connection.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const H = vi.hoisted(() => ({
  getProgress: vi.fn(), setItem: vi.fn(), error: vi.fn(),
}))
vi.mock('./moduleProgress', () => ({
  getModuleChecklistProgress: H.getProgress,
  setModuleChecklistItem: H.setItem,
  getModuleData: vi.fn().mockResolvedValue(null),
  setModuleData: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ error: H.error, success: vi.fn(), info: vi.fn() }),
}))

import { useModuleChecklist } from './useModuleState'

describe('useModuleChecklist', () => {
  beforeEach(() => {
    H.getProgress.mockReset().mockResolvedValue({ a: 'available' })
    H.setItem.mockReset().mockResolvedValue(undefined)
    H.error.mockReset()
  })

  it('says so when progress will not load', async () => {
    // Otherwise the list renders empty and reads as "none of my work saved",
    // which invites redoing it.
    H.getProgress.mockRejectedValue(new Error('offline'))
    renderHook(() => useModuleChecklist('essays', true))
    await waitFor(() => expect(H.error).toHaveBeenCalledWith(expect.stringContaining('progress')))
  })

  it('stays quiet when the load works', async () => {
    const { result } = renderHook(() => useModuleChecklist('essays', true))
    await waitFor(() => expect(result.current.progress).toEqual({ a: 'available' }))
    expect(H.error).not.toHaveBeenCalled()
  })

  it('loads nothing, and says nothing, while the module is closed', () => {
    renderHook(() => useModuleChecklist('essays', false))
    expect(H.getProgress).not.toHaveBeenCalled()
    expect(H.error).not.toHaveBeenCalled()
  })

  it('says so when a tick will not save, and rolls it back', async () => {
    H.setItem.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useModuleChecklist('essays', true))
    await waitFor(() => expect(result.current.progress.a).toBe('available'))

    await act(async () => { result.current.handleToggle('a') })

    // Without the message the box simply refuses to stay ticked.
    await waitFor(() => expect(H.error).toHaveBeenCalledWith(expect.stringContaining("Couldn't save")))
    expect(result.current.progress.a).toBe('available')
  })

  it('keeps a successful tick without complaining', async () => {
    const { result } = renderHook(() => useModuleChecklist('essays', true))
    await waitFor(() => expect(result.current.progress.a).toBe('available'))

    await act(async () => { result.current.handleToggle('a') })
    await waitFor(() => expect(result.current.progress.a).toBe('in-progress'))
    expect(H.error).not.toHaveBeenCalled()
  })
})
