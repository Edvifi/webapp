import { useState, useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { markIntroSeen } from '../lib/profiles'
import FafsaModuleTour from './FafsaModuleTour'
import {
  getScholarships,
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
  sendChatMessage,
  demographicTagsForProfile,
  getAllScholarshipsScored,
  parseDeadlineDaysFromNow,
  parseIncomeToRange,
  parseGpa,
  getCollegeList,
  setCollegeList as saveCollegeList,
  getNpcRuns,
  saveNpcRun,
  type Scholarship,
  type TrackerItem as DBTrackerItem,
  type TrackerStatus as DBTrackerStatus,
  type TrackerType as DBTrackerType,
  type ChecklistProgressMap,
  type ChecklistItemStatus,
  type ChatMessage,
  type ScoredScholarship,
  type ScholarshipMatchScore,
  type NpcRun,
} from '../lib/fafsaData'
import { supabase } from '../lib/supabase'
import type { Demographics } from '../types/user'
import { CHECKLIST_CONTENT_MAP } from '../data/checklistContent'
import { getCollegeById, searchColleges, type CollegeInfo } from '../data/collegeData'
import { C, YEARS, MODULE_COLORS } from '../lib/designTokens'
import { useIsNarrow } from '../lib/useMediaQuery'
import ChecklistContentView from './ChecklistContentView'
import { Bar, SecLabel, Tag } from './moduleUI'

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

function nextTrackerStatus(s: DBTrackerStatus): DBTrackerStatus {
  const idx = SCHOLARSHIP_STATUSES.indexOf(s)
  return SCHOLARSHIP_STATUSES[(idx + 1) % SCHOLARSHIP_STATUSES.length]
}

type TrackerSort = 'recent' | 'deadline' | 'status' | 'amount'
const TRACKER_SORT_OPTIONS: Array<{ id: TrackerSort; label: string }> = [
  { id: 'recent', label: 'Recently added' },
  { id: 'deadline', label: 'Deadline (soonest)' },
  { id: 'status', label: 'Status' },
  { id: 'amount', label: 'Amount (highest)' },
]

/** Parse a leading dollar amount out of a tracker display string. "$2,500" → 2500, "$5K" → 5000, "Varies" → null. */
function parseTrackerAmount(display: string): number | null {
  if (!display) return null
  const m = display.trim().match(/^\$?\s*([\d,]+(?:\.\d+)?)\s*([kK])?/)
  if (!m) return null
  const n = parseFloat(m[1].replace(/,/g, ''))
  if (isNaN(n)) return null
  return m[2] ? n * 1000 : n
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

function computeUrgency(college: CollegeInfo): 'high' | 'medium' | 'low' {
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

function computeDaysNote(college: CollegeInfo): string {
  if (college.meetsFullNeed && college.noLoanPolicy) return 'Meets 100% need, no-loan policy'
  if (college.meetsFullNeed) return 'Meets 100% of demonstrated need'
  const d = daysUntil(college.applicationDeadlines.regularDecision)
  if (d !== null && d >= 0) return `~${d} days until app deadline`
  if (college.applicationDeadlines.regularDecision === 'Rolling') return 'Rolling admissions'
  return ''
}

/* ═══════════════════════════════════════════════════════════════
   SCHOLARSHIP TYPE INFERENCE (from Supabase demographic_tags)
   ═══════════════════════════════════════════════════════════════ */
function inferScholarshipType(tags: string[]): ScholarshipType {
  const t = new Set(tags)
  const identity = ['hispanic', 'latino', 'black', 'asian_pacific_islander', 'native_american', 'lgbtq', 'muslim', 'catholic', 'jewish', 'minority', 'immigrant', 'undocumented', 'daca', 'foster_youth']
  if (identity.some((x) => t.has(x))) return 'Identity'
  const need = ['financial_need', 'pell_eligible', 'low_income', 'single_parent', 'adversity']
  if (need.some((x) => t.has(x))) return 'Need'
  if (t.has('rural') || t.has('military_family')) return 'Local'
  return 'Merit'
}

function formatScholarshipAmount(s: Scholarship): string {
  if (s.award_amount_cents && s.award_amount_cents > 0) {
    const d = s.award_amount_cents / 100
    if (d >= 1000) return `$${(d / 1000).toFixed(d % 1000 === 0 ? 0 : 1)}K`
    return `$${d.toFixed(0)}`
  }
  return s.award_amount_note ?? 'Varies'
}

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
  bars: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="10" width="3" height="5" rx="0.5"/><rect x="5" y="6" width="3" height="9" rx="0.5"/><rect x="9" y="3" width="3" height="12" rx="0.5"/><rect x="13" y="8" width="3" height="7" rx="0.5"/></svg>,
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
    <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: `2.5px solid ${color}`, borderTopColor: 'transparent', display: 'inline-block', animation: 'faid-spin 1s linear infinite' }} />
  )
  return <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: '1.5px solid rgba(60,35,10,0.18)', display: 'inline-block' }} />
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
type TabId = 'overview' | 'scholarships' | 'scholarship-search' | 'deadlines' | 'aid-compare'

const FA_TABS: Array<{ id: TabId; label: string; icon: ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: I.overview },
  { id: 'scholarships', label: 'Scholarships', icon: I.star },
  { id: 'scholarship-search', label: 'Aid Engine', icon: I.sparkle },
  { id: 'deadlines', label: 'Deadlines', icon: I.cal },
  { id: 'aid-compare', label: 'Aid Compare', icon: I.bars },
]

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
  progress: ChecklistProgressMap
  onToggle: (itemId: string) => void
}

const OverviewTab = ({ progress, onToggle }: OverviewTabProps) => {
  const [activeContentId, setActiveContentId] = useState<string | null>(null)
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

  return (
    <div style={{ padding: '28px 30px' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: MC, textTransform: 'uppercase', letterSpacing: '0.07em', background: '#EBF5F0', padding: '4px 10px', borderRadius: 99, border: `1px solid ${MC}20`, marginBottom: 12 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: MC }} />Scholarship Hunt
      </div>
      <h1 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, fontWeight: 400, color: C.text, margin: '0 0 8px' }}>Financial Aid</h1>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: C.textMuted, margin: '0 0 20px', lineHeight: 1.6, maxWidth: 520 }}>
        Junior year is prime time to get ahead. You can't file FAFSA until October of senior year, but building your scholarship list and running net price calculators now puts you miles ahead.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'FAFSA Opens', value: 'Oct 1', sub: 'Senior year', color: '#2D9E72' },
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

      <div data-tour="overview-progress" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 18 }}>
        <div style={{ flex: 1 }}><Bar value={done / total} color={MC} height={6} /></div>
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, color: MC, whiteSpace: 'nowrap' }}>{done}/{total} completed</span>
      </div>

      <div style={{ marginBottom: 22 }}>
        <Callout icon="💡" title="Junior Year Priority" body="Create your FSA ID now — it must match your Social Security records exactly and takes up to 3 days to process. Do this before senior year hits." />
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
}

/* ═══════════════════════════════════════════════════════════════
   TAB: SCHOLARSHIPS  (Discover view uses real Supabase data)
   ═══════════════════════════════════════════════════════════════ */
const SCHOLARSHIP_TYPE_COLOR: Record<ScholarshipType, string> = {
  Merit: '#7048C8',
  Need: '#1D7FC4',
  Local: '#C47A12',
  Identity: '#2D9E72',
}

type ActiveDetail =
  | { kind: 'scholarship'; scholarship: Scholarship }
  | { kind: 'tracker'; trackerItem: DBTrackerItem }
  | null

