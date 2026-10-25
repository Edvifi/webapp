import { useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from 'react'
import { parseCollegeDate, formatCollegeDate, parseRecurringDeadline, scholarshipDeadlineState, seniorFallYear, daysLabel, fafsaOpening, inStudentCycle, deriveScholarshipEvents, urgencyColor, roughDuration, type DeadlineEvent } from '../data/applicationDeadlines'
import { useModuleData, useModuleValue } from '../lib/useModuleState'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { markIntroSeen } from '../lib/profiles'
import { useApplications } from '../contexts/ApplicationsContext'
import FafsaModuleTour from './FafsaModuleTour'
import Celebration from './Celebration'
import DeadlineTimeline, { type TimelineItem } from './DeadlineTimeline'
import { DateBlock } from './ApplicationStatusTab'
import { TaskDueInput } from './SchoolApplicationPage'
import { TASK_PHASES } from '../data/applicationTasks'
import type { AppTask } from '../data/applicationsChecklist'
import { scholarshipTasks, ownTasks, isSharedScholarshipTask, isOpenStatus, sharedScholarshipSummary, needsEssay } from '../data/scholarshipTasks'
import { DEFAULT_AID_PREFS, INTEREST_OPTIONS, fitsAidPrefs, interestTags, type AidPrefs } from '../lib/aidPrefs'
import IngestionHealthPanel from './IngestionHealthPanel'
import {
  getScholarship,
  getTrackerItems,
  addTrackerItem,
  updateTrackerStatus,
  updateTrackerItem,
  removeTrackerItem,
  getTrackerNotes,
  updateTrackerNotes,
  getChecklistProgress,
  setChecklistItem,
  demographicTagsForProfile,
  getAllScholarshipsScored,
  scholarshipDaysLeft,
  scholarshipAwardValueCents,
  scholarshipMatchReasons,
  AWARD_MINIMUMS,
  parseIncomeToRange,
  parseGpa,
  getCollegeList,
  setCollegeList as saveCollegeList,
  type Scholarship,
  type TrackerItem as DBTrackerItem,
  type TrackerStatus as DBTrackerStatus,
  type TrackerType as DBTrackerType,
  type NewTrackerInput,
  type TrackerEdit,
  type ChecklistProgressMap,
  type ChecklistItemStatus,
  type ScoredScholarship,
  type ScholarshipMatchScore,
  parseTrackerAmount,
  inferScholarshipType,
} from '../lib/fafsaData'
import { ListFailed, ListLoading, UnresolvedNotice } from './AidCompare'
import { supabase } from '../lib/supabase'
import type { Demographics } from '../types/user'
import { CHECKLIST_CONTENT_MAP } from '../data/checklistContent'
import { searchAidColleges, type AidCollege } from '../lib/aidColleges'
import { useAidColleges, type AidCollegesState } from '../lib/useAidColleges'
import { C, YEARS, MODULE_COLORS, EASE_OUT } from '../lib/designTokens'
import { useIsNarrow } from '../lib/useMediaQuery'
import ChecklistContentView from './ChecklistContentView'
import AidGuideSections, { type AidGuideDestination, type GuideRowId } from './AidGuideSections'
import { grantStateFromZip, guaranteeLabel, type GrantState } from '../data/aidPrograms'
import { Bar, CollegeLogo, SecLabel, Tag } from './moduleUI'
import { logoUrlForDomain } from '../lib/collegeLogo'
import { routedTab, useRoutedTab } from '../lib/hashRoute'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const MC = MODULE_COLORS.financialAid

/* ═══════════════════════════════════════════════════════════════
   STATIC DATA (mockup placeholders; future work swaps these to Supabase)
   ═══════════════════════════════════════════════════════════════ */
type ChecklistItemType = 'article' | 'quiz' | 'assignment' | 'task' | 'resource'

interface ChecklistItem {
  id: string
  label: string
  type: ChecklistItemType
}

interface ChecklistSection {
  title: string
  items: ChecklistItem[]
}

const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    title: 'Understanding Aid Types',
    items: [
      { id: 'at-1', label: 'Grants vs. loans vs. work-study', type: 'article' },
      { id: 'at-2', label: 'Federal vs. institutional vs. private aid', type: 'article' },
      { id: 'at-3', label: 'How Expected Family Contribution (EFC) is calculated', type: 'article' },
      { id: 'at-4', label: 'Quiz: Financial aid fundamentals', type: 'quiz' },
    ],
  },
  {
    title: 'FAFSA Preparation',
    items: [
      { id: 'fp-1', label: 'What is FAFSA and why every student should file', type: 'article' },
      { id: 'fp-2', label: "Documents you'll need: FSA ID, tax returns, bank statements", type: 'resource' },
      { id: 'fp-3', label: 'Create your FSA ID (takes time to process)', type: 'task' },
      { id: 'fp-4', label: 'FAFSA filing timeline and deadlines by school', type: 'article' },
      { id: 'fp-5', label: 'CSS Profile: who needs it and how it differs', type: 'article' },
    ],
  },
  {
    title: 'Scholarship Research',
    items: [
      { id: 'sr-1', label: 'How to find scholarships you actually qualify for', type: 'article' },
      { id: 'sr-2', label: 'Build your scholarship tracker', type: 'assignment' },
      { id: 'sr-3', label: 'Local vs. national scholarships: where to start', type: 'article' },
      { id: 'sr-4', label: 'Identify 10 scholarships to apply to senior year', type: 'task' },
    ],
  },
  {
    title: 'Net Price Calculators',
    items: [
      { id: 'npc-1', label: 'What a net price calculator tells you', type: 'article' },
      { id: 'npc-2', label: 'Run NPC for 3 schools on your list', type: 'task' },
      { id: 'npc-3', label: 'Worksheet: Compare estimated costs across schools', type: 'assignment' },
    ],
  },
]

const CHECKLIST_TOTAL_ITEMS = CHECKLIST_SECTIONS.reduce((a, s) => a + s.items.length, 0)
const CHECKLIST_ALL_IDS = CHECKLIST_SECTIONS.flatMap((s) => s.items.map((i) => i.id))

function nextChecklistStatus(current: ChecklistItemStatus): ChecklistItemStatus {
  if (current === 'available') return 'in-progress'
  if (current === 'in-progress') return 'completed'
  return 'available'
}

type ScholarshipType = DBTrackerType

const SCHOLARSHIP_STATUSES: DBTrackerStatus[] = ['researching', 'planning', 'ready', 'submitted', 'awarded']
const STATUS_META: Record<DBTrackerStatus, { label: string; color: string; bg: string }> = {
  researching: { label: 'Researching', color: '#7048C8', bg: '#EDEAF7' },
  planning: { label: 'Planning', color: '#C47A12', bg: '#F5EDE5' },
  ready: { label: 'Ready to Apply', color: '#1D7FC4', bg: '#E8EEF5' },
  submitted: { label: 'Submitted', color: '#2D9E72', bg: '#EBF5F0' },
  awarded: { label: 'Awarded 🎉', color: '#2D9E72', bg: '#EBF5F0' },
}

/* ═══════════════════════════════════════════════════════════════
   DEADLINE URGENCY HELPERS
   ═══════════════════════════════════════════════════════════════ */

function parseDeadlineDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === 'Rolling' || dateStr.length < 5) return null
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

function daysUntil(dateStr: string): number | null {
  const d = parseDeadlineDate(dateStr)
  if (!d) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / 86400000)
}

/** The school's dates in the student's own cycle, as the calendar has them.
 *  Stored ones are this cycle's, which made a junior's "Act Now". */
function inCycle(c: AidCollege, seniorFall: number): AidCollege {
  const s = (v: string | null) => inStudentCycle(v, seniorFall)
  const a = c.applicationDeadlines
  const f = c.financialAidDeadlines
  return {
    ...c,
    applicationDeadlines: { ...a, earlyAction: s(a.earlyAction), earlyDecision: s(a.earlyDecision), regularDecision: s(a.regularDecision) },
    financialAidDeadlines: { ...f, fafsaPriority: s(f.fafsaPriority), cssProfile: s(f.cssProfile) },
  }
}

function computeUrgency(college: AidCollege): 'high' | 'medium' | 'low' {
  const allDates = [
    college.applicationDeadlines.earlyAction,
    college.applicationDeadlines.earlyDecision,
    college.applicationDeadlines.regularDecision,
    college.financialAidDeadlines.fafsaPriority,
    college.financialAidDeadlines.cssProfile,
  ].filter(Boolean) as string[]

  let minDays = Infinity
  for (const ds of allDates) {
    const d = daysUntil(ds)
    if (d !== null && d >= 0 && d < minDays) minDays = d
  }

  if (minDays <= 30) return 'high'
  if (minDays <= 90) return 'medium'
  return 'low'
}

function computeDaysNote(college: AidCollege): string {
  if (college.meetsFullNeed && college.noLoanPolicy) return 'Meets 100% need, no-loan policy'
  if (college.meetsFullNeed) return 'Meets 100% of demonstrated need'
  const rd = college.applicationDeadlines.regularDecision
  if (rd === null) return ''
  const d = daysUntil(rd)
  if (d !== null && d >= 0) return `~${d} days until app deadline`
  if (rd === 'Rolling') return 'Rolling admissions'
  return ''
}

function formatScholarshipAmount(s: Scholarship): string {
  if (s.award_amount_cents && s.award_amount_cents > 0) {
    const d = s.award_amount_cents / 100
    if (d >= 1000) return `$${(d / 1000).toFixed(d % 1000 === 0 ? 0 : 1)}K`
    return `$${d.toFixed(0)}`
  }
  return s.award_amount_note ?? 'Varies'
}

// Urgency badge from a scholarship's real/parsed deadline. Null = no badge.
const DEADLINE_URGENT = '#B93A3A'
const DEADLINE_SOON = '#B26A00'
const DEADLINE_CLOSED = '#8A8F98'
function deadlineBadge(
  s: Pick<Scholarship, 'deadline' | 'deadline_display'>,
  now?: Date,
): { label: string; color: string; closed: boolean } | null {
  const days = scholarshipDaysLeft(s, now)
  if (days == null) return null
  if (days < 0) return { label: 'Closed', color: DEADLINE_CLOSED, closed: true }
  if (days === 0) return { label: 'Due today', color: DEADLINE_URGENT, closed: false }
  if (days <= 7) return { label: `${days}d left`, color: DEADLINE_URGENT, closed: false }
  if (days <= 30) return { label: `${Math.ceil(days / 7)}w left`, color: DEADLINE_SOON, closed: false }
  if (days <= 90) return { label: `${Math.ceil(days / 30)}mo left`, color: C.textMuted, closed: false }
  return null
}

/** Scholarships the student marked "Not interested", hidden from the Aid Engine. */
interface Dismissals {
  ids: Set<string>
  dismiss: (s: Scholarship) => void
  restore: (id: string) => void
}

const chipStyle = (on: boolean) => ({
  padding: '3px 10px', borderRadius: 99, border: `1px solid ${on ? MC + '50' : C.border}`,
  background: on ? `${MC}12` : C.surface, color: on ? MC : C.textMuted,
  fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: on ? 600 : 400, cursor: 'pointer',
})

/** Shown once anything is hidden, and kept while viewing them so there is a way back. */
const HiddenToggle = ({ count, on, onToggle }: { count: number; on: boolean; onToggle: () => void }) =>
  count > 0 || on ? (
    <button onClick={onToggle} aria-pressed={on} style={chipStyle(on)}>
      {on ? '← Back to list' : `Hidden (${count})`}
    </button>
  ) : null

const DismissButton = ({ hidden, onClick }: { hidden: boolean; onClick: () => void }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick() }}
    style={{ padding: '4px 12px', borderRadius: 8, border: 'none', background: 'none', color: C.textFaint, fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
  >
    {hidden ? 'Restore' : 'Not interested'}
  </button>
)

/* ═══════════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════════ */
const I: Record<string, ReactNode> = {
  dashboard: <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="7" height="7" rx="1.5"/><rect x="11" y="2" width="7" height="4" rx="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5"/><rect x="11" y="8" width="7" height="10" rx="1.5"/></svg>,
  article: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="2" y="1.5" width="12" height="13" rx="1.5"/><line x1="5" y1="5" x2="11" y2="5"/><line x1="5" y1="7.5" x2="11" y2="7.5"/><line x1="5" y1="10" x2="9" y2="10"/></svg>,
  quiz: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M6.5 6.5a1.5 1.5 0 0 1 3 0c0 1-1.5 1.2-1.5 2.5"/><circle cx="8" cy="11.5" r="0.5" fill="currentColor"/></svg>,
  assignment: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 1.5H3.5A1.5 1.5 0 002 3v10a1.5 1.5 0 001.5 1.5h9A1.5 1.5 0 0014 13V6.5L9 1.5z"/><path d="M9 1.5V6.5H14"/></svg>,
  task: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5 8l2 2 4-4"/></svg>,
  resource: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10"/></svg>,
  check: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l3 3 5-5"/></svg>,
  chevron: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4l4 4-4 4"/></svg>,
  overview: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8l6-5.5L14 8"/><path d="M4 7v6.5h3V10h2v3.5h3V7"/></svg>,
  star: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><polygon points="8,1.5 10,6 14.5,6 11,9.5 12.5,14 8,11.5 3.5,14 5,9.5 1.5,6 6,6"/></svg>,
  cal: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="1.5"/><line x1="2" y1="7" x2="14" y2="7"/><line x1="5" y1="1.5" x2="5" y2="4.5"/><line x1="11" y1="1.5" x2="11" y2="4.5"/></svg>,
  plus: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="7" y1="2" x2="7" y2="12"/><line x1="2" y1="7" x2="12" y2="7"/></svg>,
  extlink: <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7"/><path d="M8 1h3v3"/><line x1="11" y1="1" x2="5.5" y2="6.5"/></svg>,
  info: <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><circle cx="7" cy="7" r="5.5"/><line x1="7" y1="6" x2="7" y2="10"/><circle cx="7" cy="4.5" r="0.5" fill="currentColor" stroke="none"/></svg>,
  trash: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,4 12,4"/><path d="M5 4V2.5h4V4"/><path d="M3 4l.8 8h6.4l.8-8"/></svg>,
  pencil: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2.5l2 2L5 11l-2.5.5L3 9z"/><path d="M8.5 3.5l2 2"/></svg>,
  sparkle: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M7 1v2m0 8v2M1 7h2m8 0h2M3.2 3.2l1.4 1.4m4.8 4.8l1.4 1.4M3.2 10.8l1.4-1.4m4.8-4.8l1.4-1.4"/><circle cx="7" cy="7" r="2"/></svg>,
  close: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>,
}

const itemIcon = (type: ChecklistItemType): ReactNode => I[type] || I.article

/* ═══════════════════════════════════════════════════════════════
   PRIMITIVES
   ═══════════════════════════════════════════════════════════════ */
const Ring = ({ status, color }: { status: ChecklistItemStatus; color: string }) => {
  if (status === 'completed') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: '#2D9E72', color: '#fff', flexShrink: 0 }}>{I.check}</span>
  )
  if (status === 'in-progress') return (
    // Started: half filled, standing still. It used to spin, which read as loading.
    <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: `2px solid ${color}`, background: `linear-gradient(90deg, ${color} 50%, transparent 50%)`, display: 'inline-block' }} />
  )
  return <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: '1.5px solid rgba(var(--line-rgb), 0.18)', display: 'inline-block' }} />
}

