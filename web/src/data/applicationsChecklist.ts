import type { AdmissionBand } from '../lib/collegeMatch'

export type ApplicationsItemType = 'article' | 'task' | 'resource'

export interface ApplicationsChecklistItem {
  id: string
  label: string
  type: ApplicationsItemType
}

export interface ApplicationsChecklistSection {
  title: string
  items: ApplicationsChecklistItem[]
}

export const APPLICATIONS_CHECKLIST: ApplicationsChecklistSection[] = [
  {
    title: 'Building Your College List',
    items: [
      { id: 'bl-1', label: 'How to research colleges that fit you', type: 'article' },
      { id: 'bl-2', label: 'Reach, match, and safety — the balanced list', type: 'article' },
      { id: 'bl-3', label: 'Major considerations: undecided is fine', type: 'article' },
      { id: 'bl-4', label: 'Build your college list (8-12 schools)', type: 'task' },
    ],
  },
  {
    title: 'Application Strategy',
    items: [
      { id: 'as-1', label: 'ED, EA, REA, and RD — what each one means', type: 'article' },
      { id: 'as-2', label: 'Should you apply early decision?', type: 'article' },
      { id: 'as-3', label: 'Common App vs. Coalition App vs. school-specific', type: 'article' },
      { id: 'as-4', label: 'Set up your Common App account', type: 'task' },
    ],
  },
  {
    title: 'Submission Workflow',
    items: [
      { id: 'sw-1', label: 'Request teacher recommendations (give 3+ weeks)', type: 'task' },
      { id: 'sw-2', label: 'Send official transcripts (counselor handles this)', type: 'task' },
      { id: 'sw-3', label: 'Application fees & fee waivers', type: 'article' },
      { id: 'sw-4', label: 'Final-week pre-submit checklist', type: 'resource' },
    ],
  },
  {
    title: 'After You Submit',
    items: [
      { id: 'au-1', label: 'Set up applicant portals at every school', type: 'task' },
      { id: 'au-2', label: 'When to expect decisions (timeline)', type: 'article' },
      { id: 'au-3', label: 'Comparing offers and the May 1 decision', type: 'article' },
    ],
  },
]

export const APPLICATIONS_TOTAL_ITEMS = APPLICATIONS_CHECKLIST.reduce(
  (a, s) => a + s.items.length,
  0,
)

export const APPLICATIONS_ALL_IDS = APPLICATIONS_CHECKLIST.flatMap((s) => s.items.map((i) => i.id))

/* ─── Application status workflow ─── */

export type AppStatus =
  | 'not-started'
  | 'in-progress'
  | 'submitted'
  | 'accepted'
  | 'waitlisted'
  | 'rejected'
  | 'deferred'
  | 'withdrawn'

export interface AppStatusMeta {
  label: string
  color: string
  bg: string
  isDecision: boolean
}

export const APP_STATUS_META: Record<AppStatus, AppStatusMeta> = {
  'not-started':  { label: 'Not started',  color: '#7A6D5C', bg: '#EBE5DA', isDecision: false },
  'in-progress':  { label: 'In progress',  color: '#C47A12', bg: '#FFF3E0', isDecision: false },
  'submitted':    { label: 'Submitted',    color: '#1D7FC4', bg: '#E8EEF5', isDecision: false },
  'accepted':     { label: 'Accepted',     color: '#2D9E72', bg: '#EBF5F0', isDecision: true },
  'waitlisted':   { label: 'Waitlisted',   color: '#7048C8', bg: '#EDEAF7', isDecision: true },
  'deferred':     { label: 'Deferred',     color: '#7048C8', bg: '#EDEAF7', isDecision: true },
  'rejected':     { label: 'Rejected',     color: '#B93A3A', bg: '#FAEAEA', isDecision: true },
  'withdrawn':    { label: 'Withdrawn',    color: '#7A6D5C', bg: '#EBE5DA', isDecision: true },
}

export type AppCategory = 'reach' | 'match' | 'safety' | 'unranked'

export const CATEGORY_META: Record<AppCategory, { label: string; color: string }> = {
  reach:    { label: 'Reach',    color: '#B93A3A' },
  match:    { label: 'Match',    color: '#1D7FC4' },
  safety:   { label: 'Safety',   color: '#2D9E72' },
  unranked: { label: 'Unranked', color: '#7A6D5C' },
}

/**
 * Admission band → the color of the list category it becomes when a school is
 * added (reach red, target → match blue, likely/open → safety green). Shared
 * by the Discover card pill and the detail popup so the two can't drift.
 */
export const BAND_COLOR: Record<AdmissionBand, string> = {
  open: CATEGORY_META.safety.color,
  likely: CATEGORY_META.safety.color,
  target: CATEGORY_META.match.color,
  reach: CATEGORY_META.reach.color,
  unknown: '#8C7E6A',
}

export type AppDeadlineType = 'ED' | 'EA' | 'REA' | 'RD' | 'Rolling'

export const DEADLINE_TYPES: AppDeadlineType[] = ['ED', 'EA', 'REA', 'RD', 'Rolling']

export interface ApplicationEntry {
  collegeId: string
  category: AppCategory
  deadlineType: AppDeadlineType
  status: AppStatus
  notes?: string
  /** Snapshot for colleges added from the Discover tab (DB-sourced, not in the
   *  static collegeData set). Lets the list render them without a lookup. */
  name?: string
  subtitle?: string
  source?: 'scorecard'
  /** Location snapshot (captured at add-time) so the list map can place a
   *  pin without a DB lookup. state/city also feed the map tooltip. */
  state?: string | null
  city?: string | null
  mapX?: number | null
  mapY?: number | null
  /** Display snapshot for logos + type chip on the list / status rows. */
  website?: string | null
  ownership?: string | null
  /** '4yr' | '2yr' | 'trade' — drives which default application tasks apply. */
  institutionType?: string | null
  /** Per-school application to-do list (seeded from a smart default, then edited). */
  tasks?: AppTask[]
}

export type TaskPhase = 'before' | 'submit' | 'after'

export interface AppTask {
  id: string
  label: string
  done: boolean
  phase: TaskPhase
  /** true for user-added tasks (removable); default tasks are custom=false. */
  custom?: boolean
  /**
   * The student's own due date for this task, as an ISO `YYYY-MM-DD` day.
   *
   * Distinct from the college's application deadline, which is derived and
   * cannot be edited. This is the date they decided to have recommendations
   * asked for, or the essay drafted — usually earlier, and the one they
   * actually need reminding about. Dated tasks appear on the calendar, the
   * week strip and the deadline panel like anything else.
   */
  due?: string
}
