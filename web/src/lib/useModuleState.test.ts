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

  it('does not rewind past a newer write when an earlier one fails', async () => {
    // Writes fire per keystroke, so several are normally in flight at once.
    // An earlier failure must not discard the keystrokes that landed after it:
    // rewinding the ref there makes the next save persist truncated text.
    H.getModuleData.mockResolvedValue([{ id: 'a', body: 'h' }])
    let failFirst: (e: Error) => void = () => {}
    H.setModuleData
      .mockImplementationOnce(() => new Promise((_, rej) => { failFirst = rej }))
      .mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useModuleData<Row>('essays', 'drafts', true))
    await waitFor(() => expect(result.current.data).toHaveLength(1))

    let firstSave: Promise<boolean> = Promise.resolve(true)
    act(() => { firstSave = result.current.saveData([{ id: 'a', body: 'he' }]) })
    act(() => { result.current.saveData([{ id: 'a', body: 'hel' }]) })

    await act(async () => {
      failFirst(new Error('offline'))
      await expect(firstSave).resolves.toBe(false)
    })

    // The newer keystroke survives; only a stale rollback would show 'h'.
    expect(result.current.dataRef.current).toEqual([{ id: 'a', body: 'hel' }])
    expect(result.current.data).toEqual([{ id: 'a', body: 'hel' }])
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
