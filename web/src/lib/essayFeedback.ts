/**
 * Essay feedback — client for the `essay-feedback` edge function.
 *
 * Sends a draft to Claude (server-side; the API key never reaches the
 * browser) and returns structured, rubric-style feedback. The function
 * resolves the session JWT to a signed-in user and enforces a per-user daily
 * cap, so every failure path here maps to a message a student can act on.
 */

import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { EssayDraft } from '../data/essaysChecklist'

export type FeedbackArea =
  | 'structure'
  | 'voice'
  | 'specificity'
  | 'clarity'
  | 'prompt-fit'
  | 'length'

export interface EssayFeedback {
  summary: string
  strengths: Array<{ point: string; evidence: string }>
  improvements: Array<{ area: FeedbackArea; issue: string; suggestion: string }>
  next_steps: string[]
}

export const FEEDBACK_AREA_LABELS: Record<FeedbackArea, string> = {
  structure: 'Structure',
  voice: 'Voice',
  specificity: 'Specificity',
  clarity: 'Clarity',
  'prompt-fit': 'Prompt fit',
  length: 'Length',
}

/** Minimum words before the server will accept a feedback request. */
export const FEEDBACK_MIN_WORDS = 30

/**
 * Give up waiting on the function after this long — the UI never spins forever.
 *
 * Deliberately longer than the function's own worst case (a 90s model deadline
 * plus auth and two database round trips). If the client gave up first, a slow
 * request that the server ultimately completed would be billed and counted
 * against the student's daily quota while they were told it timed out.
 */
export const FEEDBACK_TIMEOUT_MS = 120_000

interface FeedbackResponse {
  feedback?: unknown
  error?: unknown
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Runtime guard for feedback coming back from the function *or* read out of a
 * persisted draft (`draft.feedback` is stored as `unknown`). Rendering only
 * ever sees a value that passed this, so a malformed or legacy blob can't
 * crash the editor.
 */
export function isEssayFeedback(v: unknown): v is EssayFeedback {
  if (!isRecord(v)) return false
  if (typeof v.summary !== 'string') return false
  if (!Array.isArray(v.strengths) || !v.strengths.every(
    (s) => isRecord(s) && typeof s.point === 'string' && typeof s.evidence === 'string',
  )) return false
  if (!Array.isArray(v.improvements) || !v.improvements.every(
    (i) => isRecord(i) && typeof i.area === 'string' && typeof i.issue === 'string' && typeof i.suggestion === 'string',
  )) return false
  if (!Array.isArray(v.next_steps) || !v.next_steps.every((s) => typeof s === 'string')) return false
  return true
}

export async function getEssayFeedback(
  draft: EssayDraft,
  opts: { signal?: AbortSignal } = {},
): Promise<EssayFeedback> {
  const { data, error } = await supabase.functions.invoke<FeedbackResponse>('essay-feedback', {
    body: {
      essay: draft.body,
      prompt: draft.prompt || undefined,
      title: draft.title || undefined,
      wordTarget: draft.wordTarget || undefined,
      draftId: draft.id,
    },
    signal: opts.signal ?? timeoutSignal(FEEDBACK_TIMEOUT_MS),
  })
  if (error) throw await toUserError(error)
  if (typeof data?.error === 'string' && data.error) throw new Error(data.error)
  if (!isEssayFeedback(data?.feedback)) throw new Error('Feedback came back malformed — try again.')
  return data.feedback
}

/**
 * supabase-js wraps every failure in a `Functions*Error`; unwrap it into a
 * message for the student. The function's own `{ error }` body wins when
 * present (quota, sign-in, validation), then fall back by status / cause.
 */
async function toUserError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response | undefined
    try {
      const body = (await res?.json()) as { error?: unknown } | undefined
      if (typeof body?.error === 'string' && body.error) return new Error(body.error)
    } catch {
      /* non-JSON body — fall through to the status-based message */
    }
    if (res?.status === 401) return new Error('Sign in to request feedback.')
    if (res?.status === 429) return new Error("You've hit the feedback limit for now — try again later.")
    return new Error('Feedback failed — try again.')
  }
  if (error instanceof FunctionsFetchError) {
    const cause = error.context as { name?: string } | undefined
    if (cause?.name === 'AbortError' || cause?.name === 'TimeoutError') {
      return new Error('Feedback timed out — try again.')
    }
    return new Error("Couldn't reach the feedback service — check your connection and try again.")
  }
  if (error instanceof FunctionsRelayError) {
    return new Error('The feedback service is unavailable right now — try again shortly.')
  }
  return error instanceof Error ? error : new Error('Feedback failed — try again.')
}

function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms)
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}
