/**
 * Essay feedback — client for the `essay-feedback` edge function.
 *
 * Sends a draft to Claude (server-side; the API key never reaches the
 * browser) and returns structured, rubric-style feedback. The function
 * is JWT-verified, so only signed-in users can call it.
 */

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

export async function getEssayFeedback(draft: EssayDraft): Promise<EssayFeedback> {
  const { data, error } = await supabase.functions.invoke<{
    feedback?: EssayFeedback
    error?: string
  }>('essay-feedback', {
    body: {
      essay: draft.body,
      prompt: draft.prompt || undefined,
      title: draft.title || undefined,
      wordTarget: draft.wordTarget || undefined,
    },
  })
  if (error) {
    // supabase-js wraps non-2xx responses; surface the function's message when present
    const ctx = (error as { context?: Response }).context
    if (ctx) {
      try {
        const body = (await ctx.json()) as { error?: string }
        if (body?.error) throw new Error(body.error)
      } catch (e) {
        if (e instanceof Error && e.message && !/JSON/.test(e.message)) throw e
      }
    }
    throw error
  }
  if (data?.error) throw new Error(data.error)
  if (!data?.feedback) throw new Error('Empty response from feedback service')
  return data.feedback
}