const Callout = ({ icon, title, body, color = MC, bg }: { icon: ReactNode; title?: string | null; body: ReactNode; color?: string; bg?: string }) => (
  <div style={{ padding: '12px 15px', borderRadius: 10, background: bg || `${color}0D`, border: `1px solid ${color}22`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
    <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{icon}</span>
    <div>
      {title && <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, color, marginBottom: 2 }}>{title}</div>}
      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text, lineHeight: 1.55 }}>{body}</div>
    </div>
  </div>
)

/* ═══════════════════════════════════════════════════════════════
   MODULE TAB NAV
   ═══════════════════════════════════════════════════════════════ */
// Aid Compare moved to Application Tracking, where it compares that list.
type TabId = 'overview' | 'scholarships' | 'scholarship-search' | 'deadlines'

const FA_TABS: Array<{ id: TabId; label: string; icon: ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: I.overview },
  { id: 'scholarship-search', label: 'Aid Engine', icon: I.sparkle },
  { id: 'scholarships', label: 'My Scholarships', icon: I.star },
  { id: 'deadlines', label: 'Deadlines', icon: I.cal },
]
const FA_TAB_IDS = FA_TABS.map((t) => t.id)

const ModuleTabNav = ({
  active,
  onTab,
  progress,
  onTour,
}: {
  active: TabId
  onTab: (id: TabId) => void
  progress: ChecklistProgressMap
  onTour?: () => void
}) => {
  const completed = Object.values(progress).filter((v) => v === 'completed').length
  const total = CHECKLIST_TOTAL_ITEMS
  const pct = total > 0 ? completed / total : 0
  return (
    <nav data-tour="sidebar" style={{ width: 188, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
      <div style={{ padding: '0 14px 18px', borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ fontSize: 24, marginBottom: 5, lineHeight: 1 }}>💰</div>
        <div style={{ fontFamily: "'Young Serif',serif", fontSize: 15, color: C.text, lineHeight: 1.3 }}>Financial Aid</div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: MC, fontWeight: 600, marginTop: 3 }}>Scholarship Hunt</div>
      </div>

      <div style={{ padding: '0 8px' }}>
        <SecLabel style={{ padding: '0 6px', marginBottom: 8 }}>Module Sections</SecLabel>
        {FA_TABS.map((tab) => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              data-tour={`tab-${tab.id}`}
              onClick={() => onTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', marginBottom: 2,
                border: 'none', borderRadius: 7, borderLeft: `2px solid ${isActive ? MC : 'transparent'}`,
                background: isActive ? C.bg : 'transparent',
                color: isActive ? C.text : C.textMuted,
                fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: isActive ? 600 : 400,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s ease',
              }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = C.surfaceHover }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <span style={{ opacity: isActive ? 1 : 0.5, display: 'flex', flexShrink: 0 }}>{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </div>

      <div style={{ margin: '16px 8px 0', padding: '12px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <SecLabel style={{ margin: 0 }}>Progress</SecLabel>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, color: MC }}>{Math.round(pct * 100)}%</span>
        </div>
        <Bar value={pct} color={MC} height={5} />
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, color: C.textFaint, marginTop: 5 }}>{completed} of {total} items done</div>
      </div>

      {onTour && (
        <button
          onClick={onTour}
          style={{
            margin: '12px 8px 0', padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'transparent', border: 'none', borderRadius: 7,
            fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted,
            cursor: 'pointer', transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.text }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.textMuted }}
        >
          💡 Guided tour
        </button>
      )}
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB: OVERVIEW
   ═══════════════════════════════════════════════════════════════ */
interface OverviewTabProps {
  aside?: ReactNode
  progress: ChecklistProgressMap
  onToggle: (itemId: string) => void
  homeState: GrantState | null
  aid: AidCollegesState
  onGoToTab: (tab: TabId) => void
  /** The student's grade, 9–12. */
  year: number
  /** `profiles.grade_start_idx`, which decides whose FAFSA this is. */
  gradeStartIdx: number | null | undefined
}

/** The student's own FAFSA date, the one Deadlines and the calendar show. It
 *  was written in as "Oct 1", which stayed up after the form had opened. */
function fafsaStat(gradeStartIdx: number | null | undefined) {
  const now = new Date()
  const { date } = fafsaOpening(seniorFallYear(gradeStartIdx, now))
  const opened = date <= now
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return {
    label: opened ? 'FAFSA Opened' : 'FAFSA Opens',
    value: date.getFullYear() === now.getFullYear() ? day : `${day}, ${date.getFullYear()}`,
    sub: opened ? 'Open now: file early' : 'Senior year',
    color: '#2D9E72',
  }
}

const OverviewTab = ({ progress, onToggle, aside, homeState, aid, onGoToTab, year, gradeStartIdx }: OverviewTabProps) => {
  const [activeContentId, setActiveContentId] = useState<string | null>(null)
  // Lives here, not in the guide, so it survives opening an article and coming back.
  const [guideRow, setGuideRow] = useState<GuideRowId | null>(null)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: true })
  const toggle = (i: number) => setExpanded((p) => ({ ...p, [i]: !p[i] }))
  const statusOf = (id: string): ChecklistItemStatus => progress[id] ?? 'available'
  const done = CHECKLIST_SECTIONS.reduce(
    (a, s) => a + s.items.filter((x) => statusOf(x.id) === 'completed').length,
    0,
  )
  const total = CHECKLIST_TOTAL_ITEMS

  const handleMarkComplete = (itemId: string) => {
    const current = progress[itemId] ?? 'available'
    if (current === 'completed') {
      onToggle(itemId)
    } else if (current === 'in-progress') {
      onToggle(itemId)
    } else {
      onToggle(itemId)
      setTimeout(() => onToggle(itemId), 50)
    }
  }

  const openContent = (itemId: string) => {
    const current = progress[itemId] ?? 'available'
    if (current === 'available') {
      onToggle(itemId)
    }
    setActiveContentId(itemId)
  }

  const handleGuideGoTo = (dest: AidGuideDestination) => {
    // Opened to read, not started: going through openContent would mark the
    // checklist item in progress just for following a link.
    if (dest === 'fafsa') setActiveContentId('fp-1')
    else onGoToTab(dest)
  }

  if (activeContentId) {
    return (
      <ChecklistContentView
        itemId={activeContentId}
        status={statusOf(activeContentId)}
        contentMap={CHECKLIST_CONTENT_MAP}
        allIds={CHECKLIST_ALL_IDS}
        accentColor={MC}
        onBack={() => setActiveContentId(null)}
        onMarkComplete={handleMarkComplete}
        onNavigate={openContent}
      />
    )
  }

  // One school can sit on the list under two ids; the guarantee shows once.
  const yourSchools = [...new Map(aid.colleges.flatMap((c) => (c.guarantee ? [[c.canonicalId, c.guarantee] as const] : []))).values()]

  const checklist = (
    <div>
      <div data-tour="overview-progress" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 18 }}>
        <div style={{ flex: 1 }}><Bar value={done / total} color={MC} height={6} /></div>
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, color: MC, whiteSpace: 'nowrap' }}>{done}/{total} completed</span>
      </div>

      <SecLabel>Your Checklist</SecLabel>

      {CHECKLIST_SECTIONS.map((section, idx) => {
        const sdone = section.items.filter((x) => statusOf(x.id) === 'completed').length
        const isOpen = expanded[idx] !== false
        return (
          <div key={idx} style={{ marginBottom: 10, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', background: C.surface }}>
            <button onClick={() => toggle(idx)} style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '12px 16px', background: C.bg, border: 'none', borderBottom: isOpen ? `1px solid ${C.border}` : 'none', cursor: 'pointer', gap: 10, textAlign: 'left' }}>
              <span style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s ease', color: C.textMuted, display: 'flex' }}>{I.chevron}</span>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, color: C.text, flex: 1 }}>{section.title}</span>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, color: sdone === section.items.length ? '#2D9E72' : C.textMuted, background: sdone === section.items.length ? '#2D9E7215' : C.bg, padding: '2px 8px', borderRadius: 99, border: `1px solid ${sdone === section.items.length ? '#2D9E7230' : C.border}` }}>{sdone}/{section.items.length}</span>
            </button>
            {isOpen && section.items.map((item, i) => {
              const itemStatus = statusOf(item.id)
              return (
                <div
                  key={item.id}
                  onClick={() => openContent(item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px 10px 42px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = C.surfaceHover)}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
                >
                  <Ring status={itemStatus} color={MC} />
                  <span style={{ color: MC, display: 'flex', opacity: 0.65, flexShrink: 0 }}>{itemIcon(item.type)}</span>
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: itemStatus === 'completed' ? C.textMuted : C.text, textDecoration: itemStatus === 'completed' ? 'line-through' : 'none', flex: 1, lineHeight: 1.4 }}>{item.label}</span>
                  <span style={{ display: 'flex', color: C.textFaint, flexShrink: 0, marginLeft: 4 }}>{I.chevron}</span>
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint, textTransform: 'capitalize', flexShrink: 0 }}>{item.type}</span>
                </div>
              )
            })}
          </div>
        )
      })}
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint, marginTop: 10, textAlign: 'center' }}>Click any item to open its content</p>
    </div>
  )

  const guide = <AidGuideSections homeState={homeState} yourSchools={yourSchools} listFailed={aid.failed} open={guideRow} onOpenChange={setGuideRow} onGoTo={handleGuideGoTo} />

  return (
    <div className="mov" style={{ display: 'flex', alignItems: 'flex-start', gap: 26, padding: '28px 30px' }}>
      <div className="mov-main" style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: MC, textTransform: 'uppercase', letterSpacing: '0.07em', background: '#EBF5F0', padding: '4px 10px', borderRadius: 99, border: `1px solid ${MC}20`, marginBottom: 12 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: MC }} />Scholarship Hunt
      </div>
      <h1 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, fontWeight: 400, color: C.text, margin: '0 0 8px' }}>Financial Aid</h1>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: C.textMuted, margin: '0 0 20px', lineHeight: 1.6, maxWidth: 520 }}>
        {year >= 12
          ? 'Senior year is when your aid gets decided. File the FAFSA as soon as it opens in the fall, and the CSS Profile if your schools ask for it — some state and college aid goes to whoever files first.'
          : year === 11
            ? "Junior year is prime time to get ahead. You can't file FAFSA until October of senior year, but building your scholarship list and running net price calculators now puts you miles ahead."
            : "You're early, and that's an advantage. The FAFSA opens in the fall of senior year; until then, building your scholarship list and running net price calculators puts you miles ahead."}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          fafsaStat(gradeStartIdx),
          { label: 'Avg. Aid Award', value: '$13,200', sub: 'Per year nationally', color: '#7048C8' },
          { label: 'Scholarships', value: '1.7M+', sub: 'Available to students', color: '#C47A12' },
        ].map((s, i) => (
          <div key={i} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: '12px 14px', boxShadow: C.shadow1 }}>
            <div style={{ fontFamily: "'Young Serif',serif", fontSize: 20, color: s.color, lineHeight: 1, marginBottom: 3 }}>{s.value}</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 1 }}>{s.label}</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {year >= 12 ? (
        <div style={{ marginBottom: 22 }}>
          <Callout icon="💡" title="Senior Year Priority" body="File the FAFSA soon after it opens. Some state grants and college aid are first come, first served, and each school’s priority date is in Deadlines." />
        </div>
      ) : year === 11 && (
        <div style={{ marginBottom: 22 }}>
          <Callout icon="💡" title="Junior Year Priority" body="Create your FSA ID now — it must match your Social Security records exactly and takes up to 3 days to process. Do this before senior year hits." />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {guide}
        {checklist}
      </div>
      </div>

      {aside}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SCHOLARSHIPS — shared by My Scholarships and the Aid Engine
   ═══════════════════════════════════════════════════════════════ */
const font = "'Outfit',sans-serif"

const SCHOLARSHIP_TYPE_COLOR: Record<ScholarshipType, string> = {
  Merit: '#7048C8',
  Need: '#1D7FC4',
  Local: '#C47A12',
  Identity: '#2D9E72',
}
const TYPE_EMOJI: Record<ScholarshipType, string> = { Merit: '🏅', Need: '💵', Local: '📍', Identity: '🌱' }
const typeEmoji = (t: ScholarshipType | null) => (t ? TYPE_EMOJI[t] : '🏆')

const MS_PER_DAY = 86400000
const dayDiff = (d: Date, now: Date) => Math.ceil((d.getTime() - now.getTime()) / MS_PER_DAY)

/** The student's tracked scholarships and every way to change them. Owned by
 *  the module so My Scholarships and the Aid Engine show the same list. */
interface TrackerApi {
  items: DBTrackerItem[]
  loaded: boolean
  error: string | null
  /** Shared task ids the student has done (see scholarshipTasks). */
  sharedDone: ReadonlySet<string>
  add: (s: Scholarship) => void
  addCustom: (input: NewTrackerInput) => Promise<boolean>
  update: (id: string, fields: TrackerEdit, done?: string) => Promise<boolean>
  setStatus: (id: string, status: DBTrackerStatus) => void
  remove: (id: string) => void
  setTasks: (id: string, tasks: AppTask[]) => void
  setShared: (taskId: string, done: boolean) => void
}

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, fontFamily: font, fontSize: 13, color: C.text, outline: 'none' } as const
const fieldLabel = { fontFamily: font, fontSize: 11, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 4 } as const

interface CustomValues { name: string; amount: string; deadline: string; type: ScholarshipType; source: string }

/** Add a scholarship the student found themselves, or edit one's details. */
function CustomScholarshipForm({ initial, onSubmit, onCancel }: {
  initial?: DBTrackerItem
  /** Resolves true once saved; the parent closes the form. */
  onSubmit: (v: CustomValues) => Promise<boolean>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const [type, setType] = useState<ScholarshipType>(initial?.type ?? 'Merit')
  const [source, setSource] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Tell the student up front whether we can read a date out of what they
  // typed. A deadline we cannot parse still saves and still shows in this
  // list, but it will not appear on the calendar or the timeline, and silently
  // omitting it there is what makes a tracker feel unreliable.
  const hint = useMemo((): { ok: boolean; text: string } => {
    const raw = deadline.trim()
    if (raw === '') return { ok: true, text: '' }
    const exact = parseCollegeDate(raw)
    if (exact) return { ok: true, text: `Shows on your calendar on ${formatCollegeDate(exact)}.` }
    const recurring = parseRecurringDeadline(raw)
    if (recurring) {
      return {
        ok: true,
        text: `Shows on your calendar around ${MONTH_NAMES[recurring.month]} ${recurring.day}`
          + `${recurring.year ? `, ${recurring.year}` : ''}, marked as an estimate.`,
      }
    }
    return { ok: false, text: "We can't read a date from this, so it won't appear on your calendar or timeline. A date like “Mar 1, 2027” or “May 1 (annual)” will." }
  }, [deadline])
  const ready = name.trim() !== '' && !submitting
  const submit = async () => {
    if (!ready) return
    setSubmitting(true)
    await onSubmit({ name: name.trim(), amount: amount.trim(), deadline: deadline.trim(), type, source: source.trim() })
    setSubmitting(false)
  }

  return (
    <div style={{ padding: '16px 18px', background: C.surface, border: `1.5px solid ${MC}30`, borderRadius: 12, boxShadow: C.shadow2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.text }}>{initial ? 'Edit details' : 'Add a scholarship you found'}</span>
        <button onClick={onCancel} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, fontSize: 16, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={fieldLabel}>Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rotary Club of San Diego Scholarship" style={inputStyle} />
        </div>
        <div>
          <label style={fieldLabel}>Amount</label>
          <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$2,500" style={inputStyle} />
        </div>
        <div>
          <label style={fieldLabel}>Deadline</label>
          <input type="text" value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="Mar 1, 2027" style={inputStyle} />
          {deadline.trim() !== '' && (
            <div style={{ fontFamily: font, fontSize: 11, color: hint.ok ? C.textMuted : '#C47A12', marginTop: 4, lineHeight: 1.4 }}>{hint.text}</div>
          )}
        </div>
        <div>
          <label style={fieldLabel}>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as ScholarshipType)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="Merit">Merit</option>
            <option value="Need">Need-based</option>
            <option value="Local">Local</option>
            <option value="Identity">Identity</option>
          </select>
        </div>
        {!initial && (
          <div>
            <label style={fieldLabel}>Source</label>
            <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. School counselor, local org" style={inputStyle} />
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.textMuted, fontFamily: font, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
        <button
          onClick={() => void submit()}
          disabled={!ready}
          style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: ready ? MC : C.border, color: ready ? '#fff' : C.textFaint, fontFamily: font, fontSize: 12, fontWeight: 600, cursor: ready ? 'pointer' : 'default' }}
        >
          {initial ? (submitting ? 'Saving…' : 'Save changes') : (submitting ? 'Adding…' : 'Add to My Scholarships')}
        </button>
      </div>
    </div>
  )
}

/** The catalogue's facts about a scholarship: what it gives, who it's for,
 *  what it asks. `summary` adds amount and deadline, where nothing above
 *  already shows them. */
function ScholarshipFacts({ scholarship, summary }: { scholarship: Scholarship; summary?: { amount: string; deadline: string } }) {
  const cells: Array<{ label: string; value: string; accent?: string }> = [
    ...(summary ? [{ label: 'Amount', value: summary.amount, accent: MC }, { label: 'Deadline', value: summary.deadline, accent: '#C47A12' }] : []),
    ...(scholarship.min_gpa != null ? [{ label: 'Min GPA', value: scholarship.min_gpa.toFixed(2) }] : []),
    ...(scholarship.num_awards_per_year != null ? [{ label: 'Awards / year', value: `~${scholarship.num_awards_per_year.toLocaleString()}` }] : []),
  ]
  return (
    <>
      {cells.length > 0 && (
        <>
          <SecLabel>Key facts</SecLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 22 }}>
            {cells.map((c) => <FactCell key={c.label} label={c.label} value={c.value} accent={c.accent} />)}
          </div>
        </>
      )}

      {scholarship.eligibility_summary && (
        <div style={{ marginBottom: 22 }}>
          <SecLabel>Eligibility</SecLabel>
          <p style={{ fontFamily: font, fontSize: 13.5, color: C.text, lineHeight: 1.6, margin: 0 }}>{scholarship.eligibility_summary}</p>
        </div>
      )}

      {scholarship.application_requirements.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SecLabel>What they ask for</SecLabel>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {scholarship.application_requirements.map((req, i) => (
              <li key={i} style={{ fontFamily: font, fontSize: 13, color: C.text, padding: '8px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: MC, flexShrink: 0 }} />
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}

      {scholarship.selection_criteria.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SecLabel>Judged on</SecLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {scholarship.selection_criteria.map((c) => (
              <span key={c} style={{ fontFamily: font, fontSize: 11, fontWeight: 500, color: C.textMuted, background: C.surface, border: `1px solid ${C.border}`, padding: '4px 10px', borderRadius: 99, textTransform: 'capitalize' }}>{c}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 22 }}>
        <SecLabel>About</SecLabel>
        <p style={{ fontFamily: font, fontSize: 13.5, color: C.text, lineHeight: 1.6, margin: 0 }}>{scholarship.description}</p>
      </div>

      <div style={{ marginBottom: 22, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', fontFamily: font, fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
        {scholarship.verified_at && (
          <span style={{ color: '#1F7A54', fontWeight: 600, whiteSpace: 'nowrap' }}>
            ✓ Verified {new Date(scholarship.verified_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
        )}
        <span>Details are compiled from public sources — always confirm amounts and deadlines on the official site before applying.</span>
      </div>
    </>
  )
}

function FactCell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px' }}>
      <div style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: C.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'Young Serif',serif", fontSize: 17, color: accent ?? C.text, lineHeight: 1.2 }}>{value}</div>
    </div>
  )
}

const OfficialLink = ({ url }: { url: string }) => (
  <a href={url} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 18px', borderRadius: 10, background: MC, color: '#fff', fontFamily: font, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    Open official application {I.extlink}
  </a>
)

/** The student's free-text notes on one tracked scholarship. Saved on blur. */
function TrackerNotes({ itemId }: { itemId: string }) {
  const toast = useToast()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    let cancelled = false
    getTrackerNotes(itemId)
      .then((notes) => { if (!cancelled) { setText(notes ?? ''); setDirty(false) } })
      .catch(() => { if (!cancelled) setText('') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [itemId])

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      await updateTrackerNotes(itemId, text)
      setSavedAt(new Date())
      setDirty(false)
      toast.success('Note saved')
    } catch {
      toast.error('Could not save your note — try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <SecLabel style={{ margin: 0 }}>Your notes</SecLabel>
        {savedAt && !dirty && !saving && (
          <span style={{ fontFamily: font, fontSize: 10, color: C.textFaint }}>Saved {savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
        )}
      </div>
      {loading ? (
        <p style={{ fontFamily: font, fontSize: 12, color: C.textFaint }}>Loading notes…</p>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setDirty(true) }}
            onBlur={() => { if (dirty) void save() }}
            placeholder="Essay ideas, contact names, anything you want to remember…"
            aria-label="Scholarship notes"
            rows={4}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, fontFamily: font, fontSize: 13, color: C.text, lineHeight: 1.5, resize: 'vertical', outline: 'none' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <button
              onClick={() => void save()}
              disabled={!dirty || saving}
              style={{ padding: '5px 14px', borderRadius: 8, border: `1px solid ${dirty ? `${MC}40` : C.border}`, background: dirty ? `${MC}12` : C.surface, color: dirty ? MC : C.textFaint, fontFamily: font, fontSize: 12, fontWeight: 600, cursor: dirty && !saving ? 'pointer' : 'default' }}
            >
              {saving ? 'Saving…' : 'Save notes'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB: MY SCHOLARSHIPS — where each tracked scholarship stands, like
   Application Status: a status strip, the deadlines on one timeline, the
   tasks shared across the list, and one row per scholarship. Each row opens
   its own page with its checklist.
   ═══════════════════════════════════════════════════════════════ */
type StageKey = 'todo' | 'submitted' | 'awarded'
const SCHOLARSHIP_STAGES: Array<{ key: StageKey; label: string; color: string; statuses: DBTrackerStatus[] }> = [
  { key: 'todo', label: 'to apply', color: '#C47A12', statuses: ['researching', 'planning', 'ready'] },
  { key: 'submitted', label: 'submitted', color: '#1D7FC4', statuses: ['submitted'] },
  { key: 'awarded', label: 'awarded', color: MC, statuses: ['awarded'] },
]

type ScholarshipSort = 'deadline' | 'status' | 'amount' | 'name'
const SCHOLARSHIP_SORTS: Array<{ key: ScholarshipSort; label: string }> = [
  { key: 'deadline', label: 'Deadline' },
  { key: 'status', label: 'Status' },
  { key: 'amount', label: 'Amount' },
  { key: 'name', label: 'Name' },
]

const TaskBox = ({ done }: { done: boolean }) => (
  <span style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 6, border: done ? 'none' : `2px solid ${C.borderStrong}`, background: done ? MC : 'transparent', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
    {done ? '✓' : ''}
  </span>
)

const ScholarshipsTab = ({ api, gradeStartIdx, initialOpenId, onFindScholarships }: {
  api: TrackerApi
  gradeStartIdx: number | null | undefined
  /** Open straight onto this scholarship's page (from the Aid Engine's strip). */
  initialOpenId: string | null
  /** Go to the Aid Engine, where scholarships are found. */
  onFindScholarships: () => void
}) => {
  const [openId, setOpenId] = useState<string | null>(initialOpenId)
  const [sort, setSort] = useState<ScholarshipSort>('deadline')
  const [filter, setFilter] = useState<StageKey | null>(null)
  const [adding, setAdding] = useState(false)
  const [celebrateKey, setCelebrateKey] = useState<number | null>(null)
  const celebrate = () => setCelebrateKey((k) => (k ?? 0) + 1)
  // Moving between the list and a scholarship's page starts at the top.
  const topRef = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    topRef.current?.scrollIntoView({ block: 'start' })
  }, [openId])

  const { items, sharedDone } = api
  const confetti = celebrateKey != null && <Celebration key={celebrateKey} onDone={() => setCelebrateKey(null)} />

  if (!api.loaded) {
    return (
      <div style={{ padding: '24px 28px', fontFamily: font, fontSize: 13, color: api.error ? '#B93A3A' : C.textMuted }}>
        {api.error ? `Couldn't load your scholarships: ${api.error}` : 'Loading your scholarships…'}
      </div>
    )
  }

  const addCustom = async (v: CustomValues) => {
    const ok = await api.addCustom({ name: v.name, amount: v.amount || null, deadline: v.deadline || null, status: 'researching', type: v.type, source: v.source || 'Custom', scholarshipId: null })
    if (ok) setAdding(false)
    return ok
  }
  const addForm = <CustomScholarshipForm onSubmit={addCustom} onCancel={() => setAdding(false)} />

  if (items.length === 0) {
    return (
      <div ref={topRef} style={{ padding: '24px 28px', maxWidth: 760 }}>
        <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 30, fontWeight: 400, color: C.text, margin: 0, lineHeight: 1.2 }}>Your scholarships</h2>
        {adding ? <div style={{ marginTop: 24 }}>{addForm}</div> : (
          <div style={{ marginTop: 24, textAlign: 'center', padding: '40px 20px', background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 12 }}>
            <div style={{ fontFamily: font, fontSize: 14, color: C.textMuted }}>Add scholarships to work on. Each gets its own checklist here.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
              <button onClick={onFindScholarships} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: MC, color: '#fff', cursor: 'pointer', fontFamily: font, fontSize: 13, fontWeight: 600 }}>
                Find scholarships in Aid Engine
              </button>
              <button onClick={() => setAdding(true)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${MC}40`, background: C.surface, color: MC, cursor: 'pointer', fontFamily: font, fontSize: 13, fontWeight: 600 }}>
                Add one you found yourself
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const now = new Date()
  // The same dates the calendar shows: exact ones as they are, recurring
  // wording placed in the student's cycle. Passed and undated ones have none.
  const eventFor = new Map<string, DeadlineEvent>()
  for (const e of deriveScholarshipEvents(items, { gradeStartIdx, now })) {
    if (!e.done && e.sourceRef) eventFor.set(e.sourceRef, e)
  }
  const daysFor = (item: DBTrackerItem): number | null => {
    const e = eventFor.get(item.id)
    return e ? dayDiff(e.date, now) : null
  }
  const isComplete = (item: DBTrackerItem, shared: ReadonlySet<string>) => scholarshipTasks(item, shared).every((t) => t.done)

  const setStatus = (item: DBTrackerItem, status: DBTrackerStatus) => {
    if ((status === 'submitted' || status === 'awarded') && item.status !== status) celebrate()
    api.setStatus(item.id, status)
  }
  const setTasks = (item: DBTrackerItem, tasks: AppTask[]) => {
    if (!isComplete(item, sharedDone) && isComplete({ ...item, tasks }, sharedDone)) celebrate()
    api.setTasks(item.id, tasks)
  }
  // A shared task can finish several scholarships at once; celebrate if any.
  const setShared = (taskId: string, done: boolean) => {
    const next = new Set(sharedDone)
    if (done) next.add(taskId)
    else next.delete(taskId)
    if (items.some((i) => isOpenStatus(i.status) && !isComplete(i, sharedDone) && isComplete(i, next))) celebrate()
    api.setShared(taskId, done)
  }

  const shared = sharedScholarshipSummary(items, sharedDone)
  const sharedCounts = new Map(shared.map((s) => [s.id, s.itemIds.length]))

  const openItem = items.find((i) => i.id === openId) ?? null
  if (openItem) {
    return (
      <div ref={topRef}>
        <ScholarshipPage
          item={openItem}
          sharedDone={sharedDone}
          sharedCounts={sharedCounts}
          event={eventFor.get(openItem.id) ?? null}
          daysLeft={daysFor(openItem)}
          onBack={() => setOpenId(null)}
          onStatus={(s) => setStatus(openItem, s)}
          onTasks={(tasks) => setTasks(openItem, tasks)}
          onToggleShared={setShared}
          onUpdate={api.update}
          onRemove={() => { setOpenId(null); api.remove(openItem.id) }}
        />
        {confetti}
      </div>
    )
  }

  const stages = SCHOLARSHIP_STAGES.map((st) => ({ ...st, n: items.filter((i) => st.statuses.includes(i.status)).length })).filter((st) => st.n > 0)
  const activeFilter = stages.find((st) => st.key === filter) ?? null
  const potential = items.reduce((sum, i) => sum + (isOpenStatus(i.status) ? parseTrackerAmount(i.amount) ?? 0 : 0), 0)

  const timeline: TimelineItem[] = items.flatMap((item) => {
    const e = eventFor.get(item.id)
    if (!e) return []
    return [{ id: item.id, name: item.name, emoji: typeEmoji(item.type), date: e.date, dateDisplay: e.dateDisplay, typeLabel: item.amount, days: dayDiff(e.date, now), guessed: e.estimated }]
  })
  const nextItem = [...timeline].sort((a, b) => a.days - b.days)[0]
  const nextUrgent = nextItem ? urgencyColor(nextItem.days) : null

  const sorted = items.filter((i) => !activeFilter || activeFilter.statuses.includes(i.status)).sort((a, b) => {
    const name = a.name.localeCompare(b.name)
    const status = SCHOLARSHIP_STATUSES.indexOf(a.status) - SCHOLARSHIP_STATUSES.indexOf(b.status)
    if (sort === 'name') return name
    if (sort === 'status') return status || name
    if (sort === 'amount') return (parseTrackerAmount(b.amount) ?? -1) - (parseTrackerAmount(a.amount) ?? -1) || name
    // Deadline: dated ones first, soonest first; the rest by status.
    const da = daysFor(a), db = daysFor(b)
    if (da != null && db != null) return da - db || name
    if (da != null) return -1
    if (db != null) return 1
    return status || name
  })

  return (
    <motion.div ref={topRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, ease: EASE_OUT }} style={{ padding: '24px 28px 32px', maxWidth: 900 }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 30, fontWeight: 400, color: C.text, margin: 0, lineHeight: 1.2 }}>Your scholarships</h2>
          {/* status strip — each count filters the list below */}
          <div role="group" aria-label="Filter scholarships by status" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 10, marginLeft: -8 }}>
            {stages.map((st) => {
              const on = filter === st.key
              return (
                <button
                  key={st.key}
                  onClick={() => setFilter(on ? null : st.key)}
                  aria-pressed={on}
                  className="ast-chip"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 99, border: `1px solid ${on ? `${st.color}40` : 'transparent'}`, background: on ? `${st.color}14` : undefined, cursor: 'pointer', fontFamily: font, fontSize: 12.5, color: on ? st.color : C.textMuted }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.color }} />
                  <b style={{ fontWeight: 700, color: st.color }}>{st.n}</b> {st.label}
                </button>
              )
            })}
            {potential > 0 && <span style={{ fontFamily: font, fontSize: 12.5, color: C.textMuted, padding: '3px 8px' }}><b style={{ fontWeight: 700, color: C.text }}>${potential.toLocaleString()}</b> still to win</span>}
          </div>
        </div>

        {nextItem && (
          <button
            onClick={() => setOpenId(nextItem.id)}
            className="ast-card"
            aria-label={`Next up: ${nextItem.name}, ${nextItem.dateDisplay}`}
            style={{ flex: '0 1 280px', minWidth: 230, display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', background: nextUrgent ? `${nextUrgent}0D` : C.surface, border: `1px solid ${nextUrgent ? `${nextUrgent}40` : C.border}`, borderRadius: 12, cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <SecLabel style={{ marginBottom: 0 }}>Next up</SecLabel>
              <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: nextUrgent ?? C.textMuted, whiteSpace: 'nowrap' }}>
                {nextItem.days === 0 ? 'Today' : nextItem.days === 1 ? 'Tomorrow' : roughDuration(nextItem.days, { approx: false })}
              </span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <CollegeLogo emoji={nextItem.emoji} size={28} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: font, fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nextItem.name}</span>
                <span style={{ display: 'block', fontFamily: font, fontSize: 12, color: C.textMuted, marginTop: 1 }}>{nextItem.typeLabel} · {nextItem.dateDisplay}</span>
              </span>
            </span>
          </button>
        )}
      </header>

      {timeline.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <DeadlineTimeline items={timeline} now={now} onSelect={setOpenId} accent={MC} />
        </section>
      )}

      {shared.length > 0 && (
        <section style={{ marginTop: 30 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
            <SecLabel style={{ marginBottom: 0 }}>Shared across your scholarships</SecLabel>
            <span style={{ fontFamily: font, fontSize: 12, color: C.textMuted }}>Do these once and they count for every scholarship</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {shared.map((t) => (
              <button
                key={t.id}
                onClick={() => setShared(t.id, !t.done)}
                aria-pressed={t.done}
                className="ast-card"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: t.done ? `${MC}0D` : C.surface, border: `1px solid ${t.done ? `${MC}40` : C.border}`, borderRadius: 12, cursor: 'pointer', textAlign: 'left' }}
              >
                <TaskBox done={t.done} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: font, fontSize: 13, fontWeight: 600, color: t.done ? C.textMuted : C.text }}>{t.label}</span>
                  <span style={{ display: 'block', fontFamily: font, fontSize: 11.5, color: C.textMuted, marginTop: 1 }}>
                    {t.done ? 'Done for' : 'Needed by'} {t.itemIds.length} scholarship{t.itemIds.length === 1 ? '' : 's'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10 }}>
            <SecLabel style={{ marginBottom: 0 }}>{activeFilter ? `Your scholarships · ${activeFilter.label}` : 'Your scholarships'}</SecLabel>
            {activeFilter && (
              <button onClick={() => setFilter(null)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font, fontSize: 12, fontWeight: 600, color: MC }}>Show all</button>
            )}
          </span>
          <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <div role="group" aria-label="Sort scholarships" style={{ display: 'flex', gap: 4, alignItems: 'baseline', fontFamily: font, fontSize: 12, color: C.textMuted }}>
              Sort by
              {SCHOLARSHIP_SORTS.map((s) => (
                <button key={s.key} onClick={() => setSort(s.key)} aria-pressed={sort === s.key} style={{ background: 'none', border: 'none', padding: '0 4px', cursor: 'pointer', fontFamily: font, fontSize: 12, fontWeight: sort === s.key ? 700 : 500, color: sort === s.key ? MC : C.textMuted }}>
                  {s.label}
                </button>
              ))}
            </div>
            <button onClick={() => setAdding(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font, fontSize: 12, fontWeight: 600, color: MC }}>
              {I.plus} Add your own
            </button>
          </div>
        </div>

        {adding && <div style={{ marginBottom: 12 }}>{addForm}</div>}

        <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, overflow: 'hidden' }}>
          {sorted.map((item, i) => {
            const status = STATUS_META[item.status]
            const tasks = scholarshipTasks(item, sharedDone)
            const done = tasks.filter((t) => t.done).length
            const complete = done === tasks.length
            const days = daysFor(item)
            const event = eventFor.get(item.id)
            const urgent = urgencyColor(days)
            const open = isOpenStatus(item.status)
            const dateKind = open && !event ? scholarshipDeadlineState(item).kind : null
            return (
              <button
                key={item.id}
                onClick={() => setOpenId(item.id)}
                className="ast-grid ast-row"
                style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderTop: i ? `1px solid ${C.border}` : 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <DateBlock date={event?.date ?? null} urgent={urgent} />
                <CollegeLogo emoji={typeEmoji(item.type)} size={28} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: font, fontSize: 14.5, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                  <span style={{ display: 'block', fontFamily: font, fontSize: 12, color: C.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.type && <><span style={{ color: SCHOLARSHIP_TYPE_COLOR[item.type], fontWeight: 600 }}>{item.type}</span> · </>}
                    {item.amount}
                    {days != null && <span style={{ color: urgent ?? C.textMuted, fontWeight: urgent ? 600 : 400 }}> · {days === 0 ? 'due today' : `${roughDuration(days)} left`}{event?.estimated ? ' (est.)' : ''}</span>}
                    {dateKind === 'passed' && <span style={{ color: '#B93A3A' }}> · deadline passed</span>}
                    {(dateKind === 'none' || dateKind === 'estimated') && <span style={{ color: '#A35F00' }}> · no date yet</span>}
                  </span>
                </span>
                <span className="ast-tasks" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <Bar value={tasks.length ? done / tasks.length : 0} color={MC} height={5} />
                  <span style={{ fontFamily: font, fontSize: 11, color: complete ? MC : C.textMuted, fontWeight: complete ? 600 : 400 }}>{complete ? 'All tasks done' : `${done} of ${tasks.length} tasks`}</span>
                </span>
                <span style={{ justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: font, fontSize: 11.5, fontWeight: 600, color: status.color, background: `${status.color}14`, border: `1px solid ${status.color}2E`, borderRadius: 99, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.color, flexShrink: 0 }} />
                  {status.label}
                </span>
                <span aria-hidden style={{ color: C.textFaint, fontSize: 18, lineHeight: 1 }}>›</span>
              </button>
            )
          })}
          {sorted.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', fontFamily: font, fontSize: 13, color: C.textFaint }}>None here.</div>
          )}
        </div>
      </section>

      {confetti}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ONE TRACKED SCHOLARSHIP — its status, deadline, checklist, the
   catalogue's details and the student's notes. Like SchoolApplicationPage.
   ═══════════════════════════════════════════════════════════════ */
function ScholarshipPage({ item, sharedDone, sharedCounts, event, daysLeft, onBack, onStatus, onTasks, onToggleShared, onUpdate, onRemove }: {
  item: DBTrackerItem
  sharedDone: ReadonlySet<string>
  /** Shared task id → how many open scholarships need it. */
  sharedCounts: Map<string, number>
  /** Its upcoming deadline, if it still has one. */
  event: DeadlineEvent | null
  daysLeft: number | null
  onBack: () => void
  onStatus: (status: DBTrackerStatus) => void
  /** Its own tasks (shared ones go through onToggleShared). */
  onTasks: (tasks: AppTask[]) => void
  onToggleShared: (taskId: string, done: boolean) => void
  onUpdate: TrackerApi['update']
  onRemove: () => void
}) {
  const [scholarship, setScholarship] = useState<Scholarship | null>(null)
  const [detailFailed, setDetailFailed] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [editing, setEditing] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  useEffect(() => {
    if (!item.scholarshipId) return
    let cancelled = false
    getScholarship(item.scholarshipId)
      .then((s) => { if (!cancelled) setScholarship(s) })
      .catch(() => { if (!cancelled) setDetailFailed(true) })
    return () => { cancelled = true }
  }, [item.scholarshipId])

  const tasks = scholarshipTasks(item, sharedDone)
  const own = ownTasks(tasks)
  const done = tasks.filter((t) => t.done).length
  const status = STATUS_META[item.status]
  const open = isOpenStatus(item.status)
  const urgent = open ? urgencyColor(daysLeft) : null
  const dateState = scholarshipDeadlineState(item)
  const typeColor = item.type ? SCHOLARSHIP_TYPE_COLOR[item.type] : C.textMuted

  const toggle = (task: AppTask) => {
    if (isSharedScholarshipTask(task)) onToggleShared(task.id, !task.done)
    else onTasks(own.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)))
  }
  const addTask = () => {
    const label = newLabel.trim()
    if (!label) return
    const nums = own.filter((t) => /^c-\d+$/.test(t.id)).map((t) => parseInt(t.id.slice(2), 10))
    onTasks([...own, { id: `c-${(nums.length ? Math.max(...nums) : 0) + 1}`, label, done: false, phase: 'before', custom: true }])
    setNewLabel('')
  }
  const saveDetails = async (v: CustomValues) => {
    // Only new wording replaces the stored date. Renaming a scholarship must
    // not throw away a date the student set, and take it off their calendar.
    const deadlineChanged = v.deadline !== item.deadline.trim()
    const ok = await onUpdate(item.id, {
      name: v.name,
      amount: v.amount || null,
      deadline: v.deadline || null,
      // The student's own words now describe this deadline, so the date the
      // catalogue supplied is stale and must not keep winning over them.
      ...(deadlineChanged ? { deadlineDate: null } : {}),
      type: v.type,
    })
    if (ok) setEditing(false)
    return ok
  }

  const facts = { padding: '14px 18px' } as const
  const big = { fontFamily: font, fontSize: 15, fontWeight: 600, color: C.text } as const
  const small = { fontFamily: font, fontSize: 12, color: C.textMuted, marginTop: 3, lineHeight: 1.45 } as const

  return (
    <div style={{ padding: '20px 28px 32px', maxWidth: 820 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font, fontSize: 13, fontWeight: 600, color: MC, marginBottom: 18 }}>
        ← All scholarships
      </button>

      <div style={{ background: `linear-gradient(135deg, ${typeColor}17 0%, ${typeColor}05 55%, transparent 100%), var(--surface)`, border: `1px solid ${C.border}`, borderRadius: 16, padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ width: 58, height: 58, borderRadius: 14, background: C.white, border: `1px solid ${C.border}`, boxShadow: C.shadow1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 30 }}>
            {typeEmoji(item.type)}
          </span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 28, fontWeight: 400, color: C.text, margin: 0, lineHeight: 1.15 }}>{item.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6, fontFamily: font, fontSize: 13, color: C.textMuted }}>
              {item.type && <Tag label={item.type} color={typeColor} />}
              {item.requiresFafsa && <Tag label="FAFSA required" color="#1D7FC4" />}
              {item.requiresCss && <Tag label="CSS Profile required" color="#7048C8" />}
              {item.provider ? `Funded by ${item.provider}` : item.source && item.source !== 'Custom' ? `via ${item.source}` : null}
            </div>
          </div>
          <select
            value={item.status}
            onChange={(e) => onStatus(e.target.value as DBTrackerStatus)}
            aria-label="Scholarship status"
            style={{ fontFamily: font, fontSize: 12.5, fontWeight: 600, color: status.color, background: `${status.color}14`, border: `1px solid ${status.color}33`, borderRadius: 99, padding: '7px 12px', cursor: 'pointer', outline: 'none' }}
          >
            {SCHOLARSHIP_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
        </div>
      </div>

      <div className="sap-facts" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginTop: 14, border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface }}>
        <div style={{ ...facts, borderRight: `1px solid ${C.border}` }}>
          <SecLabel style={{ marginBottom: 6 }}>Deadline</SecLabel>
          {event && open ? (
            <>
              <div style={big}>
                {event.dateDisplay}
                {daysLeft != null && <span style={{ fontWeight: 500, color: urgent ?? C.textMuted }}> · {daysLabel(daysLeft)}</span>}
              </div>
              <div style={small}>{event.estimated ? 'Estimated from the provider’s wording. Add the exact date once you have it.' : 'On your calendar'}</div>
            </>
          ) : (
            <>
              <div style={{ ...big, color: C.textMuted }}>{!open ? status.label : dateState.kind === 'passed' ? 'Passed' : item.deadline}</div>
              {open && (
                <div style={{ ...small, color: '#A35F00' }}>
                  {dateState.kind === 'passed' ? 'Add the next round’s date if it runs again.' : 'No date yet. Look it up on the provider’s site and add it to put this on your calendar.'}
                </div>
              )}
            </>
          )}
          {open && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span style={{ fontFamily: font, fontSize: 12, color: C.textMuted, whiteSpace: 'nowrap' }}>Your date</span>
              <TaskDueInput
                due={item.deadlineDate ?? undefined}
                label="this scholarship's deadline"
                hint="Set the date from the provider's site."
                accent={MC}
                onCommit={(v) => void onUpdate(item.id, { deadlineDate: v ?? null }, v ? 'Deadline saved — it’s on your calendar now' : 'Date cleared')}
              />
            </div>
          )}
        </div>
        <div style={{ ...facts, borderRight: `1px solid ${C.border}` }}>
          <SecLabel style={{ marginBottom: 6 }}>Award</SecLabel>
          <div style={{ fontFamily: "'Young Serif',serif", fontSize: 19, color: MC }}>{item.amount}</div>
          {scholarship?.renewable_years != null && (
            <div style={small}>{scholarship.renewable_years === 1 ? 'One-time award' : `Renewable up to ${scholarship.renewable_years} years`}</div>
          )}
        </div>
        <div style={facts}>
          <SecLabel style={{ marginBottom: 6 }}>Tasks</SecLabel>
          <div style={big}>{done} of {tasks.length} done</div>
          <div style={{ marginTop: 8, maxWidth: 220 }}><Bar value={tasks.length ? done / tasks.length : 0} color={MC} height={5} /></div>
        </div>
      </div>

      <div className="sap-path" style={{ marginTop: 30 }}>
        {TASK_PHASES.map((phase) => {
          const items = tasks.filter((t) => t.phase === phase.id)
          if (items.length === 0) return null
          const phaseDone = items.filter((t) => t.done).length
          const allDone = phaseDone === items.length
          return (
            <div key={phase.id} className="sap-stage">
              <span style={{ position: 'absolute', left: -34, top: 0, width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: allDone ? MC : C.bg, border: allDone ? 'none' : `2px solid ${phaseDone ? MC : C.borderStrong}`, color: '#fff', fontSize: 11, fontWeight: 700 }}>
                {allDone ? '✓' : ''}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10, minHeight: 22 }}>
                <span style={{ fontFamily: "'Young Serif',serif", fontSize: 16, color: C.text }}>{phase.title}</span>
                <span style={{ fontFamily: font, fontSize: 12, color: allDone ? MC : C.textMuted, fontWeight: allDone ? 600 : 400 }}>{phaseDone} of {items.length}</span>
              </div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, overflow: 'hidden' }}>
                {items.map((task, i) => {
                  const others = isSharedScholarshipTask(task) ? (sharedCounts.get(task.id) ?? 1) - 1 : 0
                  return (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i ? `1px solid ${C.border}` : 'none' }}>
                      <button onClick={() => toggle(task)} aria-label={task.done ? `Mark ${task.label} not done` : `Mark ${task.label} done`} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                        <TaskBox done={task.done} />
                      </button>
                      <span style={{ flex: 1, fontFamily: font, fontSize: 13.5, color: task.done ? C.textMuted : C.text, textDecoration: task.done ? 'line-through' : 'none' }}>{task.label}</span>
                      {others > 0 && (
                        <span title="Done once, counts for every scholarship that needs it" style={{ fontFamily: font, fontSize: 11, fontWeight: 600, color: MC, background: `${MC}12`, borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                          Shared with {others} other{others === 1 ? '' : 's'}
                        </span>
                      )}
                      {task.custom && (
                        <button onClick={() => onTasks(own.filter((t) => t.id !== task.id))} aria-label={`Remove ${task.label}`} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.textFaint, padding: 2, lineHeight: 1 }}>✕</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTask() }}
          placeholder="Add a task…"
          aria-label="New task"
          style={{ flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontFamily: font, fontSize: 13, color: C.text, outline: 'none' }}
        />
        <button onClick={addTask} disabled={!newLabel.trim()} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: newLabel.trim() ? MC : C.surfaceHover, color: newLabel.trim() ? '#fff' : C.textFaint, cursor: newLabel.trim() ? 'pointer' : 'default', fontFamily: font, fontSize: 13, fontWeight: 600 }}>
          Add
        </button>
      </div>

      <div style={{ marginTop: 30 }}>
        {scholarship ? (
          <>
            <ScholarshipFacts scholarship={scholarship} />
            <OfficialLink url={scholarship.url} />
          </>
        ) : detailFailed ? (
          <p style={{ fontFamily: font, fontSize: 13, color: C.textMuted }}>Couldn't load this scholarship's details.</p>
        ) : item.scholarshipId ? (
          <p style={{ fontFamily: font, fontSize: 13, color: C.textMuted }}>Loading details…</p>
        ) : null}
      </div>

      <TrackerNotes itemId={item.id} />

      <div style={{ marginTop: 36, paddingTop: 16, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontFamily: font, fontSize: 13 }}>
        {editing ? (
          <div style={{ width: '100%' }}><CustomScholarshipForm initial={item} onSubmit={saveDetails} onCancel={() => setEditing(false)} /></div>
        ) : confirmRemove ? (
          <>
            <span style={{ color: C.text }}>Remove {item.name} and its tasks?</span>
            <button onClick={onRemove} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#B93A3A', color: '#fff', cursor: 'pointer', fontFamily: font, fontSize: 12.5, fontWeight: 600 }}>Remove</button>
            <button onClick={() => setConfirmRemove(false)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font, fontSize: 12.5, color: C.textMuted }}>Cancel</button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font, fontSize: 12.5, fontWeight: 600, color: C.textMuted }}>Edit details</button>
            <button onClick={() => setConfirmRemove(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font, fontSize: 12.5, fontWeight: 600, color: '#B93A3A' }}>Remove from my scholarships</button>
          </>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB: AID ENGINE — scholarship matches, like Discover: a short
   preferences step first, then the student's tracked list, a few picks,
   and every match as a card.
   ═══════════════════════════════════════════════════════════════ */
type MatchStrength = 'all' | 'strong' | 'good' | 'fair'
type DeadlineFilter = 'all' | 'urgent' | 'upcoming' | 'later'
type SortBy = 'match' | 'amount' | 'deadline'
type UserAidProfile = { gpa?: number | null; familyIncomeCents?: number | null }

const MATCH_COLORS = {
  strong: '#2D9E72',
  good: '#C47A12',
  fair: '#7048C8',
  none: 'rgba(var(--ink-rgb), 0.30)',
}

const SCORE_SEGMENT_COLORS = {
  demographic: '#2D9E72',
  eligibility: '#1D7FC4',
  award: '#C47A12',
  deadline: '#7048C8',
  requirement: '#B93A3A',
}

function matchStrengthLabel(total: number): { label: string; color: string } {
  if (total >= 70) return { label: 'Strong match', color: MATCH_COLORS.strong }
  if (total >= 45) return { label: 'Good match', color: MATCH_COLORS.good }
  if (total >= 20) return { label: 'Fair match', color: MATCH_COLORS.fair }
  return { label: 'Low match', color: MATCH_COLORS.none }
}

const ScoreBar = ({ score }: { score: ScholarshipMatchScore }) => {
  const segments = [
    { key: 'demographic', value: score.demographicMatch, max: 40, label: 'Profile', color: SCORE_SEGMENT_COLORS.demographic },
    { key: 'eligibility', value: score.eligibilityFit, max: 25, label: 'Eligibility', color: SCORE_SEGMENT_COLORS.eligibility },
    { key: 'award', value: score.awardValue, max: 15, label: 'Award', color: SCORE_SEGMENT_COLORS.award },
    { key: 'deadline', value: score.deadlineUrgency, max: 10, label: 'Deadline', color: SCORE_SEGMENT_COLORS.deadline },
    { key: 'requirement', value: score.requirementFit, max: 10, label: 'Fit', color: SCORE_SEGMENT_COLORS.requirement },
  ]
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return null
  return (
    <div>
      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 1, marginBottom: 6 }}>
        {segments.filter((s) => s.value > 0).map((seg) => (
          <div key={seg.key} style={{ flex: seg.value, background: seg.color, borderRadius: 2, minWidth: 4 }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {segments.filter((s) => s.value > 0).map((seg) => (
          <span key={seg.key} style={{ fontFamily: font, fontSize: 10, color: seg.color, fontWeight: 600 }}>{seg.label}: {seg.value}/{seg.max}</span>
        ))}
      </div>
    </div>
  )
}

/** One catalogue scholarship, opened from the Aid Engine. */
function ScholarshipDetailView({ match, userProfile, tracked, onBack, onTrack }: {
  match: ScoredScholarship
  userProfile: UserAidProfile
  tracked: boolean
  onBack: () => void
  onTrack: () => void
}) {
  const { scholarship: s, score } = match
  const type = inferScholarshipType(s.demographic_tags)
  const amount = formatScholarshipAmount(s)
  const deadline = s.deadline_display ?? 'Check official site'
  const reasons = scholarshipMatchReasons(s, score, userProfile)
  const strength = matchStrengthLabel(score.total)

  return (
    <div style={{ padding: '24px 30px 32px', maxWidth: 820 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: font, fontSize: 13, fontWeight: 600, color: MC, marginBottom: 18 }}>
        ← Back to matches
      </button>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <Tag label={strength.label} color={strength.color} />
          <Tag label={type} color={SCHOLARSHIP_TYPE_COLOR[type]} />
          {s.requires_fafsa && <Tag label="FAFSA required" color="#1D7FC4" />}
          {s.requires_css_profile && <Tag label="CSS Profile required" color="#7048C8" />}
        </div>
        <h1 style={{ fontFamily: "'Young Serif',serif", fontSize: 26, fontWeight: 400, color: C.text, margin: '0 0 6px', lineHeight: 1.2 }}>{s.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontFamily: font, fontSize: 13, color: C.textMuted }}>
          <span style={{ fontFamily: "'Young Serif',serif", fontSize: 16, color: MC }}>💵 {amount}</span>
          <span>📅 {deadline}</span>
          {s.renewable_years != null && <span>🔁 {s.renewable_years === 1 ? 'One-time award' : `Renewable up to ${s.renewable_years} years`}</span>}
        </div>
        {s.provider && <div style={{ fontFamily: font, fontSize: 12, color: C.textFaint, marginTop: 6 }}>Funded by {s.provider}</div>}
      </div>

      {reasons.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SecLabel>Why this matches you</SecLabel>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {reasons.map((r) => (
              <li key={r} style={{ fontFamily: font, fontSize: 13, color: C.text, display: 'flex', gap: 6, alignItems: 'baseline' }}><span style={{ color: MC }}>✓</span>{r}</li>
            ))}
          </ul>
        </div>
      )}
      <div style={{ marginBottom: 22 }}>
        <SecLabel>Match breakdown</SecLabel>
        <ScoreBar score={score} />
      </div>

      <ScholarshipFacts scholarship={s} summary={{ amount, deadline }} />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <OfficialLink url={s.url} />
        {tracked ? (
          <span style={{ padding: '10px 6px', fontFamily: font, fontSize: 13, fontWeight: 600, color: MC }}>✓ In My Scholarships</span>
        ) : (
          <button onClick={onTrack} style={{ padding: '10px 18px', borderRadius: 10, background: `${MC}12`, border: `1px solid ${MC}40`, color: MC, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {I.plus} Add to My Scholarships
          </button>
        )}
      </div>
    </div>
  )
}

const TrackButton = ({ tracked, onTrack }: { tracked: boolean; onTrack: () => void }) =>
  tracked ? (
    <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: MC, padding: '5px 0' }}>✓ Tracked</span>
  ) : (
    <button
      onClick={(e) => { e.stopPropagation(); onTrack() }}
      style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${MC}40`, background: `${MC}12`, color: MC, fontFamily: font, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}
    >
      {I.plus} Track
    </button>
  )

/** A card that opens on click and on Enter, holding its own buttons. */
const cardProps = (onOpen: () => void) => ({
  role: 'button' as const,
  tabIndex: 0,
  onClick: onOpen,
  onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen() },
  className: 'ast-card',
})

const AidMatchCard = ({ match, userProfile, tracked, hidden, onOpen, onTrack, onToggleHidden }: {
  match: ScoredScholarship
  userProfile: UserAidProfile
  tracked: boolean
  hidden: boolean
  onOpen: () => void
  onTrack: () => void
  onToggleHidden: () => void
}) => {
  const { scholarship: s, score } = match
  const type = inferScholarshipType(s.demographic_tags)
  const strength = matchStrengthLabel(score.total)
  const badge = deadlineBadge(s)
  const reason = scholarshipMatchReasons(s, score, userProfile)[0]
  return (
    <div {...cardProps(onOpen)} style={{ background: 'var(--card-soft)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer', minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Tag label={strength.label} color={strength.color} />
        <Tag label={type} color={SCHOLARSHIP_TYPE_COLOR[type]} />
        {badge && <Tag label={badge.label} color={badge.color} />}
      </div>
      <div style={{ fontFamily: font, fontSize: 14.5, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{s.name}</div>
      {s.provider && <div style={{ fontFamily: font, fontSize: 12, color: C.textMuted, marginTop: -3 }}>{s.provider}</div>}
      <div style={{ fontFamily: "'Young Serif',serif", fontSize: 19, color: MC }}>{formatScholarshipAmount(s)}</div>
      {reason && <div style={{ fontFamily: font, fontSize: 12, color: C.text, lineHeight: 1.4 }}><span style={{ color: MC }}>✓</span> {reason}</div>}
      <div style={{ marginTop: 'auto', paddingTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <TrackButton tracked={tracked} onTrack={onTrack} />
        {!tracked && <DismissButton hidden={hidden} onClick={onToggleHidden} />}
      </div>
    </div>
  )
}

type PickKind = 'soon' | 'big' | 'quick'
const PICK_META: Record<PickKind, { label: string; color: string }> = {
  soon: { label: 'Closes soon', color: '#B93A3A' },
  big: { label: 'Biggest award for you', color: '#C47A12' },
  quick: { label: 'Quick to apply', color: '#1D7FC4' },
}

/** A few matches worth acting on first, each tagged with why it was picked. */
function pickScholarships(pool: ScoredScholarship[]): Array<{ kind: PickKind; match: ScoredScholarship; why: string }> {
  const open = pool.filter((r) => (scholarshipDaysLeft(r.scholarship) ?? 1) >= 0 && r.score.total >= 20)
  const byScore = [...open].sort((a, b) => b.score.total - a.score.total)
  const picks: Array<{ kind: PickKind; match: ScoredScholarship; why: string }> = []
  const taken = new Set<string>()
  const take = (kind: PickKind, match: ScoredScholarship | undefined, why: (m: ScoredScholarship) => string) => {
    if (!match || taken.has(match.scholarship.id)) return
    taken.add(match.scholarship.id)
    picks.push({ kind, match, why: why(match) })
  }
  take('soon', byScore.find((r) => { const d = scholarshipDaysLeft(r.scholarship); return d != null && d <= 30 }),
    (m) => `${matchStrengthLabel(m.score.total).label}, due in ${roughDuration(scholarshipDaysLeft(m.scholarship) ?? 0)}.`)
  take('big', [...open].filter((r) => r.score.total >= 45 && !taken.has(r.scholarship.id)).sort((a, b) => (scholarshipAwardValueCents(b.scholarship) ?? 0) - (scholarshipAwardValueCents(a.scholarship) ?? 0))[0],
    (m) => `${formatScholarshipAmount(m.scholarship)}, the largest of your good matches.`)
  take('quick', byScore.find((r) => !taken.has(r.scholarship.id) && !needsEssay(r.scholarship.application_requirements) && r.scholarship.application_requirements.length <= 2),
    () => 'No essay, and little else to send.')
  return picks
}

const PrefChip = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => (
  <button type="button" aria-pressed={on} onClick={onClick}
    style={{ padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: font, fontSize: 12.5, fontWeight: on ? 600 : 500, border: `1px solid ${on ? MC : C.border}`, background: on ? MC : C.white, color: on ? C.white : C.text }}>
    {label}
  </button>
)

function PrefSegmented<T extends string | number | boolean>({ options, value, onChange }: { options: Array<{ key: T; label: string }>; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'inline-flex', background: C.surfaceHover, borderRadius: 9, padding: 3, gap: 2, flexWrap: 'wrap' }}>
      {options.map((o) => {
        const active = o.key === value
        return (
          <button key={String(o.key)} type="button" onClick={() => onChange(o.key)} aria-pressed={active}
            style={{ padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: font, fontSize: 12.5, fontWeight: active ? 600 : 500, background: active ? C.white : 'transparent', color: active ? MC : C.textMuted, boxShadow: active ? C.shadow1 : 'none' }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

const PrefSection = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: C.text, marginBottom: hint ? 1 : 8 }}>{title}</div>
    {hint && <div style={{ fontFamily: font, fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{hint}</div>}
    {children}
  </div>
)

const toggleIn = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/** The Aid Engine's first-run questions, like Discover's CollegePrefsForm. */
function AidPrefsForm({ value, onSave, submitLabel }: { value: AidPrefs; onSave: (next: AidPrefs) => void; submitLabel: string }) {
  const [d, setD] = useState<AidPrefs>(value)
  const types: Array<{ key: ScholarshipType; label: string }> = [
    { key: 'Merit', label: 'Merit' }, { key: 'Need', label: 'Need-based' }, { key: 'Identity', label: 'Identity & background' }, { key: 'Local', label: 'Local' },
  ]
  return (
    <div style={{ maxWidth: 660 }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 21, color: C.text, margin: 0 }}>Find scholarships that fit you</h2>
        <p style={{ fontFamily: font, fontSize: 13, color: C.textMuted, margin: '5px 0 0', lineHeight: 1.5 }}>
          A few quick questions so we can rank every award for <em>you</em>. All optional. Your profile already covers GPA, income and background.
        </p>
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 22px', boxShadow: C.shadow1 }}>
        <PrefSection title="What are you into?" hint="Awards for your interests rank higher.">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {INTEREST_OPTIONS.map((o) => (
              <PrefChip key={o.key} on={d.interests.includes(o.key)} label={o.label} onClick={() => setD((p) => ({ ...p, interests: toggleIn(p.interests, o.key) }))} />
            ))}
          </div>
        </PrefSection>
        <PrefSection title="Kinds of awards" hint="Leave them all off to see every kind.">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {types.map((t) => (
              <PrefChip key={t.key} on={d.types.includes(t.key)} label={t.label} onClick={() => setD((p) => ({ ...p, types: toggleIn(p.types, t.key) }))} />
            ))}
          </div>
        </PrefSection>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
          <PrefSection title="Smallest award worth applying for">
            <PrefSegmented options={AWARD_MINIMUMS.map((m) => ({ key: m as number, label: m === 0 ? 'Any' : `$${m / 1000}K+` }))} value={d.minAward} onChange={(v) => setD((p) => ({ ...p, minAward: v }))} />
          </PrefSection>
          <PrefSection title="Essays">
            <PrefSegmented options={[{ key: true, label: 'Fine with essays' }, { key: false, label: 'No essays' }]} value={d.essays} onChange={(v) => setD((p) => ({ ...p, essays: v }))} />
          </PrefSection>
        </div>
        <PrefSection title="State and regional awards" hint="Some awards are only for students in certain places, and we can't tell which yet. Include them to check each one yourself.">
          <PrefSegmented options={[{ key: true, label: 'Include them' }, { key: false, label: 'National only' }]} value={d.regional} onChange={(v) => setD((p) => ({ ...p, regional: v }))} />
        </PrefSection>
      </div>
      <button type="button" onClick={() => onSave({ ...d, completed: true })}
        style={{ marginTop: 16, padding: '11px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: MC, color: C.white, fontFamily: font, fontSize: 14.5, fontWeight: 600, boxShadow: C.shadow2 }}>
        {submitLabel}
      </button>
    </div>
  )
}

/** The student's tracked scholarships at the top of the Aid Engine, like
 *  Discover's list strip: what's tracked and what's due next, one click away. */
function TrackedStrip({ api, onOpen }: { api: TrackerApi; onOpen: (id: string | null) => void }) {
  const open = api.items.filter((i) => isOpenStatus(i.status))
  const potential = open.reduce((sum, i) => sum + (parseTrackerAmount(i.amount) ?? 0), 0)
  return (
    <section style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 16px', marginBottom: 18 }}>
      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
        <SecLabel style={{ marginBottom: 2 }}>My Scholarships</SecLabel>
        <div style={{ fontFamily: font, fontSize: 13, color: C.text }}>
          {api.items.length === 0
            ? 'Nothing tracked yet. Tap + Track on any match to start its checklist.'
            : <><b>{api.items.length}</b> tracked{potential > 0 && <> · <b>${potential.toLocaleString()}</b> still to win</>}</>}
        </div>
      </div>
      {api.items.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {api.items.slice(0, 4).map((i) => (
            <button key={i.id} onClick={() => onOpen(i.id)} title={i.name}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: 180, padding: '4px 10px', borderRadius: 99, border: `1px solid ${C.border}`, background: C.bg, cursor: 'pointer', fontFamily: font, fontSize: 12, color: C.text }}>
              <span aria-hidden>{typeEmoji(i.type)}</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.name}</span>
            </button>
          ))}
          <button onClick={() => onOpen(null)} style={{ background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer', fontFamily: font, fontSize: 12.5, fontWeight: 600, color: MC, whiteSpace: 'nowrap' }}>
            {api.items.length > 4 ? `All ${api.items.length} →` : 'Open →'}
          </button>
        </div>
      )}
    </section>
  )
}

interface AidEngineTabProps {
  api: TrackerApi
  userDemoTags: string[]
  userDemographics: Demographics | null
  prefs: AidPrefs
  prefsLoaded: boolean
  onSavePrefs: (p: AidPrefs) => void
  dismissals: Dismissals
  /** Show one tracked scholarship (or the list, for null) in My Scholarships. */
  onOpenTracked: (id: string | null) => void
}

const PAGE = 40

const AidEngineTab = ({ api, userDemoTags, userDemographics, prefs, prefsLoaded, onSavePrefs, dismissals, onOpenTracked }: AidEngineTabProps) => {
  const [editing, setEditing] = useState(false)
  const [results, setResults] = useState<ScoredScholarship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('match')
  const [filterMatch, setFilterMatch] = useState<MatchStrength>('all')
  const [filterDeadline, setFilterDeadline] = useState<DeadlineFilter>('all')
  const [showHidden, setShowHidden] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE)
  const [detail, setDetail] = useState<ScoredScholarship | null>(null)

  const userProfile = useMemo(
    (): UserAidProfile => ({
      familyIncomeCents: userDemographics ? parseIncomeToRange(userDemographics.income_level) : null,
      gpa: userDemographics ? parseGpa(userDemographics.gpa) : null,
    }),
    [userDemographics],
  )
  // Interests score like profile tags. Joined so a new array with the same
  // tags doesn't rescore.
  const tagKey = [...userDemoTags, ...interestTags(prefs)].join(',')

  useEffect(() => {
    if (!prefs.completed) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset loading/error before the async fetch
    setLoading(true)
    setError(null)
    getAllScholarshipsScored(tagKey ? tagKey.split(',') : [], userProfile)
      .then((data) => { if (!cancelled) setResults(data) })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [prefs.completed, tagKey, userProfile])

  if (!prefsLoaded) return <div style={{ fontFamily: font, color: C.textMuted, padding: '24px 28px' }}>Loading…</div>
  if (editing || !prefs.completed) {
    return (
      <div style={{ padding: '24px 28px' }}>
        <AidPrefsForm value={prefs} submitLabel={prefs.completed ? 'Update matches' : 'Find my matches'} onSave={(p) => { onSavePrefs(p); setEditing(false); setVisibleCount(PAGE) }} />
        {editing && (
          <button type="button" onClick={() => setEditing(false)} style={{ marginTop: 10, background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontFamily: font, fontSize: 13 }}>
            Cancel
          </button>
        )}
      </div>
    )
  }

  const trackedIds = new Set(api.items.map((i) => i.scholarshipId).filter((id): id is string => !!id))
  if (detail) {
    return (
      <ScholarshipDetailView
        match={detail}
        userProfile={userProfile}
        tracked={trackedIds.has(detail.scholarship.id)}
        onBack={() => setDetail(null)}
        onTrack={() => api.add(detail.scholarship)}
      />
    )
  }

  // What the preferences let through; filters below narrow it further.
  const pool = results.filter(({ scholarship: s }) => fitsAidPrefs(s, prefs))
  const shownPool = pool.filter(({ scholarship: s }) => !dismissals.ids.has(s.id))
  const filtered = pool
    .filter(({ scholarship: s }) => dismissals.ids.has(s.id) === showHidden)
    .filter(({ scholarship: s }) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || (s.provider ?? '').toLowerCase().includes(q)
    })
    .filter(({ score }) => {
      if (filterMatch === 'all') return true
      if (filterMatch === 'strong') return score.total >= 70
      if (filterMatch === 'good') return score.total >= 45
      return score.total >= 20
    })
    .filter(({ scholarship: s }) => {
      if (filterDeadline === 'all') return true
      const days = scholarshipDaysLeft(s)
      if (days == null) return filterDeadline === 'later'
      if (days < 0) return false
      if (filterDeadline === 'urgent') return days <= 30
      if (filterDeadline === 'upcoming') return days <= 90
      return days > 90
    })
    .sort((a, b) => {
      if (sortBy === 'match') return b.score.total - a.score.total
      if (sortBy === 'amount') return (scholarshipAwardValueCents(b.scholarship) ?? 0) - (scholarshipAwardValueCents(a.scholarship) ?? 0)
      // Soonest first; undated and already-closed sink to the bottom.
      const key = (s: Scholarship) => {
        const d = scholarshipDaysLeft(s)
        return d == null ? 1e9 : d < 0 ? 1e9 - 1 : d
      }
      return key(a.scholarship) - key(b.scholarship)
    })
  const shown = filtered.slice(0, visibleCount)
  const picks = loading ? [] : pickScholarships(shownPool.filter(({ scholarship: s }) => !trackedIds.has(s.id)))
  // Scoring also uses GPA and income, so only nothing at all is neutral.
  const noProfile = userDemoTags.length === 0 && prefs.interests.length === 0 && !userDemographics?.gpa && !userDemographics?.income_level

  const resetPage = () => setVisibleCount(PAGE)
  const selectStyle = { fontFamily: font, fontSize: 12.5, color: C.text, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', outline: 'none' } as const
  const matchChip = (id: MatchStrength, label: string) => {
    const on = filterMatch === id
    const color = id === 'all' ? MC : MATCH_COLORS[id]
    return (
      <button key={id} type="button" aria-pressed={on} onClick={() => { setFilterMatch(id); resetPage() }}
        style={{ padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: font, fontSize: 12.5, fontWeight: on ? 600 : 500, border: `1px solid ${on ? color : C.border}`, background: on ? color : C.white, color: on ? C.white : C.text }}>
        {label}
      </button>
    )
  }
  const track = (s: Scholarship) => api.add(s)
  const toggleHidden = (s: Scholarship) => (showHidden ? dismissals.restore(s.id) : dismissals.dismiss(s))

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div>
          <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, fontWeight: 400, color: C.text, margin: 0 }}>Aid Engine</h2>
          <p style={{ fontFamily: font, fontSize: 13.5, color: C.textMuted, margin: '4px 0 0' }}>
            Scholarships scored for how well they fit you. Track any to work on it in My Scholarships.
          </p>
          {/* This catalogue is hand-curated and does not refresh itself, so
              dates and amounts drift between cycles. Saying so is the honest
              alternative to a freshness date nobody is committed to keeping
              true. Confirming on the official page is the habit that protects
              a student either way. */}
          <p style={{ fontFamily: font, fontSize: 12, color: C.textFaint, margin: '6px 0 0', lineHeight: 1.5 }}>
            Every award here is checked by hand rather than scraped, so the list is short on purpose. Always confirm
            the amount and the deadline on the provider&rsquo;s own page before you apply.
          </p>
        </div>
        <button type="button" onClick={() => setEditing(true)}
          style={{ flexShrink: 0, padding: '7px 13px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.text, cursor: 'pointer', fontFamily: font, fontSize: 13, fontWeight: 500 }}>
          Edit preferences
        </button>
      </div>

      <TrackedStrip api={api} onOpen={onOpenTracked} />

      {noProfile && !loading && (
        <div style={{ marginBottom: 18 }}>
          <Callout icon={I.info} title="Complete your profile" body="Fill out your demographic survey for personalized scholarship rankings. Without profile data, all scholarships get a neutral score." color="#C47A12" />
        </div>
      )}

      {picks.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
            <SecLabel style={{ marginBottom: 0 }}>Picked for you</SecLabel>
            <span style={{ fontFamily: font, fontSize: 12, color: C.textMuted }}>Worth starting on first</span>
          </div>
          <div className="pfy-row" style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 6 }}>
            {picks.map((p) => (
              <div key={p.match.scholarship.id} {...cardProps(() => setDetail(p.match))}
                style={{ flex: '0 0 260px', scrollSnapAlign: 'start', background: 'var(--card-soft)', border: `1px solid ${C.border}`, borderTop: `3px solid ${PICK_META[p.kind].color}`, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' }}>
                <span style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: PICK_META[p.kind].color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{PICK_META[p.kind].label}</span>
                <span style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{p.match.scholarship.name}</span>
                <span style={{ fontFamily: font, fontSize: 12, color: C.textMuted, lineHeight: 1.4 }}>{p.why}</span>
                <span style={{ marginTop: 'auto', paddingTop: 4 }}><TrackButton tracked={false} onTrack={() => track(p.match.scholarship)} /></span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        {matchChip('all', 'All matches')}
        {matchChip('strong', 'Strong')}
        {matchChip('good', 'Good+')}
        {matchChip('fair', 'Fair+')}
        <HiddenToggle count={pool.length - shownPool.length} on={showHidden} onToggle={() => { setShowHidden((v) => !v); resetPage() }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filterDeadline} onChange={(e) => { setFilterDeadline(e.target.value as DeadlineFilter); resetPage() }} aria-label="Deadline" style={selectStyle}>
            <option value="all">Any deadline</option>
            <option value="urgent">Due in 30 days</option>
            <option value="upcoming">Due in 90 days</option>
            <option value="later">90+ days or rolling</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} aria-label="Sort scholarships" style={selectStyle}>
            <option value="match">Best match</option>
            <option value="amount">Highest award</option>
            <option value="deadline">Soonest deadline</option>
          </select>
          <input type="search" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); resetPage() }} placeholder="Search…" aria-label="Search scholarships"
            style={{ minWidth: 160, fontFamily: font, fontSize: 13, color: C.text, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 11px', outline: 'none' }} />
        </div>
      </div>

      {loading ? (
        <p style={{ fontFamily: font, fontSize: 13, color: C.textMuted }}>Scoring scholarships…</p>
      ) : error ? (
        <div style={{ padding: 12, background: '#FAEAEA', border: '1px solid #B93A3A40', borderRadius: 8, color: '#B93A3A', fontFamily: font, fontSize: 13 }}>Couldn't load scholarships: {error}</div>
      ) : filtered.length === 0 ? (
        <p style={{ fontFamily: font, fontSize: 13, color: C.textFaint, textAlign: 'center', padding: 20 }}>
          {showHidden ? 'Nothing hidden here.' : pool.length === 0 ? 'Nothing fits your preferences yet. Try widening them.' : 'No scholarships match these filters.'}
        </p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, alignItems: 'stretch' }}>
            {shown.map((r) => (
              <AidMatchCard
                key={r.scholarship.id}
                match={r}
                userProfile={userProfile}
                tracked={trackedIds.has(r.scholarship.id)}
                hidden={showHidden}
                onOpen={() => setDetail(r)}
                onTrack={() => track(r.scholarship)}
                onToggleHidden={() => toggleHidden(r.scholarship)}
              />
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {filtered.length > shown.length && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button type="button" onClick={() => setVisibleCount((c) => c + PAGE)}
                  style={{ padding: '9px 20px', borderRadius: 10, border: `1px solid ${MC}`, background: C.white, color: MC, cursor: 'pointer', fontFamily: font, fontSize: 13.5, fontWeight: 600 }}>
                  Show more
                </button>
                <button type="button" onClick={() => setVisibleCount(filtered.length)}
                  style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: 'transparent', color: C.textMuted, cursor: 'pointer', fontFamily: font, fontSize: 13 }}>
                  Show all {filtered.length}
                </button>
              </div>
            )}
            <div style={{ fontFamily: font, fontSize: 12.5, color: C.textMuted }}>Showing {shown.length} of {filtered.length}</div>
          </div>
        </>
      )}

      <IngestionHealthPanel />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   COLLEGE SEARCH (Deadlines)
   ═══════════════════════════════════════════════════════════════ */
const CollegeSearch = ({
  collegeIds,
  onAdd,
  placeholder = 'Search colleges to add...',
}: {
  /**
   * Ids already on the list, in both shapes: the raw saved strings and the
   * canonical `sc-` ids they resolve to. Comparing only the raw strings would
   * offer "+ Add" for a school the student already has saved under a legacy
   * slug, and adding it would put the same school on the list twice.
   */
  collegeIds: string[]
  onAdd: (id: string) => void
  placeholder?: string
}) => {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [results, setResults] = useState<AidCollege[]>([])
  const [searching, setSearching] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Debounced, because this now hits the ~6,300-row table rather than filtering
  // a 46-element array in memory. Same debounce as Discover's name search.
  useEffect(() => {
    const q = query.trim()
    let cancelled = false
    const timer = setTimeout(async () => {
      if (q.length < 2) { if (!cancelled) { setResults([]); setSearching(false) }; return }
      if (!cancelled) { setSearching(true); setSearchFailed(false) }
      try {
        const r = await searchAidColleges(q, 8)
        if (!cancelled) { setResults(r); setSearching(false) }
      } catch {
        // An empty dropdown would read as "no such school", which is the exact
        // wrong message when the lookup is what failed.
        if (!cancelled) { setResults([]); setSearchFailed(true); setSearching(false) }
      }
    }, q.length < 2 ? 0 : 220)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query])

  const visible = results.filter((c) => !collegeIds.includes(c.canonicalId)).slice(0, 8)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setFocused(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const showDropdown = focused && query.length >= 1

  return (
    <div ref={wrapRef} style={{ position: 'relative', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={placeholder}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {showDropdown && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: C.shadow3, zIndex: 20, maxHeight: 280, overflowY: 'auto' }}>
          {visible.length === 0 ? (
            <div style={{ padding: '12px 14px', fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted }}>
              {query.trim().length < 2
                ? 'Type to search...'
                : searching
                  ? 'Searching...'
                  : searchFailed
                    ? "Couldn't reach college search — check your connection and try again"
                    : 'No matching colleges found'}
            </div>
          ) : visible.map((c) => (
            <button
              key={c.id}
              onClick={() => { onAdd(c.id); setQuery(''); setFocused(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', border: 'none', borderBottom: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.surfaceHover }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <CollegeLogo logoUrl={logoUrlForDomain(c.domain)} emoji={c.emoji} size={18} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>{c.type} &middot; {c.state}</div>
              </div>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: MC }}>+ Add</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB: DEADLINES
   ═══════════════════════════════════════════════════════════════ */
const URGENCY_META: Record<'high' | 'medium' | 'low', { label: string; color: string; bg: string }> = {
  high: { label: 'Act Now', color: '#B93A3A', bg: '#FAEAEA' },
  medium: { label: 'Upcoming', color: '#C47A12', bg: '#F5EDE5' },
  low: { label: 'On Track', color: '#2D9E72', bg: '#EBF5F0' },
}

interface DeadlinesTabProps {
  collegeIds: string[]
  aid: AidCollegesState
  onAddCollege: (id: string) => void
  onRemoveCollege: (id: string) => void
  /** Saved in this module, so removable here (not Application Tracking's). */
  removableIds: ReadonlySet<string>
  /** `profiles.grade_start_idx`, which decides whose FAFSA this is. */
  gradeStartIdx: number | null | undefined
}

const DeadlinesTab = ({ collegeIds, aid, onAddCollege, onRemoveCollege, removableIds, gradeStartIdx }: DeadlinesTabProps) => {
  const [open, setOpen] = useState<string | null>(null)
  const { colleges, loading, failed, unresolved } = aid
  // The October the student's own FAFSA opens — the same date their calendar
  // shows. It was written in as Oct 1, 2026 and "~6 months away" for everyone.
  const now = new Date()
  const seniorFall = seniorFallYear(gradeStartIdx, now)
  const { date: opens, known } = fafsaOpening(seniorFall)
  const opensOn = formatCollegeDate(opens)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const daysToOpen = Math.round((opens.getTime() - today) / 86_400_000)
  // The CSS Profile opens by October 1 each year, sometimes sooner.
  const cssOpens = new Date(seniorFall, 9, 1)
  return (
    <div style={{ padding: '28px 30px' }}>
      <h1 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, fontWeight: 400, color: C.text, margin: '0 0 4px' }}>Deadlines</h1>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: C.textMuted, margin: '0 0 18px', lineHeight: 1.5 }}>
        Financial aid deadlines for your college list. Missing a priority deadline can cost thousands in aid.
      </p>

      <div style={{ marginBottom: 20 }}>
        <Callout
          icon="⏰"
          title={daysToOpen > 0 ? `Your FAFSA opens ${known ? '' : 'by '}${opensOn}` : `Your FAFSA opened ${opensOn}`}
          body={daysToOpen > 0
            ? `That's ${daysLabel(daysToOpen)}. File as close to opening day as possible for maximum aid. Don't wait until your application deadlines — many school aid funds run out.`
            : "It's open now. File as soon as you can — don't wait for your application deadlines, because many school aid funds run out."}
          color="#C47A12"
          bg="#FFF3E0"
        />
      </div>

      <div data-tour="deadlines-search"><CollegeSearch collegeIds={[...collegeIds, ...colleges.map((c) => c.canonicalId)]} onAdd={onAddCollege} placeholder="Search colleges to add to your list..." /></div>

      {failed ? <ListFailed /> : loading ? <ListLoading /> : colleges.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎓</div>
          <div style={{ fontFamily: "'Young Serif',serif", fontSize: 18, color: C.text, marginBottom: 6 }}>No colleges yet</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, maxWidth: 340, margin: '0 auto', lineHeight: 1.5 }}>
            Search above to add any of the ~6,300 US colleges in our database. Your deadlines and financial aid timelines will appear here.
          </div>
        </div>
      ) : (
        <>
      {unresolved.length > 0 && <UnresolvedNotice ids={unresolved} />}
      <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
        {Object.values(URGENCY_META).map((u) => (
          <div key={u.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: u.color, flexShrink: 0 }} />
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>{u.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {colleges.map((saved) => {
          const col = inCycle(saved, seniorFall)
          const urgency = computeUrgency(col)
          const urg = URGENCY_META[urgency]
          const note = computeDaysNote(col)
          const isOpen = open === col.id
          const earlyDate = col.applicationDeadlines.earlyAction || col.applicationDeadlines.earlyDecision || null
          const earlyLabel = col.applicationDeadlines.earlyAction ? 'EA' : col.applicationDeadlines.earlyDecision ? 'ED' : null
          const cssDisplay = col.financialAidDeadlines.cssProfile || 'N/A'
          const guarantee = col.guarantee
          return (
            <div key={col.id} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${isOpen ? MC + '45' : C.border}`, overflow: 'hidden', boxShadow: C.shadow1 }}>
              <button onClick={() => setOpen(isOpen ? null : col.id)} style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '14px 16px', background: isOpen ? `${MC}06` : C.surface, border: 'none', borderBottom: isOpen ? `1px solid ${C.border}` : 'none', cursor: 'pointer', gap: 12, textAlign: 'left' }}>
                <CollegeLogo logoUrl={logoUrlForDomain(col.domain)} emoji={col.emoji} size={22} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontFamily: "'Young Serif',serif", fontSize: 15, color: C.text }}>{col.name}</span>
                    <Tag label={col.type} color={C.textMuted} bg={C.bg} />
                    {guarantee && <Tag label={guaranteeLabel(guarantee)} color="#C47A12" />}
                  </div>
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted }}>{note}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: urg.color, background: urg.bg, padding: '3px 10px', borderRadius: 99, border: `1px solid ${urg.color}30` }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: urg.color }} />{urg.label}
                  </span>
                  <span style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s ease', color: C.textMuted, display: 'flex' }}>{I.chevron}</span>
                </div>
              </button>

              {isOpen && (
                <div style={{ padding: '16px' }}>
                  {!col.curated && (
                    <div style={{ marginBottom: 12, padding: '9px 11px', borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>
                      We haven't verified deadlines for this school yet. Check its admissions and financial aid pages —
                      and treat anything blank below as unknown, not as "no deadline".
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 12 }}>
                    {[
                      // Only 46 schools have hand-checked dates. For the rest these are
                      // null, and an empty tile reads as a bug rather than as absent data.
                      { label: 'App Deadline', value: col.applicationDeadlines.regularDecision ?? '\u2014', note: earlyDate && earlyLabel ? `${earlyLabel}: ${earlyDate}` : null, accent: earlyDate ? '#C47A12' : null },
                      { label: 'FAFSA Priority', value: col.financialAidDeadlines.fafsaPriority ?? opensOn, note: col.financialAidDeadlines.fafsaPriority ? 'File by this date for best aid' : 'FAFSA opening day — this school has no published priority date', accent: null },
                      { label: 'CSS Profile', value: cssDisplay, note: cssDisplay !== 'N/A' ? 'Required for this school' : null, accent: cssDisplay !== 'N/A' ? '#B93A3A' : null },
                      { label: 'Aid Letter', value: col.financialAidDeadlines.aidNotification ?? '\u2014', note: col.financialAidDeadlines.aidNotification ? 'Estimated notification window' : null, accent: null },
                    ].map((d, j) => (
                      <div key={j} style={{ background: C.bg, borderRadius: 8, padding: '10px 12px', border: `1px solid ${C.border}` }}>
                        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, color: C.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{d.label}</div>
                        <div style={{ fontFamily: "'Young Serif',serif", fontSize: 15, color: d.accent || C.text }}>{d.value}</div>
                        {d.note && <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: d.accent || C.textMuted, marginTop: 2 }}>{d.note}</div>}
                      </div>
                    ))}
                  </div>
                  {cssDisplay !== 'N/A' && (
                    <div style={{ padding: '10px 13px', borderRadius: 8, background: '#FAEAEA', border: '1px solid #B93A3A25', display: 'flex', gap: 8, marginBottom: 10 }}>
                      <span style={{ color: '#B93A3A', flexShrink: 0, marginTop: 1 }}>{I.info}</span>
                      <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: '#B93A3A', lineHeight: 1.5 }}>
                        <strong>{col.name}</strong> requires the CSS Profile in addition to FAFSA. {cssOpens.getTime() > today ? `It opens by ${formatCollegeDate(cssOpens)}.` : 'It is open now.'} Missing the CSS deadline typically means missing institutional aid entirely.
                      </span>
                    </div>
                  )}
                  {col.meetsFullNeed && (
                    <div style={{ padding: '10px 13px', borderRadius: 8, background: '#EBF5F0', border: `1px solid ${MC}25`, display: 'flex', gap: 8, marginBottom: 10 }}>
                      <span style={{ color: MC, flexShrink: 0, marginTop: 1 }}>{I.info}</span>
                      <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: MC, lineHeight: 1.5 }}>
                        <strong>{col.name}</strong> meets 100% of demonstrated financial need{col.noLoanPolicy ? ' with a no-loan policy (grants only)' : ''}.
                      </span>
                    </div>
                  )}
                  {/* The school's own aid application is where income guarantees
                      are won or lost, so every four-year school gets this, not
                      just the ones with a guarantee on file. Matches the task
                      list, which gives the aid task to four-year schools only. */}
                  {(guarantee || col.type === '4-year') && <div style={{ padding: '10px 13px', borderRadius: 8, background: '#C47A120D', border: '1px solid #C47A1240', display: 'flex', gap: 8, marginBottom: 10 }}>
                    <span style={{ color: '#C47A12', flexShrink: 0, marginTop: 1 }}>{I.info}</span>
                    <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text, lineHeight: 1.5 }}>
                      {guarantee ? (
                        <>
                          <strong style={{ color: '#C47A12' }}>{guaranteeLabel(guarantee)}.</strong> {guarantee.detail}{' '}
                          <strong>To get it:</strong> {guarantee.action}{' '}
                          <a href={guarantee.url} target="_blank" rel="noopener noreferrer" style={{ color: '#C47A12', fontWeight: 600 }}>Aid page ↗</a>
                        </>
                      ) : (
                        <>
                          <strong style={{ color: '#C47A12' }}>Check {col.name}’s own aid application.</strong> Many schools ask for more than the FAFSA — the CSS Profile or their own form — and some promise free tuition below a family income if you file on time.
                        </>
                      )}
                    </span>
                  </div>}
                  {removableIds.has(col.id) && <button
                    onClick={() => onRemoveCollege(col.id)}
                    style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid #B93A3A30`, background: '#FAEAEA', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: '#B93A3A', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    {I.trash} Remove
                  </button>}
                </div>
              )}
            </div>
          )
        })}
      </div>
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ROOT MODULE
   ═══════════════════════════════════════════════════════════════ */
interface Props {
  open: boolean
  onClose: () => void
  year?: number
  /** Deadline rail for the Overview tab. Built by the dashboard so every
   *  panel shares one set of handlers and one copy of the student's dates. */
  aside?: ReactNode
}

export default function FinancialAidModule({ open, onClose, year = 11, aside }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const toast = useToast()
  // Held in a ref so the load effect below re-runs only when the module
  // opens — not whenever a context re-render changes this object.
  const toastRef = useRef(toast)
  const tourSeen = profile?.settings?.intros_seen?.includes('fafsa-module-tour') ?? false
  const [showTour, setShowTour] = useState(false)
  useEffect(() => { toastRef.current = toast }, [toast])

  useEffect(() => {
    if (open && !tourSeen) {
      const t = setTimeout(() => setShowTour(true), 400)
      return () => clearTimeout(t)
    }
  }, [open, tourSeen])

  const isNarrow = useIsNarrow()
  // Opens on My Scholarships, as Application Tracking opens on Application
  // Status: a returning student wants to see where each one stands.
  const [tab, setTab] = useRoutedTab<TabId>('Financial Aid', open, FA_TAB_IDS, 'scholarships')
  // A tracked scholarship to open straight onto when switching to My
  // Scholarships (from the Aid Engine's strip). Any other tab change clears it.
  const [openScholarship, setOpenScholarship] = useState<string | null>(null)
  const switchTab = useCallback((t: TabId) => { setOpenScholarship(null); setTab(t) }, [setTab])
  // Reopens on My Scholarships rather than wherever it was left. The module
  // stays mounted while closed, so the tab would otherwise survive from a
  // visit the student no longer remembers. Adjusted on the open transition,
  // not in an effect, so the first paint is already the right tab.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setTab(routedTab('Financial Aid', FA_TAB_IDS) ?? 'scholarships'); setOpenScholarship(null) } // a tab in the URL wins
  }
  const [progress, setProgress] = useState<ChecklistProgressMap>({})
  const [progressError, setProgressError] = useState<string | null>(null)
  const [userDemoTags, setUserDemoTags] = useState<string[]>([])
  const [userDemographics, setUserDemographics] = useState<Demographics | null>(null)
  const [tracker, setTracker] = useState<DBTrackerItem[]>([])
  const [trackerLoaded, setTrackerLoaded] = useState(false)
  const [trackerError, setTrackerError] = useState<string | null>(null)
  const trackerRef = useRef(tracker)
  useEffect(() => { trackerRef.current = tracker }, [tracker])
  // Scholarships being added, so a double click can't add one twice.
  const addingRef = useRef(new Set<string>())
  const [collegeIds, setCollegeIds] = useState<string[]>([])
  // Application Tracking's list counts here too, as it does on the calendar;
  // the list saved in this module only adds to it. Its schools are removed
  // in Application Tracking, so only this module's own ones can be here.
  const { apps } = useApplications()
  const shownCollegeIds = useMemo(() => [...new Set([...apps.map((a) => a.collegeId), ...collegeIds])], [apps, collegeIds])
  const removableIds = useMemo(() => new Set(collegeIds.filter((id) => !apps.some((a) => a.collegeId === id))), [apps, collegeIds])
  // One lookup for Overview and Deadlines, so moving between them
  // does not refetch the same rows. Each opening of the module is its own
  // session, so reopening fetches fresh rather than showing last visit's rows.
  const [openCount, setOpenCount] = useState(0)
  const aidColleges = useAidColleges(shownCollegeIds, openCount)

  // "Not interested", kept per student with their other module data.
  const { data: dismissedIds, dataRef: dismissedRef, saveData: saveDismissed } =
    useModuleData<string>('fafsa', 'dismissed_scholarships', open)
  const dismissals = useMemo((): Dismissals => {
    const write = async (next: string[], done: string) => {
      if (await saveDismissed(next)) toast.info(done)
      else toast.error('Could not save that — try again')
    }
    return {
      ids: new Set(dismissedIds),
      dismiss: (s) => void write(
        [...dismissedRef.current.filter((id) => id !== s.id), s.id],
        `Hid ${s.name}. Bring it back from “Hidden”.`,
      ),
      restore: (id) => void write(dismissedRef.current.filter((x) => x !== id), 'Back in your list'),
    }
  }, [dismissedIds, dismissedRef, saveDismissed, toast])

  // Shared scholarship tasks the student has done: one set for all of them.
  const { data: sharedIds, dataRef: sharedRef, saveData: saveShared } =
    useModuleData<string>('fafsa', 'shared_scholarship_tasks', open)
  const sharedDone = useMemo(() => new Set(sharedIds), [sharedIds])
  const { value: aidPrefs, save: saveAidPrefs, loaded: aidPrefsLoaded } =
    useModuleValue<AidPrefs>('fafsa', 'aidPrefs', open, DEFAULT_AID_PREFS)

  // Esc key to close
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Load checklist progress + user demographics + tracker IDs from Supabase when the module opens
  useEffect(() => {
    if (!open) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset error before the async fetch
    setProgressError(null)
    setOpenCount((n) => n + 1)
    getChecklistProgress()
      .then((p) => {
        if (!cancelled) setProgress(p)
      })
      .catch((e) => {
        if (!cancelled) setProgressError(e instanceof Error ? e.message : String(e))
      })

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return
      supabase
        .from('profiles')
        .select('demographics')
        .eq('id', data.user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (cancelled || !profile?.demographics) return
          const d = profile.demographics as unknown as Demographics
          setUserDemographics(d)
          setUserDemoTags(demographicTagsForProfile(d))
        })
    })

    // One message for the three of them. Each failing alone leaves a different
    // part of the module quietly wrong — a tracked scholarship showing "+
    // Track", a saved college missing from the aid comparison, a cost estimate
    // gone — and three separate toasts for one dropped connection is noise.
    let loadFailed = false
    const noteFailure = () => {
      if (cancelled || loadFailed) return
      loadFailed = true
      toastRef.current.error("Some of your saved work didn't load — reload before adding anything, or you may end up with duplicates.")
    }

    getTrackerItems()
      .then((items) => {
        if (!cancelled) { setTracker(items); setTrackerLoaded(true); setTrackerError(null) }
      })
      .catch((e) => {
        if (cancelled) return
        setTrackerError(e instanceof Error ? e.message : String(e))
        noteFailure()
      })

    getCollegeList()
      .then((ids) => { if (!cancelled) setCollegeIds(ids) })
      .catch(noteFailure)

    return () => {
      cancelled = true
    }
  }, [open])

  const handleToggleChecklist = async (itemId: string) => {
    const currentStatus = progress[itemId] ?? 'available'
    const nextStatus = nextChecklistStatus(currentStatus)
    setProgress((prev) => ({ ...prev, [itemId]: nextStatus }))
    try {
      await setChecklistItem(itemId, nextStatus)
    } catch (e) {
      setProgress((prev) => ({ ...prev, [itemId]: currentStatus }))
      setProgressError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleAddCollege = async (id: string) => {
    if (collegeIds.includes(id)) return
    const next = [...collegeIds, id]
    setCollegeIds(next)
    try { await saveCollegeList(next) } catch { setCollegeIds(collegeIds); toast.error('Could not update your college list — try again') }
  }

  const handleRemoveCollege = async (id: string) => {
    const next = collegeIds.filter((x) => x !== id)
    setCollegeIds(next)
    try { await saveCollegeList(next) } catch { setCollegeIds(collegeIds); toast.error('Could not update your college list — try again') }
  }

  // Optimistic edits put back only the item they touched on failure, so a
  // second edit made meanwhile isn't undone with it.
  const restore = (item: DBTrackerItem) => setTracker((prev) => prev.map((t) => (t.id === item.id ? item : t)))
  const updateTracker: TrackerApi['update'] = async (id, fields, done = 'Changes saved') => {
    const before = trackerRef.current.find((t) => t.id === id)
    if (!before) return false
    setTracker((prev) => prev.map((t) => (t.id !== id ? t : {
      ...t,
      ...(fields.name !== undefined ? { name: fields.name } : {}),
      ...(fields.amount !== undefined ? { amount: fields.amount ?? 'Varies' } : {}),
      ...(fields.deadline !== undefined ? { deadline: fields.deadline ?? 'TBD' } : {}),
      ...(fields.deadlineDate !== undefined ? { deadlineDate: fields.deadlineDate } : {}),
      ...(fields.type !== undefined ? { type: fields.type } : {}),
      ...(fields.tasks !== undefined ? { tasks: fields.tasks } : {}),
    })))
    try {
      await updateTrackerItem(id, fields)
      if (done) toast.success(done)
      return true
    } catch {
      restore(before)
      toast.error('Could not save that — try again')
      return false
    }
  }
  const trackerApi: TrackerApi = {
    items: tracker,
    loaded: trackerLoaded,
    error: trackerError,
    sharedDone,
    add: async (s) => {
      if (!trackerLoaded) { toast.error("Your scholarships haven't loaded yet — reload before adding, or you may end up with duplicates."); return }
      if (trackerRef.current.some((t) => t.scholarshipId === s.id) || addingRef.current.has(s.id)) return
      addingRef.current.add(s.id)
      try {
        const item = await addTrackerItem({
          name: s.name,
          amount: formatScholarshipAmount(s),
          deadline: s.deadline_display ?? 'TBD',
          deadlineDate: s.deadline,
          status: 'researching',
          type: inferScholarshipType(s.demographic_tags),
          source: s.provider ?? 'Scholarship DB',
          scholarshipId: s.id,
        })
        setTracker((prev) => [item, ...prev])
        toast.success('Added to My Scholarships')
      } catch {
        toast.error('Could not add — try again')
      }
      addingRef.current.delete(s.id)
    },
    addCustom: async (input) => {
      try {
        const item = await addTrackerItem(input)
        setTracker((prev) => [item, ...prev])
        toast.success('Added to My Scholarships')
        return true
      } catch {
        toast.error('Could not add — try again')
        return false
      }
    },
    update: updateTracker,
    setStatus: async (id, status) => {
      const before = trackerRef.current.find((t) => t.id === id)
      if (!before) return
      setTracker((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
      try { await updateTrackerStatus(id, status) } catch { restore(before); toast.error('Could not update status — try again') }
    },
    remove: async (id) => {
      const snapshot = trackerRef.current
      setTracker((prev) => prev.filter((t) => t.id !== id))
      try {
        await removeTrackerItem(id)
        toast.info('Removed from My Scholarships')
      } catch {
        // Put it back where it was, keeping anything else changed meanwhile.
        const item = snapshot.find((t) => t.id === id)
        if (item) setTracker((prev) => [...prev.slice(0, snapshot.indexOf(item)), item, ...prev.slice(snapshot.indexOf(item))])
        toast.error('Could not remove — try again')
      }
    },
    setTasks: (id, tasks) => { void updateTracker(id, { tasks: ownTasks(tasks) }, '') },
    setShared: async (taskId, done) => {
      const next = done ? [...sharedRef.current.filter((x) => x !== taskId), taskId] : sharedRef.current.filter((x) => x !== taskId)
      if (!(await saveShared(next))) toast.error('Could not save that — try again')
    },
  }
  const openTracked = (id: string | null) => { setTab('scholarships'); setOpenScholarship(id) }
  const saveAidPrefsOrSay = async (p: AidPrefs) => {
    if (!(await saveAidPrefs(p))) toast.error('Could not save your preferences — try again')
  }

  if (!open) return null

  const yearMeta = YEARS[year] ?? YEARS[11]

  const content =
    tab === 'overview' ? <OverviewTab year={year} progress={progress} onToggle={handleToggleChecklist} aside={aside} homeState={grantStateFromZip(userDemographics?.zipcode)} aid={aidColleges} onGoToTab={switchTab} gradeStartIdx={profile?.grade_start_idx} /> :
    tab === 'scholarships' ? <ScholarshipsTab key={openScholarship ?? ''} api={trackerApi} gradeStartIdx={profile?.grade_start_idx} initialOpenId={openScholarship} onFindScholarships={() => switchTab('scholarship-search')} /> :
    tab === 'scholarship-search' ? <AidEngineTab api={trackerApi} userDemoTags={userDemoTags} userDemographics={userDemographics} prefs={aidPrefs} prefsLoaded={aidPrefsLoaded} onSavePrefs={(p) => void saveAidPrefsOrSay(p)} dismissals={dismissals} onOpenTracked={openTracked} /> :
    <DeadlinesTab collegeIds={shownCollegeIds} aid={aidColleges} onAddCollege={handleAddCollege} onRemoveCollege={handleRemoveCollege} removableIds={removableIds} gradeStartIdx={profile?.grade_start_idx} />

  return (
    <div role="dialog" aria-modal="true" aria-label="Financial Aid module" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: C.bg, display: 'flex', flexDirection: 'column', fontFamily: "'Outfit',sans-serif" }}>
      <style>{`
        @keyframes faid-bounce { 0%,100%{transform:translateY(0);opacity:0.5} 50%{transform:translateY(-4px);opacity:1} }
        .faid-root button, .faid-root select, .faid-root input, .faid-root textarea { font-family: inherit; }
        .faid-root ::-webkit-scrollbar { width: 6px; }
        .faid-root ::-webkit-scrollbar-track { background: transparent; }
        .faid-root ::-webkit-scrollbar-thumb { background: rgba(var(--line-rgb), 0.12); border-radius: 3px; }
      `}</style>

      <div className="faid-root" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div data-tour="breadcrumb" style={{ padding: isNarrow ? '12px 14px' : '13px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, background: C.surface, flexShrink: 0, whiteSpace: 'nowrap' }}>
          <button onClick={onClose} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 500, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Dashboard</button>
          <span style={{ color: C.textFaint }}>/</span>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>Financial Aid</span>
          {/* On a phone the tab strip right below already says which tab. */}
          {!isNarrow && <>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textFaint }}>·</span>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted }}>{FA_TABS.find((t) => t.id === tab)?.label}</span>
          </>}
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: yearMeta.color, background: yearMeta.tint, padding: '3px 10px', borderRadius: 99, border: `1px solid ${yearMeta.color}20` }}>
            {yearMeta.emoji} {yearMeta.label}{isNarrow ? '' : ' Year'}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, width: 30, height: 30, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}
          >
            {I.close}
          </button>
        </div>

        {progressError && (
          <div style={{ padding: '8px 22px', background: '#FAEAEA', borderBottom: '1px solid #B93A3A25', fontFamily: "'Outfit',sans-serif", fontSize: 12, color: '#B93A3A' }}>
            Couldn't sync checklist: {progressError}
          </div>
        )}

        {isNarrow ? (
          <>
            {/* Horizontal scrollable tab strip (replaces the vertical sidebar) */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0, padding: '10px 14px', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
              {FA_TABS.map((t) => {
                const isActive = tab === t.id
                return (
                  <button
                    key={t.id}
                    data-tour={`tab-${t.id}`}
                    onClick={() => switchTab(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, whiteSpace: 'nowrap',
                      padding: '7px 13px', borderRadius: 99, cursor: 'pointer',
                      border: `1px solid ${isActive ? `${MC}50` : C.border}`,
                      background: isActive ? `${MC}12` : C.surface,
                      color: isActive ? MC : C.textMuted,
                      fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    <span style={{ display: 'flex', flexShrink: 0, opacity: isActive ? 1 : 0.55 }}>{t.icon}</span>
                    {t.label}
                  </button>
                )
              })}
            </div>

            {/* Full-width content */}
            <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
              <div data-tour="content" style={{ height: '100%', overflowY: 'auto' }}>{content}</div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <ModuleTabNav active={tab} onTab={switchTab} progress={progress} onTour={() => setShowTour(true)} />
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              <div className="mov-scroll" data-tour="content" style={{ flex: 1, overflowY: 'auto' }}>{content}</div>
            </div>
          </div>
        )}
      </div>

      {/* Guided tour overlay */}
      <AnimatePresence>
        {showTour && (
          <FafsaModuleTour
            onStart={() => {
              if (user) markIntroSeen('fafsa-module-tour').then(refreshProfile).catch(() => {})
            }}
            onDismiss={() => setShowTour(false)}
            onSwitchTab={switchTab}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
