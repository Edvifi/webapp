/**
 * CoursePlanningModule — fifth concrete module.
 *
 * Tabs: Overview (rigor + AP strategy checklist) + 4-Year Plan (grid).
 * The 4-Year Plan is a year × course-slot grid with live GPA estimates.
 */

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { markIntroSeen } from '../lib/profiles'
import { C, MODULE_COLORS } from '../lib/designTokens'
import {
  getModuleChecklistProgress,
  setModuleChecklistItem,
  getModuleData,
  setModuleData,
} from '../lib/moduleProgress'
import type { ChecklistProgressMap, ChecklistItemStatus } from '../lib/fafsaData'
import {
  CP_CHECKLIST,
  CP_TOTAL_ITEMS,
  CP_ALL_IDS,
  COURSE_LEVELS,
  LEVEL_WEIGHT,
  LETTER_GRADES,
  GRADE_POINTS,
  SCHOOL_GRADES,
  TEMPLATE_SUBJECTS,
  type CourseEntry,
  type CourseLevel,
  type LetterGrade,
  type SchoolGrade,
} from '../data/coursePlanningChecklist'
import { CP_CONTENT_MAP } from '../data/coursePlanningContent'
import CoursePlanningModuleTour, { type CpTabId } from './CoursePlanningModuleTour'
import ChecklistContentView from './ChecklistContentView'

const MC = MODULE_COLORS.coursePlanning
const MODULE_NAME = 'coursePlanning'
const TOUR_INTRO_KEY = 'course-planning-module-tour'
const COURSES_KEY = 'courses'

const EASE_OUT = [0.22, 1, 0.36, 1] as const

/* ─── primitives ─── */

