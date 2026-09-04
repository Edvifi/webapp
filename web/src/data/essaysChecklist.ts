export type EssaysItemType = 'article' | 'task' | 'resource'

export interface EssaysChecklistItem {
  id: string
  label: string
  type: EssaysItemType
}

export interface EssaysChecklistSection {
  title: string
  items: EssaysChecklistItem[]
}

export const ESSAYS_CHECKLIST: EssaysChecklistSection[] = [
  {
    title: 'Personal Statement (Common App)',
    items: [
      { id: 'ps-1', label: 'Common App prompts — picking one', type: 'article' },
      { id: 'ps-2', label: 'Brainstorming a story (60-min exercise)', type: 'task' },
      { id: 'ps-3', label: 'Personal statement structure that works', type: 'article' },
      { id: 'ps-4', label: 'The opening hook — what works, what doesn\'t', type: 'article' },
      { id: 'ps-5', label: 'Common pitfalls to avoid', type: 'article' },
    ],
  },
  {
    title: 'Supplemental Essays',
    items: [
      { id: 'su-1', label: '"Why this college" — the right way', type: 'article' },
      { id: 'su-2', label: '"Why this major" — making it specific', type: 'article' },
      { id: 'su-3', label: 'Diversity / community / identity essays', type: 'article' },
      { id: 'su-4', label: 'Short-take supplements (250 words or less)', type: 'article' },
    ],
  },
  {
    title: 'Process & Feedback',
    items: [
      { id: 'pf-1', label: 'Drafting timeline — when to start what', type: 'article' },
      { id: 'pf-2', label: 'Who should read your essays (and who shouldn\'t)', type: 'article' },
      { id: 'pf-3', label: 'Revising vs. polishing — knowing the difference', type: 'article' },
    ],
  },
]

export const ESSAYS_TOTAL_ITEMS = ESSAYS_CHECKLIST.reduce((a, s) => a + s.items.length, 0)
export const ESSAYS_ALL_IDS = ESSAYS_CHECKLIST.flatMap((s) => s.items.map((i) => i.id))

/* ─── Essay drafts ─── */

export type EssayStatus = 'draft' | 'revising' | 'final'

export interface EssayDraft {
  id: string
  title: string
  prompt: string
  schools: string  // free-form, e.g., "Common App" or "Yale, Stanford"
  wordTarget: number
  status: EssayStatus
  body: string
  updatedAt: number
  /** Last AI feedback for this draft (shape defined in lib/essayFeedback.ts —
   *  kept as unknown here so the data layer stays UI-agnostic). */
  feedback?: unknown
  /** When feedback was generated, and the word count it was based on. */
  feedbackAt?: number
  feedbackWordCount?: number
}

export const ESSAY_STATUS_META: Record<EssayStatus, { label: string; color: string; bg: string }> = {
  draft:    { label: 'Draft',    color: '#7A6D5C', bg: '#EBE5DA' },
  revising: { label: 'Revising', color: '#C47A12', bg: '#FFF3E0' },
  final:    { label: 'Final',    color: '#2D9E72', bg: '#EBF5F0' },
}

/* ─── Common App + popular prompts (for quick-start) ─── */

export const COMMON_APP_PROMPTS_2026: Array<{ id: string; text: string }> = [
  { id: 'ca-1', text: 'Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, then please share your story.' },
  { id: 'ca-2', text: 'The lessons we take from obstacles we encounter can be fundamental to later success. Recount a time when you faced a challenge, setback, or failure. How did it affect you, and what did you learn from the experience?' },
  { id: 'ca-3', text: 'Reflect on a time when you questioned or challenged a belief or idea. What prompted your thinking? What was the outcome?' },
  { id: 'ca-4', text: 'Reflect on something that someone has done for you that has made you happy or thankful in a surprising way. How has this gratitude affected or motivated you?' },
  { id: 'ca-5', text: 'Discuss an accomplishment, event, or realization that sparked a period of personal growth and a new understanding of yourself or others.' },
  { id: 'ca-6', text: 'Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time. Why does it captivate you?' },
  { id: 'ca-7', text: 'Share an essay on any topic of your choice. It can be one you\'ve already written, one that responds to a different prompt, or one of your own design.' },
]