const ScholarshipsTab = ({ userDemoTags }: { userDemoTags: string[] }) => {
  const toast = useToast()
  const [tracker, setTracker] = useState<DBTrackerItem[]>([])
  const [trackerLoading, setTrackerLoading] = useState(true)
  const [trackerError, setTrackerError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | ScholarshipType>('all')
  const [view, setView] = useState<'tracker' | 'discover'>('tracker')
  const [discover, setDiscover] = useState<Scholarship[]>([])
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [discoverError, setDiscoverError] = useState<string | null>(null)
  const [discoverFilter, setDiscoverFilter] = useState<'all' | ScholarshipType>('all')
  const [query, setQuery] = useState('')
  const [activeDetail, setActiveDetail] = useState<ActiveDetail>(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [customDeadline, setCustomDeadline] = useState('')
  const [customType, setCustomType] = useState<ScholarshipType>('Merit')
  const [customSource, setCustomSource] = useState('')
  const [customSubmitting, setCustomSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [trackerSort, setTrackerSort] = useState<TrackerSort>('recent')

  const resetCustomForm = () => {
    setCustomName('')
    setCustomAmount('')
    setCustomDeadline('')
    setCustomType('Merit')
    setCustomSource('')
    setEditingId(null)
    setShowCustomForm(false)
  }

  const startEdit = (item: DBTrackerItem) => {
    setEditingId(item.id)
    setCustomName(item.name)
    setCustomAmount(item.amount)
    setCustomDeadline(item.deadline)
    setCustomType(item.type ?? 'Merit')
    setShowCustomForm(true)
  }

  const saveEdit = async () => {
    if (!editingId || !customName.trim() || customSubmitting) return
    const id = editingId
    const amountDisplay = customAmount.trim() || 'Varies'
    const deadlineDisplay = customDeadline.trim() || 'TBD'
    const snapshot = tracker
    setCustomSubmitting(true)
    // optimistic update
    setTracker((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, name: customName.trim(), amount: amountDisplay, deadline: deadlineDisplay, type: customType } : t,
      ),
    )
    try {
      await updateTrackerItem(id, {
        name: customName.trim(),
        amount: customAmount.trim() || null,
        deadline: customDeadline.trim() || null,
        type: customType,
      })
      resetCustomForm()
      toast.success('Changes saved')
    } catch (e) {
      setTracker(snapshot)
      setTrackerError(e instanceof Error ? e.message : String(e))
      toast.error('Could not save changes — try again')
    } finally {
      setCustomSubmitting(false)
    }
  }

  const submitCustom = async () => {
    if (!customName.trim() || customSubmitting) return
    setCustomSubmitting(true)
    try {
      const newItem = await addTrackerItem({
        name: customName.trim(),
        amount: customAmount.trim() || null,
        deadline: customDeadline.trim() || null,
        status: 'researching',
        type: customType,
        source: customSource.trim() || 'Custom',
        scholarshipId: null,
      })
      setTracker((prev) => [newItem, ...prev])
      resetCustomForm()
      toast.success('Added to your tracker')
    } catch (e) {
      setTrackerError(e instanceof Error ? e.message : String(e))
      toast.error('Could not add — try again')
    } finally {
      setCustomSubmitting(false)
    }
  }

  // Load tracker from Supabase on mount
  useEffect(() => {
    let cancelled = false
    setTrackerLoading(true)
    setTrackerError(null)
    getTrackerItems()
      .then((data) => {
        if (!cancelled) setTracker(data)
      })
      .catch((e) => {
        if (!cancelled) setTrackerError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setTrackerLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Load discover list on first view switch
  useEffect(() => {
    if (view !== 'discover' || discover.length > 0) return
    let cancelled = false
    setDiscoverLoading(true)
    setDiscoverError(null)
    getScholarships()
      .then((data) => {
        if (!cancelled) setDiscover(data)
      })
      .catch((e) => {
        if (!cancelled) setDiscoverError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setDiscoverLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [view, discover.length])

  const cycleStatus = async (id: string) => {
    const current = tracker.find((t) => t.id === id)
    if (!current) return
    const nextStatus = nextTrackerStatus(current.status)
    // optimistic update
    setTracker((prev) => prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t)))
    try {
      await updateTrackerStatus(id, nextStatus)
    } catch (e) {
      // revert on failure
      setTracker((prev) => prev.map((t) => (t.id === id ? { ...t, status: current.status } : t)))
      setTrackerError(e instanceof Error ? e.message : String(e))
      toast.error('Could not update status — try again')
    }
  }

  const remove = async (id: string) => {
    const snapshot = tracker
    setTracker((prev) => prev.filter((s) => s.id !== id))
    try {
      await removeTrackerItem(id)
      toast.info('Removed from tracker')
    } catch (e) {
      setTracker(snapshot)
      setTrackerError(e instanceof Error ? e.message : String(e))
      toast.error('Could not remove — try again')
    }
  }

  const addFromDiscover = async (s: Scholarship) => {
    if (tracker.some((t) => t.scholarshipId === s.id)) {
      toast.info('Already in your tracker')
      setView('tracker')
      return
    }
    const type = inferScholarshipType(s.demographic_tags)
    const amount = formatScholarshipAmount(s)
    try {
      const newItem = await addTrackerItem({
        name: s.name,
        amount,
        deadline: s.deadline_display ?? 'TBD',
        status: 'researching',
        type,
        source: s.provider ?? 'Scholarship DB',
        scholarshipId: s.id,
      })
      setTracker((prev) => [newItem, ...prev])
      setView('tracker')
      toast.success('Added to your tracker')
    } catch (e) {
      setTrackerError(e instanceof Error ? e.message : String(e))
      toast.error('Could not add — try again')
    }
  }

  const types: Array<'all' | ScholarshipType> = ['all', 'Merit', 'Need', 'Local', 'Identity']
  const filteredByType = filterType === 'all' ? tracker : tracker.filter((s) => s.type === filterType)
  const filtered = [...filteredByType].sort((a, b) => {
    if (trackerSort === 'deadline') {
      const da = parseDeadlineDaysFromNow(a.deadline)
      const db = parseDeadlineDaysFromNow(b.deadline)
      if (da === null && db === null) return 0
      if (da === null) return 1
      if (db === null) return -1
      return da - db
    }
    if (trackerSort === 'status') {
      return SCHOLARSHIP_STATUSES.indexOf(a.status) - SCHOLARSHIP_STATUSES.indexOf(b.status)
    }
    if (trackerSort === 'amount') {
      const aa = parseTrackerAmount(a.amount)
      const ab = parseTrackerAmount(b.amount)
      if (aa === null && ab === null) return 0
      if (aa === null) return 1
      if (ab === null) return -1
      return ab - aa
    }
    return 0 // 'recent' — preserve incoming order
  })
  const totalPotential = tracker
    .filter((s) => s.amount.startsWith('$'))
    .reduce((a, s) => a + parseInt(s.amount.replace(/[$,]/g, '')) || 0, 0)

  const discoverTyped = discover.map((s) => ({ ...s, _type: inferScholarshipType(s.demographic_tags) }))
  const filteredDiscover = discoverTyped
    .filter((s) => discoverFilter === 'all' || s._type === discoverFilter)
    .filter((s) => {
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    })

  // Early return: detail view
  if (activeDetail) {
    return (
      <ScholarshipDetailView
        active={activeDetail}
        onBack={() => setActiveDetail(null)}
        onAddTracker={async (s) => {
          await addFromDiscover(s)
          setActiveDetail(null)
        }}
        onCycleStatus={async (id) => {
          await cycleStatus(id)
          // Refresh the active tracker item in place
          setActiveDetail((prev) => {
            if (prev?.kind !== 'tracker') return prev
            const updated = tracker.find((t) => t.id === id)
            return updated ? { kind: 'tracker', trackerItem: updated } : prev
          })
        }}
        onRemove={async (id) => {
          await remove(id)
          setActiveDetail(null)
        }}
      />
    )
  }

  return (
    <div style={{ padding: '28px 30px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, fontWeight: 400, color: C.text, margin: '0 0 4px' }}>Scholarships</h1>
          <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>
            Track your applications and discover awards from our database.
          </p>
        </div>
        <div data-tour="scholarships-toggle" style={{ display: 'flex', background: C.bg, borderRadius: 8, padding: 3, border: `1px solid ${C.border}`, gap: 2, flexShrink: 0 }}>
          {(['tracker', 'discover'] as const).map((id) => (
            <button
              key={id}
              onClick={() => setView(id)}
              style={{ padding: '5px 11px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: view === id ? 600 : 400, background: view === id ? C.surface : 'transparent', color: view === id ? C.text : C.textMuted, boxShadow: view === id ? C.shadow1 : 'none', transition: 'all 0.12s ease' }}
            >
              {id === 'tracker' ? 'My Tracker' : 'Discover'}
            </button>
          ))}
        </div>
      </div>

      {view === 'tracker' ? (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            {[
              { label: 'Tracked', value: tracker.length, color: MC },
              { label: 'Potential', value: `$${totalPotential.toLocaleString()}`, color: '#C47A12' },
              { label: 'Submitted', value: tracker.filter((s) => s.status === 'submitted' || s.status === 'awarded').length, color: '#7048C8' },
            ].map((stat, i) => (
              <div key={i} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: '10px 16px' }}>
                <div style={{ fontFamily: "'Young Serif',serif", fontSize: 18, color: stat.color }}>{stat.value}</div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>{stat.label}</div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexShrink: 0 }}>
              <button
                onClick={() => { setEditingId(null); setShowCustomForm(true) }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px', background: C.surface, border: `1px solid ${MC}40`, borderRadius: 10, cursor: 'pointer', color: MC, fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600 }}
              >
                {I.plus} Custom
              </button>
              <button
                onClick={() => setView('discover')}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px', background: MC, border: 'none', borderRadius: 10, cursor: 'pointer', color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600 }}
              >
                {I.plus} Discover
              </button>
            </div>
          </div>

          {/* Custom scholarship form */}
          {showCustomForm && (
            <div style={{ marginBottom: 14, padding: '16px 18px', background: C.surface, border: `1.5px solid ${MC}30`, borderRadius: 12, boxShadow: C.shadow2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: C.text }}>{editingId ? 'Edit scholarship' : 'Add a custom scholarship'}</span>
                <button onClick={resetCustomForm} aria-label="Close custom scholarship form" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 4 }}>Name *</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Rotary Club of San Diego Scholarship"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 4 }}>Amount</label>
                  <input
                    type="text"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="$2,500"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 4 }}>Deadline</label>
                  <input
                    type="text"
                    value={customDeadline}
                    onChange={(e) => setCustomDeadline(e.target.value)}
                    placeholder="Mar 1, 2027"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 4 }}>Type</label>
                  <select
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value as ScholarshipType)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="Merit">Merit</option>
                    <option value="Need">Need-based</option>
                    <option value="Local">Local</option>
                    <option value="Identity">Identity</option>
                  </select>
                </div>
                {!editingId && (
                  <div>
                    <label style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 4 }}>Source</label>
                    <input
                      type="text"
                      value={customSource}
                      onChange={(e) => setCustomSource(e.target.value)}
                      placeholder="e.g. School counselor, local org"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, outline: 'none' }}
                    />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={resetCustomForm}
                  style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.textMuted, fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => void (editingId ? saveEdit() : submitCustom())}
                  disabled={!customName.trim() || customSubmitting}
                  style={{
                    padding: '7px 18px', borderRadius: 8, border: 'none',
                    background: customName.trim() && !customSubmitting ? MC : C.border,
                    color: customName.trim() && !customSubmitting ? '#fff' : C.textFaint,
                    fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600,
                    cursor: customName.trim() && !customSubmitting ? 'pointer' : 'default',
                  }}
                >
                  {editingId
                    ? (customSubmitting ? 'Saving…' : 'Save changes')
                    : (customSubmitting ? 'Adding…' : 'Add to tracker')}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                style={{ padding: '4px 12px', borderRadius: 99, border: `1px solid ${filterType === t ? MC + '50' : C.border}`, background: filterType === t ? `${MC}12` : C.surface, color: filterType === t ? MC : C.textMuted, fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: filterType === t ? 600 : 400, cursor: 'pointer' }}
              >
                {t === 'all' ? 'All Types' : t}
              </button>
            ))}
            <select
              value={trackerSort}
              onChange={(e) => setTrackerSort(e.target.value as TrackerSort)}
              aria-label="Sort tracker"
              style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted, cursor: 'pointer', outline: 'none' }}
            >
              {TRACKER_SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>

          {trackerLoading && <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted }}>Loading your tracker…</p>}
          {trackerError && (
            <div style={{ padding: 12, background: '#FAEAEA', border: '1px solid #B93A3A40', borderRadius: 8, color: '#B93A3A', fontFamily: "'Outfit',sans-serif", fontSize: 13, marginBottom: 10 }}>
              {trackerError}
            </div>
          )}
          {!trackerLoading && tracker.length === 0 && (
            <div style={{ padding: '24px 20px', background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 10, textAlign: 'center' }}>
              <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, margin: '0 0 10px' }}>
                Your tracker is empty. Browse the Discover tab and tap <strong>+ Track</strong> on any scholarship to add it here.
              </p>
              <button onClick={() => setView('discover')} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${MC}40`, background: `${MC}12`, color: MC, fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Open Discover →
              </button>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((s) => {
              const sm = STATUS_META[s.status]
              const typeColor = s.type ? SCHOLARSHIP_TYPE_COLOR[s.type] : C.textMuted
              return (
                <div
                  key={s.id}
                  onClick={() => setActiveDetail({ kind: 'tracker', trackerItem: s })}
                  style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: '13px 16px', boxShadow: C.shadow1, cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.borderColor = C.borderStrong
                    ;(e.currentTarget as HTMLDivElement).style.background = C.surfaceHover
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.borderColor = C.border
                    ;(e.currentTarget as HTMLDivElement).style.background = C.surface
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: C.text }}>{s.name}</span>
                        {s.type && <Tag label={s.type} color={typeColor} />}
                      </div>
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted }}>💵 {s.amount}</span>
                        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted }}>📅 {s.deadline}</span>
                        {s.source && <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted }}>via {s.source}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          void cycleStatus(s.id)
                        }}
                        style={{ padding: '4px 10px', borderRadius: 99, border: `1px solid ${sm.color}40`, background: sm.bg, color: sm.color, fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {sm.label}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          startEdit(s)
                        }}
                        aria-label="Edit tracker item"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, display: 'flex', padding: 2, opacity: 0.6 }}
                      >
                        {I.pencil}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          void remove(s.id)
                        }}
                        aria-label="Remove scholarship from tracker"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, display: 'flex', padding: 2, opacity: 0.6 }}
                      >
                        {I.trash}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint, marginTop: 10 }}>Click any row for details · Tap the status badge to advance it →</p>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <Callout icon="🔍" title="Discover scholarships" body={`Browsing ${discover.length || 'our'} major national scholarships from our database. Filter by type, search by name, and add any award to your tracker. Always confirm amounts and deadlines on the official site before applying.`} />
          </div>

          {/* Matches your profile section */}
          {userDemoTags.length > 0 && !discoverLoading && !query.trim() && discoverFilter === 'all' && (() => {
            const tagSet = new Set(userDemoTags)
            const matches = discoverTyped.filter((s) =>
              s.demographic_tags.some((t) => tagSet.has(t))
            ).slice(0, 6)
            if (matches.length === 0) return null
            return (
              <div style={{ marginBottom: 20 }}>
                <SecLabel>Matches your profile</SecLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {matches.map((s) => {
                    const typeColor = SCHOLARSHIP_TYPE_COLOR[s._type]
                    const amount = formatScholarshipAmount(s)
                    const alreadyTracked = tracker.some((t) => t.scholarshipId === s.id)
                    const { _type: _t, ...scholarshipOnly } = s
                    return (
                      <div
                        key={s.id}
                        onClick={() => setActiveDetail({ kind: 'scholarship', scholarship: scholarshipOnly as Scholarship })}
                        style={{ background: C.surface, borderRadius: 10, border: `1.5px solid ${MC}25`, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s ease' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = `${MC}50` }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = `${MC}25` }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>{s.name}</span>
                          <Tag label={s._type} color={typeColor} />
                        </div>
                        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted, marginBottom: 6 }}>💵 {amount}{s.deadline_display ? ` · 📅 ${s.deadline_display}` : ''}</div>
                        {!alreadyTracked ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); void addFromDiscover(s) }}
                            style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${MC}40`, background: `${MC}08`, color: MC, fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                          >
                            + Track
                          </button>
                        ) : (
                          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 500, color: MC }}>Already tracked</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <input
              type="search"
              placeholder="Search scholarships…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search scholarships"
              style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setDiscoverFilter(t)}
                style={{ padding: '4px 12px', borderRadius: 99, border: `1px solid ${discoverFilter === t ? MC + '50' : C.border}`, background: discoverFilter === t ? `${MC}12` : C.surface, color: discoverFilter === t ? MC : C.textMuted, fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: discoverFilter === t ? 600 : 400, cursor: 'pointer' }}
              >
                {t === 'all' ? `All (${discoverTyped.length})` : `${t} (${discoverTyped.filter((s) => s._type === t).length})`}
              </button>
            ))}
          </div>

          {discoverLoading && <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted }}>Loading scholarships…</p>}
          {discoverError && <div style={{ padding: 12, background: '#FAEAEA', border: '1px solid #B93A3A40', borderRadius: 8, color: '#B93A3A', fontFamily: "'Outfit',sans-serif", fontSize: 13 }}>Couldn't load: {discoverError}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredDiscover.map((s) => {
              const typeColor = SCHOLARSHIP_TYPE_COLOR[s._type]
              const amount = formatScholarshipAmount(s)
              // Strip the injected _type field when handing the scholarship to the detail view
              const { _type: _t, ...scholarshipOnly } = s
              return (
                <div
                  key={s.id}
                  onClick={() => setActiveDetail({ kind: 'scholarship', scholarship: scholarshipOnly as Scholarship })}
                  style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: '13px 16px', boxShadow: C.shadow1, cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.borderColor = C.borderStrong
                    ;(e.currentTarget as HTMLDivElement).style.background = C.surfaceHover
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.borderColor = C.border
                    ;(e.currentTarget as HTMLDivElement).style.background = C.surface
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: C.text }}>{s.name}</span>
                        <Tag label={s._type} color={typeColor} />
                        {s.requires_fafsa && <Tag label="FAFSA required" color="#1D7FC4" />}
                      </div>
                      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted, margin: '0 0 6px', lineHeight: 1.5 }}>{s.description}</p>
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint }}>
                        <span>💵 {amount}</span>
                        {s.deadline_display && <span>📅 {s.deadline_display}</span>}
                        {s.provider && <span>🏛 {s.provider}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          void addFromDiscover(s)
                        }}
                        style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${MC}40`, background: `${MC}12`, color: MC, fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        {I.plus} Track
                      </button>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.textMuted, fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}
                      >
                        Open {I.extlink}
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
            {!discoverLoading && filteredDiscover.length === 0 && (
              <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textFaint, textAlign: 'center', padding: 20 }}>No scholarships match these filters.</p>
            )}
          </div>
          {filteredDiscover.length > 0 && (
            <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint, marginTop: 10, textAlign: 'center' }}>
              {filteredDiscover.length} of {discover.length} scholarships
            </p>
          )}
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SCHOLARSHIP DETAIL VIEW (inline replace within ScholarshipsTab)
   ═══════════════════════════════════════════════════════════════ */
interface ScholarshipDetailViewProps {
  active: { kind: 'scholarship'; scholarship: Scholarship } | { kind: 'tracker'; trackerItem: DBTrackerItem }
  onBack: () => void
  onAddTracker: (s: Scholarship) => Promise<void>
  onCycleStatus: (id: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

function ScholarshipDetailView({ active, onBack, onAddTracker, onCycleStatus, onRemove }: ScholarshipDetailViewProps) {
  const toast = useToast()
  const [scholarship, setScholarship] = useState<Scholarship | null>(
    active.kind === 'scholarship' ? active.scholarship : null,
  )
  const [loadingScholarship, setLoadingScholarship] = useState(
    active.kind === 'tracker' && active.trackerItem.scholarshipId !== null,
  )
  const [scholarshipError, setScholarshipError] = useState<string | null>(null)

  const [notesText, setNotesText] = useState('')
  const [notesLoading, setNotesLoading] = useState(active.kind === 'tracker')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSavedAt, setNotesSavedAt] = useState<Date | null>(null)
  const [notesDirty, setNotesDirty] = useState(false)

  // Fetch scholarship row if this is a tracker item with a scholarshipId
  useEffect(() => {
    if (active.kind === 'scholarship') {
      setScholarship(active.scholarship)
      return
    }
    if (!active.trackerItem.scholarshipId) {
      setLoadingScholarship(false)
      return
    }
    let cancelled = false
    setLoadingScholarship(true)
    setScholarshipError(null)
    getScholarship(active.trackerItem.scholarshipId)
      .then((data) => {
        if (!cancelled) setScholarship(data)
      })
      .catch((e) => {
        if (!cancelled) setScholarshipError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoadingScholarship(false)
      })
    return () => {
      cancelled = true
    }
  }, [active])

  // Load notes for tracker items
  useEffect(() => {
    if (active.kind !== 'tracker') return
    let cancelled = false
    setNotesLoading(true)
    getTrackerNotes(active.trackerItem.id)
      .then((notes) => {
        if (!cancelled) {
          setNotesText(notes ?? '')
          setNotesDirty(false)
        }
      })
      .catch(() => {
        if (!cancelled) setNotesText('')
      })
      .finally(() => {
        if (!cancelled) setNotesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [active])

  const saveNotes = async () => {
    if (active.kind !== 'tracker' || notesSaving) return
    setNotesSaving(true)
    try {
      await updateTrackerNotes(active.trackerItem.id, notesText)
      setNotesSavedAt(new Date())
      setNotesDirty(false)
      toast.success('Note saved')
    } catch {
      toast.error('Could not save your note — try again')
    } finally {
      setNotesSaving(false)
    }
  }

  const trackerItem = active.kind === 'tracker' ? active.trackerItem : null
  const displayName = scholarship?.name ?? trackerItem?.name ?? 'Scholarship'
  const displayProvider = scholarship?.provider ?? trackerItem?.source ?? null
  const inferredType: ScholarshipType | null = scholarship
    ? inferScholarshipType(scholarship.demographic_tags)
    : trackerItem?.type ?? null
  const typeColor = inferredType ? SCHOLARSHIP_TYPE_COLOR[inferredType] : C.textMuted
  const amount = scholarship
    ? formatScholarshipAmount(scholarship)
    : trackerItem?.amount ?? 'Varies'
  const deadline = scholarship?.deadline_display ?? trackerItem?.deadline ?? 'Check official site'
  const statusMeta = trackerItem ? STATUS_META[trackerItem.status] : null
  const renewableLabel =
    scholarship?.renewable_years != null
      ? scholarship.renewable_years === 1
        ? 'One-time award'
        : `Renewable up to ${scholarship.renewable_years} years`
      : null

  return (
    <div style={{ padding: '24px 30px 32px' }}>
      {/* Breadcrumb / back */}
      <button
        onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, padding: 0, marginBottom: 16 }}
      >
        ← Back to scholarships
      </button>

      {/* Hero */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {inferredType && <Tag label={inferredType} color={typeColor} />}
          {scholarship?.requires_fafsa && <Tag label="FAFSA required" color="#1D7FC4" />}
          {scholarship?.requires_css_profile && <Tag label="CSS Profile required" color="#7048C8" />}
        </div>
        <h1 style={{ fontFamily: "'Young Serif',serif", fontSize: 26, fontWeight: 400, color: C.text, margin: '0 0 6px', lineHeight: 1.2 }}>
          {displayName}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted }}>
          <span style={{ fontFamily: "'Young Serif',serif", fontSize: 16, color: MC }}>💵 {amount}</span>
          <span>📅 {deadline}</span>
          {scholarship?.num_awards_per_year != null && (
            <span>🏆 ~{scholarship.num_awards_per_year.toLocaleString()} awards/yr</span>
          )}
          {renewableLabel && <span>🔁 {renewableLabel}</span>}
        </div>
        {displayProvider && (
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textFaint, marginTop: 6 }}>
            Funded by {displayProvider}
          </div>
        )}
      </div>

      {/* Tracker actions bar */}
      {trackerItem && statusMeta && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 18 }}>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: C.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Status
          </span>
          <button
            onClick={() => void onCycleStatus(trackerItem.id)}
            style={{ padding: '4px 12px', borderRadius: 99, border: `1px solid ${statusMeta.color}40`, background: statusMeta.bg, color: statusMeta.color, fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {statusMeta.label}
          </button>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint }}>
            (click to advance)
          </span>
          <button
            onClick={() => void onRemove(trackerItem.id)}
            style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.textMuted, fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
          >
            Remove from tracker
          </button>
        </div>
      )}

      {loadingScholarship && (
        <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted }}>
          Loading scholarship details…
        </p>
      )}
      {scholarshipError && (
        <div style={{ padding: 12, background: '#FAEAEA', border: '1px solid #B93A3A40', borderRadius: 8, color: '#B93A3A', fontFamily: "'Outfit',sans-serif", fontSize: 13, marginBottom: 14 }}>
          Couldn't load details: {scholarshipError}
        </div>
      )}

      {scholarship && (
        <>
          {/* Key facts grid */}
          <SecLabel>Key facts</SecLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 22 }}>
            <FactCell label="Amount" value={amount} accent={MC} />
            <FactCell label="Deadline" value={deadline} accent="#C47A12" />
            <FactCell label="Min GPA" value={scholarship.min_gpa != null ? scholarship.min_gpa.toFixed(2) : '—'} />
            <FactCell
              label="Awards / year"
              value={scholarship.num_awards_per_year != null ? `~${scholarship.num_awards_per_year.toLocaleString()}` : '—'}
            />
          </div>

          {/* Eligibility */}
          {scholarship.eligibility_summary && (
            <div style={{ marginBottom: 22 }}>
              <SecLabel>Eligibility</SecLabel>
              <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13.5, color: C.text, lineHeight: 1.6, margin: 0 }}>
                {scholarship.eligibility_summary}
              </p>
            </div>
          )}

          {/* Application requirements */}
          {scholarship.application_requirements.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <SecLabel>What you'll need to submit</SecLabel>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {scholarship.application_requirements.map((req, i) => (
                  <li
                    key={i}
                    style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, padding: '8px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: MC, flexShrink: 0 }} />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Selection criteria */}
          {scholarship.selection_criteria.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <SecLabel>Judged on</SecLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {scholarship.selection_criteria.map((c) => (
                  <span
                    key={c}
                    style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, color: C.textMuted, background: C.surface, border: `1px solid ${C.border}`, padding: '4px 10px', borderRadius: 99, textTransform: 'capitalize' }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* About */}
          <div style={{ marginBottom: 22 }}>
            <SecLabel>About</SecLabel>
            <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13.5, color: C.text, lineHeight: 1.6, margin: 0 }}>
              {scholarship.description}
            </p>
          </div>

          {/* Data freshness / accuracy */}
          <div style={{ marginBottom: 22, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
            {scholarship.verified_at && (
              <span style={{ color: '#1F7A54', fontWeight: 600, whiteSpace: 'nowrap' }}>
                ✓ Verified {new Date(scholarship.verified_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            )}
            <span>Details are compiled from public sources — always confirm amounts and deadlines on the official site before applying.</span>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
            <a
              href={scholarship.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ padding: '10px 18px', borderRadius: 10, background: MC, color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Open official application {I.extlink}
            </a>
            {active.kind === 'scholarship' && (
              <button
                onClick={() => void onAddTracker(scholarship)}
                style={{ padding: '10px 18px', borderRadius: 10, background: `${MC}12`, border: `1px solid ${MC}40`, color: MC, fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {I.plus} Add to my tracker
              </button>
            )}
          </div>
        </>
      )}

      {/* Notes editor (tracker items only) */}
      {trackerItem && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SecLabel style={{ margin: 0 }}>Your notes</SecLabel>
            {notesSavedAt && !notesDirty && !notesSaving && (
              <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, color: C.textFaint }}>
                Saved {notesSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
          </div>
          {notesLoading ? (
            <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textFaint }}>Loading notes…</p>
          ) : (
            <>
              <textarea
                value={notesText}
                onChange={(e) => {
                  setNotesText(e.target.value)
                  setNotesDirty(true)
                }}
                onBlur={() => {
                  if (notesDirty) void saveNotes()
                }}
                placeholder="Essay ideas, application status, contact names, anything you want to remember…"
                aria-label="Scholarship notes"
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: C.surface,
                  fontFamily: "'Outfit',sans-serif",
                  fontSize: 13,
                  color: C.text,
                  lineHeight: 1.5,
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <button
                  onClick={() => void saveNotes()}
                  disabled={!notesDirty || notesSaving}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 8,
                    border: `1px solid ${notesDirty ? `${MC}40` : C.border}`,
                    background: notesDirty ? `${MC}12` : C.surface,
                    color: notesDirty ? MC : C.textFaint,
                    fontFamily: "'Outfit',sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: notesDirty && !notesSaving ? 'pointer' : 'default',
                  }}
                >
                  {notesSaving ? 'Saving…' : 'Save notes'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function FactCell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px' }}>
      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, color: C.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Young Serif',serif", fontSize: 17, color: accent ?? C.text, lineHeight: 1.2 }}>
        {value}
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════════
   TAB: SCHOLARSHIP SEARCH ENGINE
   ═══════════════════════════════════════════════════════════════ */
type MatchStrength = 'all' | 'strong' | 'good' | 'fair'
type DeadlineFilter = 'all' | 'urgent' | 'upcoming' | 'later'
type SortBy = 'match' | 'amount' | 'deadline'

const MATCH_COLORS = {
  strong: '#2D9E72',
  good: '#C47A12',
  fair: '#7048C8',
  none: 'rgba(28,18,7,0.30)',
}

const SCORE_SEGMENT_COLORS = {
  demographic: '#2D9E72',
  eligibility: '#1D7FC4',
  award: '#C47A12',
  deadline: '#7048C8',
  requirement: '#B93A3A',
}

function matchStrengthLabel(total: number): { label: string; color: string } {
  if (total >= 70) return { label: 'Strong Match', color: MATCH_COLORS.strong }
  if (total >= 45) return { label: 'Good Match', color: MATCH_COLORS.good }
  if (total >= 20) return { label: 'Fair Match', color: MATCH_COLORS.fair }
  return { label: 'Low Match', color: MATCH_COLORS.none }
}

const MatchBadge = ({ score }: { score: number }) => {
  const { color } = matchStrengthLabel(score)
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `${color}15`, border: `2px solid ${color}`,
      fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color,
    }}>
      {score}%
    </div>
  )
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
          <span key={seg.key} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, color: seg.color, fontWeight: 600 }}>
            {seg.label}: {seg.value}/{seg.max}
          </span>
        ))}
      </div>
    </div>
  )
}

const ScholarshipSearchCard = ({
  scholarship: s,
  score,
  isTracked,
  isExpanded,
  onToggleExpand,
  onTrack,
}: {
  scholarship: Scholarship
  score: ScholarshipMatchScore
  isTracked: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onTrack: () => void
}) => {
  const type = inferScholarshipType(s.demographic_tags)
  const typeColor = SCHOLARSHIP_TYPE_COLOR[type]
  const amount = formatScholarshipAmount(s)
  const { label: matchLabel, color: matchColor } = matchStrengthLabel(score.total)
  const days = parseDeadlineDaysFromNow(s.deadline_display)
  const deadlineNote =
    days == null ? null :
    days < 0 ? 'Past deadline' :
    days <= 7 ? `${days}d left` :
    days <= 30 ? `${Math.ceil(days / 7)}w left` :
    days <= 90 ? `${Math.ceil(days / 30)}mo left` :
    null

  return (
    <div
      style={{
        background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`,
        boxShadow: C.shadow1, transition: 'all 0.15s ease', overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = C.borderStrong
        ;(e.currentTarget as HTMLDivElement).style.background = C.surfaceHover
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = C.border
        ;(e.currentTarget as HTMLDivElement).style.background = C.surface
      }}
    >
      <div
        onClick={onToggleExpand}
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
      >
        <MatchBadge score={score.total} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: C.text }}>{s.name}</span>
            <Tag label={type} color={typeColor} />
            <Tag label={matchLabel} color={matchColor} />
            {deadlineNote && days != null && days >= 0 && days <= 30 && (
              <Tag label={deadlineNote} color="#B93A3A" />
            )}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted }}>
            <span>💵 {amount}</span>
            {s.deadline_display && <span>📅 {s.deadline_display}{deadlineNote && days != null && days >= 0 ? ` (${deadlineNote})` : ''}</span>}
            {s.provider && <span>🏛 {s.provider}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          {!isTracked ? (
            <button
              onClick={(e) => { e.stopPropagation(); onTrack() }}
              style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${MC}40`, background: `${MC}12`, color: MC, fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              {I.plus} Track
            </button>
          ) : (
            <span style={{ padding: '5px 12px', fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, color: MC }}>Tracked</span>
          )}
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.textMuted, fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}
          >
            Open {I.extlink}
          </a>
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text, lineHeight: 1.6, margin: '0 0 14px' }}>
            {s.description}
          </p>

          <div style={{ marginBottom: 14 }}>
            <SecLabel style={{ marginBottom: 6 }}>Match Breakdown</SecLabel>
            <ScoreBar score={score} />
          </div>

          {score.matchedTags.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <SecLabel style={{ marginBottom: 6 }}>Matched Demographics</SecLabel>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {score.matchedTags.map((t) => (
                  <Tag key={t} label={t.replace(/_/g, ' ')} color={MATCH_COLORS.strong} />
                ))}
              </div>
              {s.demographic_tags.length > score.matchedTags.length && (
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint, marginTop: 4 }}>
                  {score.matchedTags.length} of {s.demographic_tags.length} criteria matched
                </div>
              )}
            </div>
          )}

          {s.eligibility_summary && (
            <div style={{ marginBottom: 14 }}>
              <SecLabel style={{ marginBottom: 4 }}>Eligibility</SecLabel>
              <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>{s.eligibility_summary}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
            {s.min_gpa != null && (
              <div>
                <SecLabel style={{ marginBottom: 2 }}>Min GPA</SecLabel>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>{s.min_gpa}</span>
              </div>
            )}
            {s.max_family_income_cents != null && (
              <div>
                <SecLabel style={{ marginBottom: 2 }}>Max Income</SecLabel>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>${(s.max_family_income_cents / 100).toLocaleString()}</span>
              </div>
            )}
            {s.renewable_years != null && (
              <div>
                <SecLabel style={{ marginBottom: 2 }}>Renewable</SecLabel>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>{s.renewable_years} yr{s.renewable_years > 1 ? 's' : ''}</span>
              </div>
            )}
            {s.num_awards_per_year != null && (
              <div>
                <SecLabel style={{ marginBottom: 2 }}>Awards/Year</SecLabel>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>{s.num_awards_per_year.toLocaleString()}</span>
              </div>
            )}
          </div>

          {s.selection_criteria.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <SecLabel style={{ marginBottom: 6 }}>Selection Criteria</SecLabel>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {s.selection_criteria.map((c, i) => (
                  <Tag key={i} label={c} color={C.textMuted} bg={C.bg} />
                ))}
              </div>
            </div>
          )}

          {s.application_requirements.length > 0 && (
            <div>
              <SecLabel style={{ marginBottom: 6 }}>Requirements</SecLabel>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {s.application_requirements.map((r, i) => (
                  <li key={i} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted, marginBottom: 3, lineHeight: 1.4 }}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ScholarshipSearchTabProps {
  userDemoTags: string[]
  userDemographics: Demographics | null
  trackerIds: Set<string>
  onAddToTracker: (s: Scholarship) => Promise<void>
}

const ScholarshipSearchTab = ({ userDemoTags, userDemographics, trackerIds, onAddToTracker }: ScholarshipSearchTabProps) => {
  const [results, setResults] = useState<ScoredScholarship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('match')
  const [filterMatch, setFilterMatch] = useState<MatchStrength>('all')
  const [filterType, setFilterType] = useState<'all' | ScholarshipType>('all')
  const [filterDeadline, setFilterDeadline] = useState<DeadlineFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset loading/error before the async fetch
    setLoading(true)
    setError(null)
    const familyIncomeCents = userDemographics ? parseIncomeToRange(userDemographics.income_level) : null
    const gpa = userDemographics ? parseGpa(userDemographics.gpa) : null
    getAllScholarshipsScored(userDemoTags, { familyIncomeCents, gpa })
      .then((data) => { if (!cancelled) setResults(data) })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userDemoTags, userDemographics])

  const filtered = results
    .filter(({ scholarship: s }) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || (s.provider ?? '').toLowerCase().includes(q)
    })
    .filter(({ scholarship: s }) => {
      if (filterType === 'all') return true
      return inferScholarshipType(s.demographic_tags) === filterType
    })
    .filter(({ score }) => {
      if (filterMatch === 'all') return true
      if (filterMatch === 'strong') return score.total >= 70
      if (filterMatch === 'good') return score.total >= 45
      return score.total >= 20
    })
    .filter(({ scholarship: s }) => {
      if (filterDeadline === 'all') return true
      const days = parseDeadlineDaysFromNow(s.deadline_display)
      if (days == null) return filterDeadline === 'later'
      if (days < 0) return false
      if (filterDeadline === 'urgent') return days <= 30
      if (filterDeadline === 'upcoming') return days <= 90
      return days > 90
    })
    .sort((a, b) => {
      if (sortBy === 'match') return b.score.total - a.score.total
      if (sortBy === 'amount') return (b.scholarship.award_amount_cents ?? 0) - (a.scholarship.award_amount_cents ?? 0)
      const dA = parseDeadlineDaysFromNow(a.scholarship.deadline_display) ?? 9999
      const dB = parseDeadlineDaysFromNow(b.scholarship.deadline_display) ?? 9999
      return dA - dB
    })

  const strongCount = results.filter((r) => r.score.total >= 70).length
  const goodCount = results.filter((r) => r.score.total >= 45 && r.score.total < 70).length

  const types: Array<'all' | ScholarshipType> = ['all', 'Merit', 'Need', 'Local', 'Identity']
  const matchFilters: Array<{ id: MatchStrength; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'strong', label: 'Strong (70+)' },
    { id: 'good', label: 'Good (45+)' },
    { id: 'fair', label: 'Fair (20+)' },
  ]
  const deadlineFilters: Array<{ id: DeadlineFilter; label: string }> = [
    { id: 'all', label: 'Any' },
    { id: 'urgent', label: '< 30 days' },
    { id: 'upcoming', label: '< 90 days' },
    { id: 'later', label: '90+ days' },
  ]
  const sortOptions: Array<{ id: SortBy; label: string }> = [
    { id: 'match', label: 'Best Match' },
    { id: 'amount', label: 'Highest Award' },
    { id: 'deadline', label: 'Soonest Deadline' },
  ]

  return (
    <div style={{ padding: '28px 30px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, fontWeight: 400, color: C.text, margin: '0 0 4px' }}>Aid Engine</h1>
        <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: C.textMuted, margin: 0, lineHeight: 1.5 }}>
          Scholarships ranked by how well they match your profile.
        </p>
      </div>

      {userDemoTags.length > 0 && !loading && (
        <div style={{ marginBottom: 18 }}>
          <Callout
            icon={I.sparkle}
            title="Personalized for you"
            body={<>We scored <strong>{results.length}</strong> scholarships against your profile. <strong>{strongCount}</strong> strong match{strongCount !== 1 ? 'es' : ''}{goodCount > 0 ? <> and <strong>{goodCount}</strong> good match{goodCount !== 1 ? 'es' : ''}</> : ''} found.</>}
          />
        </div>
      )}

      {userDemoTags.length === 0 && !loading && (
        <div style={{ marginBottom: 18 }}>
          <Callout
            icon={I.info}
            title="Complete your profile"
            body="Fill out your demographic survey for personalized scholarship rankings. Without profile data, all scholarships get a neutral score."
            color="#C47A12"
          />
        </div>
      )}

      <div data-tour="aid-engine-filters" style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Search by name, description, or provider…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search scholarships"
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, outline: 'none' }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          aria-label="Sort scholarships"
          style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, cursor: 'pointer', outline: 'none' }}
        >
          {sortOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <SecLabel style={{ marginBottom: 0, marginRight: 4 }}>Match</SecLabel>
        {matchFilters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterMatch(f.id)}
            style={{ padding: '3px 10px', borderRadius: 99, border: `1px solid ${filterMatch === f.id ? MC + '50' : C.border}`, background: filterMatch === f.id ? `${MC}12` : C.surface, color: filterMatch === f.id ? MC : C.textMuted, fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: filterMatch === f.id ? 600 : 400, cursor: 'pointer' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <SecLabel style={{ marginBottom: 0, marginRight: 4 }}>Type</SecLabel>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            style={{ padding: '3px 10px', borderRadius: 99, border: `1px solid ${filterType === t ? MC + '50' : C.border}`, background: filterType === t ? `${MC}12` : C.surface, color: filterType === t ? MC : C.textMuted, fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: filterType === t ? 600 : 400, cursor: 'pointer' }}
          >
            {t === 'all' ? 'All' : t}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <SecLabel style={{ marginBottom: 0, marginRight: 4 }}>Deadline</SecLabel>
        {deadlineFilters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterDeadline(f.id)}
            style={{ padding: '3px 10px', borderRadius: 99, border: `1px solid ${filterDeadline === f.id ? MC + '50' : C.border}`, background: filterDeadline === f.id ? `${MC}12` : C.surface, color: filterDeadline === f.id ? MC : C.textMuted, fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: filterDeadline === f.id ? 600 : 400, cursor: 'pointer' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <SecLabel style={{ marginBottom: 12 }}>
        Showing {filtered.length} of {results.length} scholarships
      </SecLabel>

      {loading && <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted }}>Scoring scholarships…</p>}
      {error && <div style={{ padding: 12, background: '#FAEAEA', border: '1px solid #B93A3A40', borderRadius: 8, color: '#B93A3A', fontFamily: "'Outfit',sans-serif", fontSize: 13, marginBottom: 10 }}>Couldn't load scholarships: {error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(({ scholarship, score }) => (
          <ScholarshipSearchCard
            key={scholarship.id}
            scholarship={scholarship}
            score={score}
            isTracked={trackerIds.has(scholarship.id)}
            isExpanded={expandedId === scholarship.id}
            onToggleExpand={() => setExpandedId((prev) => prev === scholarship.id ? null : scholarship.id)}
            onTrack={() => void onAddToTracker(scholarship)}
          />
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textFaint, textAlign: 'center', padding: 20 }}>No scholarships match these filters.</p>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   COLLEGE SEARCH (shared by Deadlines + Aid Compare)
   ═══════════════════════════════════════════════════════════════ */
const CollegeSearch = ({
  collegeIds,
  onAdd,
  placeholder = 'Search colleges to add...',
}: {
  collegeIds: string[]
  onAdd: (id: string) => void
  placeholder?: string
}) => {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const results = query.length >= 1
    ? searchColleges(query).filter((c) => !collegeIds.includes(c.id)).slice(0, 8)
    : []

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
          {results.length === 0 ? (
            <div style={{ padding: '12px 14px', fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted }}>
              {query.length < 2 ? 'Type to search...' : 'No matching colleges found'}
            </div>
          ) : results.map((c) => (
            <button
              key={c.id}
              onClick={() => { onAdd(c.id); setQuery(''); setFocused(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', border: 'none', borderBottom: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.surfaceHover }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{c.emoji}</span>
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
  onAddCollege: (id: string) => void
  onRemoveCollege: (id: string) => void
}

const DeadlinesTab = ({ collegeIds, onAddCollege, onRemoveCollege }: DeadlinesTabProps) => {
  const [open, setOpen] = useState<string | null>(null)
  const colleges = collegeIds.map(getCollegeById).filter(Boolean) as CollegeInfo[]
  return (
    <div style={{ padding: '28px 30px' }}>
      <h1 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, fontWeight: 400, color: C.text, margin: '0 0 4px' }}>Deadlines</h1>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: C.textMuted, margin: '0 0 18px', lineHeight: 1.5 }}>
        Financial aid deadlines for your college list. Missing a priority deadline can cost thousands in aid.
      </p>

      <div style={{ marginBottom: 20 }}>
        <Callout icon="⏰" title="FAFSA opens October 1, 2026" body="That's ~6 months away. File as close to opening day as possible for maximum aid. Don't wait until your application deadlines — many school aid funds run out." color="#C47A12" bg="#FFF3E0" />
      </div>

      <div data-tour="deadlines-search"><CollegeSearch collegeIds={collegeIds} onAdd={onAddCollege} placeholder="Search colleges to add to your list..." /></div>

      {colleges.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎓</div>
          <div style={{ fontFamily: "'Young Serif',serif", fontSize: 18, color: C.text, marginBottom: 6 }}>No colleges yet</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, maxWidth: 340, margin: '0 auto', lineHeight: 1.5 }}>
            Search above to add schools from our database of 50+ colleges. Your deadlines and financial aid timelines will appear here.
          </div>
        </div>
      ) : (
        <>
      <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
        {Object.values(URGENCY_META).map((u) => (
          <div key={u.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: u.color, flexShrink: 0 }} />
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>{u.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {colleges.map((col) => {
          const urgency = computeUrgency(col)
          const urg = URGENCY_META[urgency]
          const note = computeDaysNote(col)
          const isOpen = open === col.id
          const earlyDate = col.applicationDeadlines.earlyAction || col.applicationDeadlines.earlyDecision || null
          const earlyLabel = col.applicationDeadlines.earlyAction ? 'EA' : col.applicationDeadlines.earlyDecision ? 'ED' : null
          const cssDisplay = col.financialAidDeadlines.cssProfile || 'N/A'
          return (
            <div key={col.id} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${isOpen ? MC + '45' : C.border}`, overflow: 'hidden', boxShadow: C.shadow1 }}>
              <button onClick={() => setOpen(isOpen ? null : col.id)} style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '14px 16px', background: isOpen ? `${MC}06` : C.surface, border: 'none', borderBottom: isOpen ? `1px solid ${C.border}` : 'none', cursor: 'pointer', gap: 12, textAlign: 'left' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{col.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontFamily: "'Young Serif',serif", fontSize: 15, color: C.text }}>{col.name}</span>
                    <Tag label={col.type} color={C.textMuted} bg={C.bg} />
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 12 }}>
                    {[
                      { label: 'App Deadline', value: col.applicationDeadlines.regularDecision, note: earlyDate && earlyLabel ? `${earlyLabel}: ${earlyDate}` : null, accent: earlyDate ? '#C47A12' : null },
                      { label: 'FAFSA Priority', value: col.financialAidDeadlines.fafsaPriority, note: 'File by this date for best aid', accent: null },
                      { label: 'CSS Profile', value: cssDisplay, note: cssDisplay !== 'N/A' ? 'Required for this school' : null, accent: cssDisplay !== 'N/A' ? '#B93A3A' : null },
                      { label: 'Aid Letter', value: col.financialAidDeadlines.aidNotification, note: 'Estimated notification window', accent: null },
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
                        <strong>{col.name}</strong> requires the CSS Profile in addition to FAFSA. It opens Oct 1, 2026. Missing the CSS deadline typically means missing institutional aid entirely.
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
                  <button
                    onClick={() => onRemoveCollege(col.id)}
                    style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid #B93A3A30`, background: '#FAEAEA', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: '#B93A3A', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    {I.trash} Remove
                  </button>
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
   TAB: AID COMPARE
   ═══════════════════════════════════════════════════════════════ */
type NpcStatus = 'not-run' | 'estimated' | 'verified'

const NPC_STATUS_META: Record<NpcStatus, { label: string; color: string; bg: string }> = {
  'not-run': { label: 'Not Run', color: 'rgba(28,18,7,0.40)', bg: C.bg },
  estimated: { label: 'Estimated', color: '#1D7FC4', bg: '#E8EEF5' },
  verified: { label: 'Verified', color: '#2D9E72', bg: '#EBF5F0' },
}

interface AidCompareTabProps {
  collegeIds: string[]
  npcRuns: Record<string, NpcRun>
  onAddCollege: (id: string) => void
  onRemoveCollege: (id: string) => void
  onSaveNpcRun: (collegeId: string, run: NpcRun) => void
}

const AidCompareTab = ({ collegeIds, npcRuns, onAddCollege, onRemoveCollege, onSaveNpcRun }: AidCompareTabProps) => {
  const colleges = collegeIds.map(getCollegeById).filter(Boolean) as CollegeInfo[]
  const [editingNpc, setEditingNpc] = useState<string | null>(null)
  const [aidInput, setAidInput] = useState('')
  const [showOutOfState, setShowOutOfState] = useState<Record<string, boolean>>({})

  const handleSaveAid = (collegeId: string) => {
    const val = parseInt(aidInput.replace(/[^0-9]/g, ''), 10)
    if (isNaN(val) || val <= 0) return
    onSaveNpcRun(collegeId, { estimatedAid: val, dateRun: new Date().toISOString().split('T')[0], status: 'estimated' })
    setEditingNpc(null)
    setAidInput('')
  }

  return (
    <div style={{ padding: '28px 30px' }}>
      <h1 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, fontWeight: 400, color: C.text, margin: '0 0 4px' }}>Aid Compare</h1>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: C.textMuted, margin: '0 0 18px', lineHeight: 1.5 }}>
        Compare estimated net costs across your school list. Run each school's Net Price Calculator for a personalized estimate.
      </p>

      <div data-tour="aid-compare-search"><CollegeSearch collegeIds={collegeIds} onAdd={onAddCollege} placeholder="Search colleges to add..." /></div>

      {colleges.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontFamily: "'Young Serif',serif", fontSize: 18, color: C.text, marginBottom: 6 }}>No colleges to compare</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, maxWidth: 340, margin: '0 auto', lineHeight: 1.5 }}>
            Add schools above to compare their costs and estimated aid side by side.
          </div>
        </div>
      ) : (
        <>
      <div style={{ display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { swatch: '#B93A3A30', label: 'Cost of Attendance (COA)' },
          { swatch: MC, label: 'Estimated Aid' },
        ].map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 24, height: 9, borderRadius: 3, background: l.swatch, flexShrink: 0 }} />
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>{l.label}</span>
          </div>
        ))}
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint, marginLeft: 'auto' }}>Annual estimates</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {colleges.map((college) => {
          const npcRun = npcRuns[college.id]
          const aidEstimate = npcRun?.estimatedAid ?? null
          const npcStatus: NpcStatus = npcRun?.status ?? 'not-run'
          const nm = NPC_STATUS_META[npcStatus]
          const isOos = showOutOfState[college.id] ?? false
          const coa = isOos && college.costOutOfState ? college.costOutOfState : college.costOfAttendance
          const oop = aidEstimate ? coa - aidEstimate : null
          const aidPct = aidEstimate ? aidEstimate / coa : 0
          const oopColor = oop !== null ? (oop < 15000 ? '#2D9E72' : oop < 30000 ? '#C47A12' : '#B93A3A') : C.textMuted
          const isEditing = editingNpc === college.id

          return (
            <div key={college.id} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '16px 18px', boxShadow: C.shadow1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>{college.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'Young Serif',serif", fontSize: 15, color: C.text }}>{college.name}</span>
                    <Tag label={college.type} color={C.textMuted} bg={C.bg} />
                  </div>
                  {college.type === 'Public' && college.costOutOfState && (
                    <button
                      onClick={() => setShowOutOfState((p) => ({ ...p, [college.id]: !p[college.id] }))}
                      style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: MC, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}
                    >
                      {isOos ? 'Show in-state' : 'Show out-of-state'}
                    </button>
                  )}
                </div>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: nm.color, background: nm.bg, padding: '3px 10px', borderRadius: 99, border: `1px solid ${nm.color}30` }}>{nm.label}</span>
              </div>

              <div style={{ position: 'relative', height: 18, borderRadius: 5, background: '#B93A3A22', overflow: 'hidden', marginBottom: 12 }}>
                {aidEstimate !== null && aidEstimate > 0 && (
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${aidPct * 100}%`, background: MC, opacity: 0.8, borderRadius: 5 }} />
                )}
                <div style={{ position: 'absolute', right: 8, top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 600, color: '#B93A3A' }}>${coa.toLocaleString()}/yr</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                {[
                  { label: isOos ? 'COA (Out-of-State)' : 'Cost of Attendance', value: `$${coa.toLocaleString()}`, color: C.text },
                  { label: 'Est. Aid Package', value: aidEstimate !== null ? `$${aidEstimate.toLocaleString()}` : '\u2014', color: MC },
                  { label: 'Est. Out of Pocket', value: oop !== null ? `$${oop.toLocaleString()}` : '\u2014', color: oopColor },
                ].map((d, j) => (
                  <div key={j} style={{ background: C.bg, borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, color: C.textMuted, marginBottom: 3 }}>{d.label}</div>
                    <div style={{ fontFamily: "'Young Serif',serif", fontSize: 16, color: d.color }}>{d.value}</div>
                  </div>
                ))}
              </div>

              {isEditing ? (
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    autoFocus
                    value={aidInput}
                    onChange={(e) => setAidInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAid(college.id); if (e.key === 'Escape') { setEditingNpc(null); setAidInput('') } }}
                    placeholder="e.g. 25000"
                    style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text, outline: 'none' }}
                  />
                  <button onClick={() => handleSaveAid(college.id)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: MC, color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
                  <button onClick={() => { setEditingNpc(null); setAidInput('') }} style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.textMuted, fontFamily: "'Outfit',sans-serif", fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    onClick={() => window.open(college.npcUrl, '_blank')}
                    style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: `1px solid ${MC}40`, background: `${MC}0D`, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: MC, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                  >
                    Run Net Price Calculator {I.extlink}
                  </button>
                  <button
                    onClick={() => { setEditingNpc(college.id); setAidInput(aidEstimate !== null ? String(aidEstimate) : '') }}
                    style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, color: C.textMuted, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    {aidEstimate !== null ? 'Edit Aid' : 'Enter Aid'}
                  </button>
                </div>
              )}

              <button
                onClick={() => onRemoveCollege(college.id)}
                style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid #B93A3A30`, background: '#FAEAEA', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: '#B93A3A', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                {I.trash} Remove
              </button>
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
   CHAT PANEL (real — calls financial-aid-chat edge function)
   ═══════════════════════════════════════════════════════════════ */
const STARTER_PROMPTS = [
  "What's the difference between a grant and a loan?",
  'When should I file FAFSA — does timing matter?',
  'How do I find scholarships I actually qualify for?',
  'What is EFC and how does it affect my aid?',
  'Is the CSS Profile required for every school?',
]

const ChatPanel = ({ fill = false, onClose }: { fill?: boolean; onClose?: () => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    setError(null)
    const next: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setLoading(true)
    try {
      const reply = await sendChatMessage(next)
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setMessages([...next, { role: 'assistant', content: `Something went wrong: ${msg}` }])
    } finally {
      setLoading(false)
    }
  }

  const empty = messages.length === 0

  return (
    <div data-tour="chat" style={{ width: fill ? '100%' : 320, flexShrink: 0, borderLeft: fill ? 'none' : `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', background: C.surface, height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 15px', borderBottom: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7, background: `${MC}18`, color: MC }}>{I.sparkle}</span>
          <span style={{ fontFamily: "'Young Serif',serif", fontSize: 14, color: C.text }}>Aid Advisor</span>
          <span style={{ marginLeft: 'auto', fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 600, color: MC, textTransform: 'uppercase', letterSpacing: '0.06em', background: `${MC}15`, padding: '2px 7px', borderRadius: 99, border: `1px solid ${MC}25` }}>AI</span>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close Aid Advisor"
              style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, width: 30, height: 30, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              {I.close}
            </button>
          )}
        </div>
        <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted, margin: 0, lineHeight: 1.4 }}>
          Ask anything about FAFSA, scholarships, grants, or aid packages.
        </p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 11px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {empty && (
          <div style={{ marginTop: 4 }}>
            <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint, textAlign: 'center', marginBottom: 10 }}>Tap a question to get started</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {STARTER_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => send(p)}
                  disabled={loading}
                  style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', cursor: loading ? 'default' : 'pointer', textAlign: 'left', lineHeight: 1.35, transition: 'all 0.12s ease' }}
                  onMouseEnter={(e) => {
                    if (loading) return
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = `${MC}50`
                    ;(e.currentTarget as HTMLButtonElement).style.background = C.surfaceHover
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = C.border
                    ;(e.currentTarget as HTMLButtonElement).style.background = C.bg
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', gap: 6, alignItems: 'flex-start' }}>
            {m.role === 'assistant' && (
              <span style={{ width: 23, height: 23, borderRadius: 6, flexShrink: 0, background: `${MC}18`, color: MC, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>{I.sparkle}</span>
            )}
            <div
              style={{
                maxWidth: '82%',
                background: m.role === 'user' ? MC : C.bg,
                color: m.role === 'user' ? '#fff' : C.text,
                padding: '8px 11px',
                borderRadius: 10,
                borderBottomRightRadius: m.role === 'user' ? 3 : 10,
                borderBottomLeftRadius: m.role === 'assistant' ? 3 : 10,
                fontFamily: "'Outfit',sans-serif",
                fontSize: 12,
                lineHeight: 1.55,
                border: m.role === 'assistant' ? `1px solid ${C.border}` : 'none',
                boxShadow: C.shadow1,
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span style={{ width: 23, height: 23, borderRadius: 6, flexShrink: 0, background: `${MC}18`, color: MC, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{I.sparkle}</span>
            <div style={{ background: C.bg, padding: '10px 12px', borderRadius: 10, borderBottomLeftRadius: 3, border: `1px solid ${C.border}`, display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 1, 2].map((d) => (
                <span key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: MC, opacity: 0.5, animation: `faid-bounce 1.2s ${d * 0.2}s ease-in-out infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '6px 12px', background: '#FAEAEA', borderTop: '1px solid #B93A3A25', fontFamily: "'Outfit',sans-serif", fontSize: 11, color: '#B93A3A' }}>
          {error}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '10px 11px', borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end', background: C.surface, borderRadius: 10, border: `1px solid ${C.borderStrong}`, padding: '7px 8px' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            placeholder="Ask about financial aid..."
            aria-label="Type your financial aid question"
            rows={1}
            style={{ flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent', fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text, lineHeight: 1.45, maxHeight: 68, overflowY: 'auto' }}
          />
          <button
            onClick={() => void send()}
            disabled={!input.trim() || loading}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              flexShrink: 0,
              background: input.trim() && !loading ? MC : C.border,
              border: 'none',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: input.trim() && !loading ? '#fff' : C.textFaint,
              transition: 'all 0.15s ease',
            }}
            aria-label="Send"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2L2 6.5l5 2L9.5 14 14 2z" />
              <line x1="7" y1="8.5" x2="14" y2="2" />
            </svg>
          </button>
        </div>
        <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, color: C.textFaint, margin: '5px 2px 0', textAlign: 'center' }}>Verify decisions with your school counselor</p>
      </div>
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
}

export default function FinancialAidModule({ open, onClose, year = 11 }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const toast = useToast()
  const tourSeen = profile?.settings?.intros_seen?.includes('fafsa-module-tour') ?? false
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    if (open && !tourSeen) {
      const t = setTimeout(() => setShowTour(true), 400)
      return () => clearTimeout(t)
    }
  }, [open, tourSeen])

  const isNarrow = useIsNarrow()
  const [chatOpen, setChatOpen] = useState(false)
  const [tab, setTab] = useState<TabId>('overview')
  const [progress, setProgress] = useState<ChecklistProgressMap>({})
  const [progressError, setProgressError] = useState<string | null>(null)
  const [userDemoTags, setUserDemoTags] = useState<string[]>([])
  const [userDemographics, setUserDemographics] = useState<Demographics | null>(null)
  const [trackerScholarshipIds, setTrackerScholarshipIds] = useState<Set<string>>(new Set())
  const [collegeIds, setCollegeIds] = useState<string[]>([])
  const [npcRuns, setNpcRuns] = useState<Record<string, NpcRun>>({})

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

    getTrackerItems()
      .then((items) => {
        if (!cancelled) {
          setTrackerScholarshipIds(new Set(items.filter((i) => i.scholarshipId).map((i) => i.scholarshipId!)))
        }
      })
      .catch(() => {})

    getCollegeList()
      .then((ids) => { if (!cancelled) setCollegeIds(ids) })
      .catch(() => {})

    getNpcRuns()
      .then((runs) => { if (!cancelled) setNpcRuns(runs) })
      .catch(() => {})

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

  const handleSaveNpcRun = async (collegeId: string, run: NpcRun) => {
    const prev = { ...npcRuns }
    setNpcRuns((r) => ({ ...r, [collegeId]: run }))
    try { await saveNpcRun(collegeId, run); toast.success('Aid estimate saved') } catch { setNpcRuns(prev); toast.error('Could not save your aid estimate — try again') }
  }

  const handleSearchAddToTracker = async (s: Scholarship) => {
    if (trackerScholarshipIds.has(s.id)) return
    const type = inferScholarshipType(s.demographic_tags)
    const amount = formatScholarshipAmount(s)
    setTrackerScholarshipIds((prev) => new Set(prev).add(s.id))
    try {
      await addTrackerItem({
        name: s.name,
        amount,
        deadline: s.deadline_display ?? 'TBD',
        status: 'researching',
        type,
        source: s.provider ?? 'Scholarship DB',
        scholarshipId: s.id,
      })
      toast.success('Added to your tracker')
    } catch {
      setTrackerScholarshipIds((prev) => {
        const nextIds = new Set(prev)
        nextIds.delete(s.id)
        return nextIds
      })
      toast.error('Could not add to tracker — try again')
    }
  }

  if (!open) return null

  const yearMeta = YEARS[year] ?? YEARS[11]

  const content =
    tab === 'overview' ? <OverviewTab progress={progress} onToggle={handleToggleChecklist} /> :
    tab === 'scholarships' ? <ScholarshipsTab userDemoTags={userDemoTags} /> :
    tab === 'scholarship-search' ? <ScholarshipSearchTab userDemoTags={userDemoTags} userDemographics={userDemographics} trackerIds={trackerScholarshipIds} onAddToTracker={handleSearchAddToTracker} /> :
    tab === 'deadlines' ? <DeadlinesTab collegeIds={collegeIds} onAddCollege={handleAddCollege} onRemoveCollege={handleRemoveCollege} /> :
    <AidCompareTab collegeIds={collegeIds} npcRuns={npcRuns} onAddCollege={handleAddCollege} onRemoveCollege={handleRemoveCollege} onSaveNpcRun={handleSaveNpcRun} />

  return (
    <div role="dialog" aria-modal="true" aria-label="Financial Aid module" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: C.bg, display: 'flex', flexDirection: 'column', fontFamily: "'Outfit',sans-serif" }}>
      <style>{`
        @keyframes faid-spin { to { transform: rotate(360deg); } }
        @keyframes faid-bounce { 0%,100%{transform:translateY(0);opacity:0.5} 50%{transform:translateY(-4px);opacity:1} }
        .faid-root button, .faid-root select, .faid-root input, .faid-root textarea { font-family: inherit; }
        .faid-root ::-webkit-scrollbar { width: 6px; }
        .faid-root ::-webkit-scrollbar-track { background: transparent; }
        .faid-root ::-webkit-scrollbar-thumb { background: rgba(60,35,10,0.12); border-radius: 3px; }
      `}</style>

      <div className="faid-root" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div data-tour="breadcrumb" style={{ padding: '13px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, background: C.surface, flexShrink: 0 }}>
          <button onClick={onClose} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 500, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Dashboard</button>
          <span style={{ color: C.textFaint }}>/</span>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>Financial Aid</span>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textFaint }}>·</span>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted }}>{FA_TABS.find((t) => t.id === tab)?.label}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: yearMeta.color, background: yearMeta.tint, padding: '3px 10px', borderRadius: 99, border: `1px solid ${yearMeta.color}20` }}>
            {yearMeta.emoji} {yearMeta.label} Year
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
                    onClick={() => setTab(t.id)}
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

            {/* Full-width content with floating chat toggle */}
            <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
              <div data-tour="content" style={{ height: '100%', overflowY: 'auto' }}>{content}</div>

              {!chatOpen && (
                <button
                  onClick={() => setChatOpen(true)}
                  aria-label="Open Aid Advisor"
                  style={{
                    position: 'absolute', right: 16, bottom: 16, zIndex: 5,
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '10px 16px', borderRadius: 99, border: 'none', cursor: 'pointer',
                    background: MC, color: '#fff', boxShadow: C.shadow2,
                    fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600,
                  }}
                >
                  {I.sparkle} Aid Advisor
                </button>
              )}

              {chatOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: C.bg, display: 'flex', flexDirection: 'column' }}>
                  <ChatPanel fill onClose={() => setChatOpen(false)} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <ModuleTabNav active={tab} onTab={setTab} progress={progress} onTour={() => setShowTour(true)} />
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              <div data-tour="content" style={{ flex: 1, overflowY: 'auto' }}>{content}</div>
              <ChatPanel />
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
            onSwitchTab={setTab}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