const Bar = ({ value, color, height = 4 }: { value: number; color: string; height?: number }) => (
  <div style={{ width: '100%', height, borderRadius: height, background: 'rgba(60,35,10,0.10)', overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(value * 100, 100)}%`, height: '100%', borderRadius: height, background: color, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
  </div>
)

const SecLabel = ({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) => (
  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, color: 'rgba(28,18,7,0.40)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, ...style }}>{children}</div>
)

const Ring = ({ status, color }: { status: ChecklistItemStatus; color: string }) => {
  if (status === 'completed') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: color, color: '#fff', flexShrink: 0, fontSize: 12 }}>✓</span>
  )
  if (status === 'in-progress') return (
    <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: `2.5px solid ${color}`, borderTopColor: 'transparent', display: 'inline-block', animation: 'cp-spin 1s linear infinite' }} />
  )
  return <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: '1.5px solid rgba(60,35,10,0.18)', display: 'inline-block' }} />
}

const itemTypeIcon: Record<string, string> = {
  article: '📖',
  task: '✓',
  resource: '🔗',
}

const LEVEL_COLORS: Record<CourseLevel, string> = {
  'Regular':         '#7A6D5C',
  'Honors':          '#1D7FC4',
  'AP':              '#7048C8',
  'IB':              '#7048C8',
  'Dual Enrollment': '#2D9E72',
}

/* ─── tab nav ─── */

type TabId = CpTabId

const TABS: Array<{ id: TabId; label: string; emoji: string }> = [
  { id: 'overview', label: 'Overview', emoji: '🏠' },
  { id: 'plan', label: '4-Year Plan', emoji: '📐' },
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
  const pct = CP_TOTAL_ITEMS > 0 ? completed / CP_TOTAL_ITEMS : 0
  return (
    <nav data-tour="sidebar" style={{ width: 188, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
      <div style={{ padding: '0 14px 18px', borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ fontSize: 24, marginBottom: 5, lineHeight: 1 }}>📐</div>
        <div style={{ fontFamily: "'Young Serif',serif", fontSize: 15, color: C.text, lineHeight: 1.3 }}>Course Planning</div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: MC, fontWeight: 600, marginTop: 3 }}>Strategic Rigor</div>
      </div>

      <div style={{ padding: '0 8px' }}>
        <SecLabel style={{ padding: '0 6px', marginBottom: 8 }}>Module Sections</SecLabel>
        {TABS.map((tab) => {
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
              <span style={{ opacity: isActive ? 1 : 0.5, fontSize: 14, flexShrink: 0 }}>{tab.emoji}</span>
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
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, color: C.textFaint, marginTop: 5 }}>{completed} of {CP_TOTAL_ITEMS} items done</div>
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

/* ─── Overview tab ─── */

const nextStatus = (s: ChecklistItemStatus): ChecklistItemStatus => {
  if (s === 'available') return 'in-progress'
  if (s === 'in-progress') return 'completed'
  return 'available'
}

const OverviewTab = ({
  progress,
  onToggle,
  onMarkComplete,
}: {
  progress: ChecklistProgressMap
  onToggle: (itemId: string) => void
  onMarkComplete: (itemId: string) => void
}) => {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: true })
  const [activeContentId, setActiveContentId] = useState<string | null>(null)
  const statusOf = (id: string): ChecklistItemStatus => progress[id] ?? 'available'
  const done = CP_CHECKLIST.reduce(
    (a, s) => a + s.items.filter((x) => statusOf(x.id) === 'completed').length,
    0,
  )

  if (activeContentId) {
    return (
      <ChecklistContentView
        itemId={activeContentId}
        status={statusOf(activeContentId)}
        contentMap={CP_CONTENT_MAP}
        allIds={CP_ALL_IDS}
        accentColor={MC}
        onBack={() => setActiveContentId(null)}
        onMarkComplete={onMarkComplete}
        onNavigate={setActiveContentId}
      />
    )
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 760 }}>
      <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, color: C.text, margin: 0, marginBottom: 6 }}>Course Planning Strategy</h2>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 20, lineHeight: 1.6 }}>
        Click an item title to read it. Click the circle to cycle status.
      </p>

      <div data-tour="overview-progress" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 18 }}>
        <div style={{ flex: 1 }}><Bar value={done / CP_TOTAL_ITEMS} color={MC} height={6} /></div>
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, color: MC, whiteSpace: 'nowrap' }}>{done}/{CP_TOTAL_ITEMS} completed</span>
      </div>

      {CP_CHECKLIST.map((section, sIdx) => {
        const isOpen = expanded[sIdx]
        const sectionDone = section.items.filter((x) => statusOf(x.id) === 'completed').length
        return (
          <div key={section.title} style={{ marginBottom: 14, border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, overflow: 'hidden' }}>
            <button
              onClick={() => setExpanded((p) => ({ ...p, [sIdx]: !p[sIdx] }))}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: C.text }}>{section.title}</span>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>{sectionDone}/{section.items.length}</span>
              </div>
              <span style={{ fontSize: 12, color: C.textMuted, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: EASE_OUT }}
                  style={{ overflow: 'hidden', borderTop: `1px solid ${C.border}` }}
                >
                  {section.items.map((item) => {
                    const status = statusOf(item.id)
                    return (
                      <div
                        key={item.id}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderTop: `1px solid ${C.border}` }}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggle(item.id) }}
                          aria-label={`Toggle status for ${item.label}`}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Ring status={status} color={MC} />
                        </button>
                        <button
                          onClick={() => setActiveContentId(item.id)}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = MC }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '' }}
                        >
                          <span style={{ fontSize: 14 }}>{itemTypeIcon[item.type]}</span>
                          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: status === 'completed' ? C.textMuted : 'inherit', textDecoration: status === 'completed' ? 'line-through' : 'none' }}>{item.label}</span>
                        </button>
                      </div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

/* ─── 4-Year Plan tab (the year × subject grid) ─── */

const SLOT_COUNT = 6  // course slots per year

interface GpaSummary {
  unweighted: number | null
  weighted: number | null
  graded: number
  apCount: number
  honorsCount: number
}

const computeGpa = (courses: CourseEntry[]): GpaSummary => {
  const graded = courses.filter(c => c.earnedGrade && GRADE_POINTS[c.earnedGrade] !== null)
  if (graded.length === 0) return { unweighted: null, weighted: null, graded: 0, apCount: 0, honorsCount: 0 }
  const unweighted = graded.reduce((a, c) => a + (GRADE_POINTS[c.earnedGrade] ?? 0), 0) / graded.length
  const weighted = graded.reduce((a, c) => a + (GRADE_POINTS[c.earnedGrade] ?? 0) + LEVEL_WEIGHT[c.level], 0) / graded.length
  return {
    unweighted,
    weighted,
    graded: graded.length,
    apCount: courses.filter(c => c.level === 'AP').length,
    honorsCount: courses.filter(c => c.level === 'Honors').length,
  }
}

const PlanTab = ({
  courses,
  onSave,
}: {
  courses: CourseEntry[]
  onSave: (next: CourseEntry[]) => void
}) => {
  const summary = useMemo(() => computeGpa(courses), [courses])

  const updateCell = (grade: SchoolGrade, slot: number, fields: Partial<CourseEntry>) => {
    const id = `g${grade}s${slot}`
    const existing = courses.find(c => c.id === id)
    if (existing) {
      onSave(courses.map(c => c.id === id ? { ...c, ...fields } : c))
    } else {
      const fresh: CourseEntry = {
        id, grade, name: '', level: 'Regular', earnedGrade: '',
        ...fields,
      }
      onSave([...courses, fresh])
    }
  }

  const clearCell = (grade: SchoolGrade, slot: number) => {
    onSave(courses.filter(c => c.id !== `g${grade}s${slot}`))
  }

  const getCell = (grade: SchoolGrade, slot: number): CourseEntry | undefined =>
    courses.find(c => c.id === `g${grade}s${slot}`)

  return (
    <div style={{ padding: '24px 28px' }}>
      <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, color: C.text, margin: 0, marginBottom: 6 }}>4-Year Plan</h2>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 20, lineHeight: 1.6 }}>
        Map your courses across all four years. Set the level for each course (Regular / Honors / AP / IB / DE) and record grades as you earn them. GPA estimates update automatically.
      </p>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 22 }}>
        <SummaryCard label="Unweighted GPA" value={summary.unweighted != null ? summary.unweighted.toFixed(2) : '—'} hint={`${summary.graded} graded`} />
        <SummaryCard label="Weighted GPA" value={summary.weighted != null ? summary.weighted.toFixed(2) : '—'} hint="Honors +0.5 / AP +1.0" />
        <SummaryCard label="AP courses" value={summary.apCount.toString()} hint="across all years" />
        <SummaryCard label="Honors courses" value={summary.honorsCount.toString()} hint="across all years" />
      </div>

      {/* The grid: rows are slots, cols are grades */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '110px repeat(4, 1fr)', borderBottom: `1px solid ${C.border}`, background: C.bg }}>
          <div style={{ padding: '10px 12px', fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Slot</div>
          {SCHOOL_GRADES.map((g) => (
            <div key={g} style={{ padding: '10px 12px', fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderLeft: `1px solid ${C.border}` }}>
              {gradeLabel(g)}
            </div>
          ))}
        </div>

        {Array.from({ length: SLOT_COUNT }, (_, slotIdx) => {
          const slot = slotIdx + 1
          return (
            <div key={slot} style={{ display: 'grid', gridTemplateColumns: '110px repeat(4, 1fr)', borderTop: slotIdx === 0 ? 'none' : `1px solid ${C.border}` }}>
              <div style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bg }}>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: C.textMuted }}>{slot}.</span>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, color: C.textFaint }}>{TEMPLATE_SUBJECTS[slotIdx] ?? ''}</span>
              </div>
              {SCHOOL_GRADES.map((grade) => {
                const cell = getCell(grade, slot)
                return (
                  <CourseCell
                    key={`${grade}-${slot}`}
                    course={cell}
                    onUpdate={(fields) => updateCell(grade, slot, fields)}
                    onClear={() => clearCell(grade, slot)}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const SummaryCard = ({ label, value, hint }: { label: string; value: string; hint: string }) => (
  <div style={{ padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
    <div style={{ fontFamily: "'Young Serif',serif", fontSize: 22, color: MC, lineHeight: 1.1 }}>{value}</div>
    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, color: C.textFaint, marginTop: 2 }}>{hint}</div>
  </div>
)

const CourseCell = ({
  course,
  onUpdate,
  onClear,
}: {
  course: CourseEntry | undefined
  onUpdate: (fields: Partial<CourseEntry>) => void
  onClear: () => void
}) => {
  const isEmpty = !course || !course.name
  return (
    <div style={{ padding: 8, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <input
        value={course?.name ?? ''}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder="Course name…"
        style={{
          width: '100%', padding: '6px 8px', borderRadius: 6,
          border: `1px solid ${isEmpty ? 'transparent' : C.border}`,
          background: isEmpty ? 'transparent' : C.bg,
          fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text, outline: 'none',
        }}
        onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = `${MC}50` }}
        onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = isEmpty ? 'transparent' : C.border }}
      />
      {!isEmpty && course && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <select
            value={course.level}
            onChange={(e) => onUpdate({ level: e.target.value as CourseLevel })}
            style={{
              flex: 1, padding: '4px 6px', borderRadius: 5,
              border: `1px solid ${LEVEL_COLORS[course.level]}40`,
              background: `${LEVEL_COLORS[course.level]}10`,
              color: LEVEL_COLORS[course.level],
              fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {COURSE_LEVELS.map(lv => <option key={lv} value={lv}>{lv}</option>)}
          </select>
          <select
            value={course.earnedGrade}
            onChange={(e) => onUpdate({ earnedGrade: e.target.value as LetterGrade })}
            style={{
              width: 50, padding: '4px 6px', borderRadius: 5,
              border: `1px solid ${C.border}`, background: C.surface,
              fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.text, cursor: 'pointer',
            }}
          >
            {LETTER_GRADES.map(lg => <option key={lg} value={lg}>{lg || '—'}</option>)}
          </select>
          <button
            onClick={onClear}
            aria-label="Clear course"
            style={{ width: 22, height: 22, padding: 0, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: C.textFaint, fontSize: 12 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#B93A3A' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.textFaint }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

const gradeLabel = (g: SchoolGrade): string => {
  const labels: Record<SchoolGrade, string> = { 9: 'Freshman', 10: 'Sophomore', 11: 'Junior', 12: 'Senior' }
  return labels[g]
}

/* ─── module shell ─── */

interface Props {
  open: boolean
  onClose: () => void
}

export default function CoursePlanningModule({ open, onClose }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const tourSeen = profile?.settings?.intros_seen?.includes(TOUR_INTRO_KEY) ?? false
  const [showTour, setShowTour] = useState(false)
  const [tab, setTab] = useState<TabId>('overview')
  const [progress, setProgress] = useState<ChecklistProgressMap>({})
  const [courses, setCourses] = useState<CourseEntry[]>([])

  useEffect(() => {
    if (open && !tourSeen) {
      const t = setTimeout(() => setShowTour(true), 400)
      return () => clearTimeout(t)
    }
  }, [open, tourSeen])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    getModuleChecklistProgress(MODULE_NAME).then((p) => { if (!cancelled) setProgress(p) }).catch(() => {})
    getModuleData<CourseEntry[]>(MODULE_NAME, COURSES_KEY)
      .then((c) => { if (!cancelled && Array.isArray(c)) setCourses(c) }).catch(() => {})
    return () => { cancelled = true }
  }, [open])

  const persistStatus = useCallback(async (itemId: string, next: ChecklistItemStatus) => {
    const current = progress[itemId] ?? 'available'
    setProgress((prev) => ({ ...prev, [itemId]: next }))
    try { await setModuleChecklistItem(MODULE_NAME, itemId, next) }
    catch { setProgress((prev) => ({ ...prev, [itemId]: current })) }
  }, [progress])

  const handleToggle = useCallback((itemId: string) => {
    const current = progress[itemId] ?? 'available'
    persistStatus(itemId, nextStatus(current))
  }, [progress, persistStatus])

  const handleMarkComplete = useCallback((itemId: string) => {
    const current = progress[itemId] ?? 'available'
    persistStatus(itemId, current === 'completed' ? 'available' : 'completed')
  }, [progress, persistStatus])

  const handleSaveCourses = useCallback(async (next: CourseEntry[]) => {
    const previous = courses
    setCourses(next)
    try { await setModuleData(MODULE_NAME, COURSES_KEY, next) }
    catch { setCourses(previous) }
  }, [courses])

  if (!open) return null

  const content =
    tab === 'overview'
      ? <OverviewTab progress={progress} onToggle={handleToggle} onMarkComplete={handleMarkComplete} />
      : <PlanTab courses={courses} onSave={handleSaveCourses} />

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ position: 'fixed', inset: 0, background: C.bg, zIndex: 100, display: 'flex', flexDirection: 'column' }}
    >
      <style>{`@keyframes cp-spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div data-tour="breadcrumb" style={{ padding: '13px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, background: C.surface, flexShrink: 0 }}>
          <button onClick={onClose} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 500, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Dashboard</button>
          <span style={{ color: C.textFaint }}>/</span>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>Course Planning</span>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <ModuleTabNav active={tab} onTab={setTab} progress={progress} onTour={() => setShowTour(true)} />
          <div data-tour="content" style={{ flex: 1, overflowY: 'auto' }}>{content}</div>
        </div>
      </div>

      <AnimatePresence>
        {showTour && (
          <CoursePlanningModuleTour
            onStart={() => { if (user) markIntroSeen(user.id, TOUR_INTRO_KEY, profile?.settings ?? null).then(refreshProfile).catch(() => {}) }}
            onDismiss={() => setShowTour(false)}
            onSwitchTab={setTab}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
