import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'

const H = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: { functions: { invoke: H.invoke } } }))

import { getEssayFeedback, isEssayFeedback, type EssayFeedback } from './essayFeedback'
import type { EssayDraft } from '../data/essaysChecklist'

const draft: EssayDraft = {
  id: 'essay-1', title: 'Why us', prompt: 'Tell us why.', schools: '', wordTarget: 650,
  status: 'draft', body: 'word '.repeat(40).trim(), updatedAt: 0,
}

const good: EssayFeedback = {
  summary: 'Strong start.',
  strengths: [{ point: 'Vivid opening', evidence: 'the first line' }],
  improvements: [{ area: 'voice', issue: 'Generic middle', suggestion: 'Add a detail' }],
  next_steps: ['Cut paragraph two'],
}

describe('isEssayFeedback', () => {
  it('accepts the function\'s schema', () => {
    expect(isEssayFeedback(good)).toBe(true)
  })
  it('rejects anything that would crash the panel', () => {
    expect(isEssayFeedback(undefined)).toBe(false)
    expect(isEssayFeedback('nope')).toBe(false)
    expect(isEssayFeedback({ ...good, strengths: 'x' })).toBe(false)
    expect(isEssayFeedback({ ...good, improvements: [{ area: 'voice' }] })).toBe(false)
    expect(isEssayFeedback({ ...good, next_steps: [1] })).toBe(false)
    expect(isEssayFeedback({ ...good, summary: undefined })).toBe(false)
  })
})

describe('getEssayFeedback', () => {
  beforeEach(() => H.invoke.mockReset())

  it('posts the draft (including its id) with a timeout signal and returns validated feedback', async () => {
    H.invoke.mockResolvedValue({ data: { feedback: good }, error: null })
    await expect(getEssayFeedback(draft)).resolves.toEqual(good)
    const [name, opts] = H.invoke.mock.calls[0]
    expect(name).toBe('essay-feedback')
    expect(opts.body).toEqual({ essay: draft.body, prompt: 'Tell us why.', title: 'Why us', wordTarget: 650, draftId: 'essay-1' })
    expect(opts.signal).toBeInstanceOf(AbortSignal)
  })

  it('surfaces the function\'s own error message on a non-2xx response', async () => {
    const res = new Response(JSON.stringify({ error: "You've used all 10 feedback requests" }), { status: 429 })
    H.invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(res) })
    await expect(getEssayFeedback(draft)).rejects.toThrow("You've used all 10 feedback requests")
  })

  it('falls back to a status-based message when the body is not JSON', async () => {
    H.invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(new Response('Unauthorized', { status: 401 })) })
    await expect(getEssayFeedback(draft)).rejects.toThrow('Sign in to request feedback.')
  })

  it('maps an aborted request to a timeout message', async () => {
    H.invoke.mockResolvedValue({ data: null, error: new FunctionsFetchError(new DOMException('aborted', 'AbortError')) })
    await expect(getEssayFeedback(draft)).rejects.toThrow('Feedback timed out')
  })

  it('maps a relay failure to a service-unavailable message', async () => {
    H.invoke.mockResolvedValue({ data: null, error: new FunctionsRelayError(new Response('', { status: 502 })) })
    await expect(getEssayFeedback(draft)).rejects.toThrow('unavailable right now')
  })

  it('rejects a 200 whose payload does not match the schema', async () => {
    H.invoke.mockResolvedValue({ data: { feedback: { summary: 1 } }, error: null })
    await expect(getEssayFeedback(draft)).rejects.toThrow('malformed')
  })
})
