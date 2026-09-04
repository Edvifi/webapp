import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const H = vi.hoisted(() => ({
  getModuleData: vi.fn(),
  setModuleData: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('./moduleProgress', () => ({
  getModuleChecklistProgress: vi.fn().mockResolvedValue({}),
  setModuleChecklistItem: vi.fn().mockResolvedValue(undefined),
  getModuleData: H.getModuleData,
  setModuleData: H.setModuleData,
}))

import { useModuleData } from './useModuleState'

type Row = { id: string; body: string }

describe('useModuleData', () => {
  it('updates dataRef synchronously on save so back-to-back read-modify-writes compose', async () => {
    H.getModuleData.mockResolvedValue([{ id: 'a', body: 'one' }])
    const { result } = renderHook(() => useModuleData<Row>('essays', 'drafts', true))
    await waitFor(() => expect(result.current.data).toHaveLength(1))

    // Two saves in the same tick, each derived from the ref — the shape of an
    // editor keystroke landing while an async feedback response is applied.
    act(() => {
      result.current.saveData([...result.current.dataRef.current, { id: 'b', body: 'two' }])
      result.current.saveData([...result.current.dataRef.current, { id: 'c', body: 'three' }])
    })

    expect(result.current.data.map((d) => d.id)).toEqual(['a', 'b', 'c'])
    expect(result.current.dataRef.current.map((d) => d.id)).toEqual(['a', 'b', 'c'])
    expect(H.setModuleData).toHaveBeenLastCalledWith('essays', 'drafts', [
      { id: 'a', body: 'one' }, { id: 'b', body: 'two' }, { id: 'c', body: 'three' },
    ])
  })

  it('resolves true when the write persists', async () => {
    H.getModuleData.mockResolvedValue([])
    H.setModuleData.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useModuleData<Row>('essays', 'drafts', true))
    await waitFor(() => expect(result.current.data).toEqual([]))
    await act(async () => {
      await expect(result.current.saveData([{ id: 'a', body: 'one' }])).resolves.toBe(true)
    })
  })

  it('resolves false and rolls back both state and ref when the write fails', async () => {
    H.getModuleData.mockResolvedValue([{ id: 'a', body: 'one' }])
    H.setModuleData.mockRejectedValueOnce(new Error('offline'))
    const { result } = renderHook(() => useModuleData<Row>('essays', 'drafts', true))
    await waitFor(() => expect(result.current.data).toHaveLength(1))

    // A caller holding an expensive-to-regenerate value (AI feedback) must be
    // able to see that the save did not stick.
    await act(async () => {
      await expect(result.current.saveData([{ id: 'a', body: 'edited' }])).resolves.toBe(false)
    })
    expect(result.current.data).toEqual([{ id: 'a', body: 'one' }])
    expect(result.current.dataRef.current).toEqual([{ id: 'a', body: 'one' }])
  })
})
