/**
 * ExtracurricularsModule — fourth concrete module.
 *
 * Tabs: Overview (strategy checklist), Activities (Common-App-shaped list
 * with up to 10 entries, ranked by importance). Persists activities via
 * setModuleData('extracurriculars', 'activities', ...).
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { markIntroSeen } from '../lib/profiles'
import { C, MODULE_COLORS, EASE_OUT } from '../lib/designTokens'
import {
  getModuleChecklistProgress,
  setModuleChecklistItem,
  getModuleData,
  setModuleData,
} from '../lib/moduleProgress'
import type { ChecklistProgressMap, ChecklistItemStatus } from '../lib/moduleProgress'
import {
  EC_CHECKLIST,
  EC_TOTAL_ITEMS,
  EC_ALL_IDS,
  EC_CATEGORIES,
  COMMON_APP_DESCRIPTION_LIMIT,
  COMMON_APP_POSITION_LIMIT,
  COMMON_APP_ORG_LIMIT,
  MAX_ACTIVITIES,
  type ActivityEntry,
  type EcCategory,
  type EcGrade,
} from '../data/extracurricularsChecklist'
import { EC_CONTENT_MAP } from '../data/extracurricularsContent'
import ExtracurricularsModuleTour, { type EcTabId } from './ExtracurricularsModuleTour'
import ChecklistContentView from './ChecklistContentView'

const MC = MODULE_COLORS.extracurriculars
const MODULE_NAME = 'extracurriculars'
const TOUR_INTRO_KEY = 'extracurriculars-module-tour'
const ACTIVITIES_KEY = 'activities'


/* ─── primitives ─── */

const Bar = ({ value, color, height = 4 }: { value: number; color: string; height?: number }) => (
  <div style={{ width: '100%', height, borderRadius: height, background: 'rgba(60,35,10,0.10)', overflow: 'hidden' }}>
    <div style={{ width: `${value * 100}%`, height: '100%', borderRadius: height, background: color, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
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
    <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: `2.5px solid ${color}`, borderTopColor: 'transparent', display: 'inline-block', animation: 'module-spin 1s linear infinite' }} />
  )
  return <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: '1.5px solid rgba(60,35,10,0.18)', display: 'inline-block' }} />
}

const itemTypeIcon: Record<string, string> = {
  article: '📖',
  task: '✓',
  resource: '🔗',
}

/* ─── tab nav ─── */

type TabId = EcTabId

const TABS: Array<{ id: TabId; label: string; emoji: string }> = [
  { id: 'overview', label: 'Overview', emoji: '🏠' },
  { id: 'activities', label: 'Activities', emoji: '🎭' },
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
  const pct = EC_TOTAL_ITEMS > 0 ? completed / EC_TOTAL_ITEMS : 0
  return (
    <nav data-tour="sidebar" style={{ width: 188, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
      <div style={{ padding: '0 14px 18px', borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ fontSize: 24, marginBottom: 5, lineHeight: 1 }}>🎭</div>
        <div style={{ fontFamily: "'Young Serif',serif", fontSize: 15, color: C.text, lineHeight: 1.3 }}>Extracurriculars</div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: MC, fontWeight: 600, marginTop: 3 }}>Lead & Impact</div>
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
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, color: C.textFaint, marginTop: 5 }}>{completed} of {EC_TOTAL_ITEMS} items done</div>
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
  const done = EC_CHECKLIST.reduce(
    (a, s) => a + s.items.filter((x) => statusOf(x.id) === 'completed').length,
    0,
  )

  if (activeContentId) {
    return (
      <ChecklistContentView
        itemId={activeContentId}
        status={statusOf(activeContentId)}
        contentMap={EC_CONTENT_MAP}
        allIds={EC_ALL_IDS}
        accentColor={MC}
        onBack={() => setActiveContentId(null)}
        onMarkComplete={onMarkComplete}
        onNavigate={setActiveContentId}
      />
    )
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 760 }}>
      <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, color: C.text, margin: 0, marginBottom: 6 }}>Activity Strategy Checklist</h2>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 20, lineHeight: 1.6 }}>
        Click an item title to read it. Click the circle to cycle status.
      </p>

      <div data-tour="overview-progress" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 18 }}>
        <div style={{ flex: 1 }}><Bar value={done / EC_TOTAL_ITEMS} color={MC} height={6} /></div>
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, color: MC, whiteSpace: 'nowrap' }}>{done}/{EC_TOTAL_ITEMS} completed</span>
      </div>

      {EC_CHECKLIST.map((section, sIdx) => {
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

/* ─── Activities tab ─── */

const newActivity = (): ActivityEntry => ({
  id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  category: 'Other Club/Activity',
  position: '',
  organization: '',
  description: '',
  hoursPerWeek: 0,
  weeksPerYear: 0,
  grades: [],
  continuing: false,
})

const ActivitiesTab = ({
  activities,
  onSave,
}: {
  activities: ActivityEntry[]
  onSave: (next: ActivityEntry[]) => void
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)

  const addActivity = () => {
    if (activities.length >= MAX_ACTIVITIES) return
    const a = newActivity()
    onSave([...activities, a])
    setEditingId(a.id)
  }

  const updateActivity = (id: string, fields: Partial<ActivityEntry>) => {
    onSave(activities.map(a => a.id === id ? { ...a, ...fields } : a))
  }

  const removeActivity = (id: string) => {
    onSave(activities.filter(a => a.id !== id))
    if (editingId === id) setEditingId(null)
  }

  const moveUp = (id: string) => {
    const idx = activities.findIndex(a => a.id === id)
    if (idx <= 0) return
    const next = [...activities]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    onSave(next)
  }

  const moveDown = (id: string) => {
    const idx = activities.findIndex(a => a.id === id)
    if (idx < 0 || idx >= activities.length - 1) return
    const next = [...activities]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    onSave(next)
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 920 }}>
      <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, color: C.text, margin: 0, marginBottom: 6 }}>Activities</h2>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 20, lineHeight: 1.6 }}>
        Up to 10 activities, ranked by importance (most important first). Mirrors the Common App's activity section.
        {activities.length > 0 && ` ${activities.length} of ${MAX_ACTIVITIES} used.`}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {activities.map((a, i) => (
          <ActivityCard
            key={a.id}
            activity={a}
            rank={i + 1}
            isEditing={editingId === a.id}
            canMoveUp={i > 0}
            canMoveDown={i < activities.length - 1}
            onEdit={() => setEditingId(editingId === a.id ? null : a.id)}
            onUpdate={(fields) => updateActivity(a.id, fields)}
            onRemove={() => removeActivity(a.id)}
            onMoveUp={() => moveUp(a.id)}
            onMoveDown={() => moveDown(a.id)}
          />
        ))}
      </div>

      {activities.length < MAX_ACTIVITIES && (
        <button
          onClick={addActivity}
          style={{
            marginTop: 14, padding: '12px 20px', borderRadius: 10,
            background: `${MC}10`, border: `1.5px dashed ${MC}50`,
            fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: MC,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          + Add an activity
        </button>
      )}
    </div>
  )
}

const ActivityCard = ({
  activity,
  rank,
  isEditing,
  canMoveUp,
  canMoveDown,
  onEdit,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  activity: ActivityEntry
  rank: number
  isEditing: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onEdit: () => void
  onUpdate: (fields: Partial<ActivityEntry>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) => {
  const isComplete = activity.position && activity.organization && activity.description && activity.grades.length > 0
  return (
    <div style={{ background: C.surface, border: `1px solid ${isComplete ? C.border : '#C47A1230'}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${MC}15`, color: MC, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          {rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activity.position || <span style={{ color: C.textFaint }}>Untitled activity</span>}
          </div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted }}>
            {activity.organization || <span style={{ fontStyle: 'italic' }}>Add organization</span>}
            {activity.category && ` · ${activity.category}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <IconBtn title="Move up" disabled={!canMoveUp} onClick={onMoveUp}>↑</IconBtn>
          <IconBtn title="Move down" disabled={!canMoveDown} onClick={onMoveDown}>↓</IconBtn>
          <IconBtn title={isEditing ? 'Close' : 'Edit'} onClick={onEdit}>{isEditing ? '✕' : '✎'}</IconBtn>
          <IconBtn title="Delete" onClick={onRemove} danger>🗑</IconBtn>
        </div>
      </div>

      {isEditing && (
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${C.border}`, background: C.bg, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Category">
            <select
              value={activity.category}
              onChange={(e) => onUpdate({ category: e.target.value as EcCategory })}
              style={selectStyle}
            >
              {EC_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </Field>
          <Field label={`Position / Role (${activity.position.length}/${COMMON_APP_POSITION_LIMIT})`}>
            <input
              value={activity.position}
              maxLength={COMMON_APP_POSITION_LIMIT}
              onChange={(e) => onUpdate({ position: e.target.value })}
              placeholder="e.g., Captain, Volunteer, Founder"
              style={inputStyle}
            />
          </Field>
          <Field label={`Organization (${activity.organization.length}/${COMMON_APP_ORG_LIMIT})`} fullWidth>
            <input
              value={activity.organization}
              maxLength={COMMON_APP_ORG_LIMIT}
              onChange={(e) => onUpdate({ organization: e.target.value })}
              placeholder="e.g., Lincoln High School Debate Team"
              style={inputStyle}
            />
          </Field>
          <Field label={`Description (${activity.description.length}/${COMMON_APP_DESCRIPTION_LIMIT})`} fullWidth>
            <textarea
              value={activity.description}
              maxLength={COMMON_APP_DESCRIPTION_LIMIT}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Active verb + accomplishments + outcomes. Tight!"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: "'Outfit',sans-serif" }}
            />
          </Field>
          <Field label="Hours / week">
            <input
              type="number"
              min={0}
              value={activity.hoursPerWeek}
              onChange={(e) => onUpdate({ hoursPerWeek: Number(e.target.value) })}
              style={inputStyle}
            />
          </Field>
          <Field label="Weeks / year">
            <input
              type="number"
              min={0}
              max={52}
              value={activity.weeksPerYear}
              onChange={(e) => onUpdate({ weeksPerYear: Number(e.target.value) })}
              style={inputStyle}
            />
          </Field>
          <Field label="Grade levels" fullWidth>
            <div style={{ display: 'flex', gap: 6 }}>
              {[9, 10, 11, 12].map((g) => {
                const grade = g as EcGrade
                const isOn = activity.grades.includes(grade)
                return (
                  <button
                    key={g}
                    onClick={() => onUpdate({
                      grades: isOn ? activity.grades.filter(x => x !== grade) : [...activity.grades, grade].sort(),
                    })}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600,
                      border: `1px solid ${isOn ? MC : C.border}`,
                      background: isOn ? `${MC}15` : C.surface,
                      color: isOn ? MC : C.textMuted, cursor: 'pointer',
                    }}
                  >
                    {g}
                  </button>
                )
              })}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12, fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={activity.continuing}
                  onChange={(e) => onUpdate({ continuing: e.target.checked })}
                />
                Continuing in college
              </label>
            </div>
          </Field>
        </div>
      )}
    </div>
  )
}

const inputStyle: CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 6,
  border: `1px solid ${C.border}`, background: C.surface,
  fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, outline: 'none',
}

const selectStyle: CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}

const Field = ({ label, children, fullWidth }: { label: string; children: ReactNode; fullWidth?: boolean }) => (
  <div style={{ gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 4 }}>{label}</div>
    {children}
  </div>
)

const IconBtn = ({ children, title, onClick, disabled, danger }: { children: ReactNode; title: string; onClick: () => void; disabled?: boolean; danger?: boolean }) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    style={{
      width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent',
      cursor: disabled ? 'not-allowed' : 'pointer',
      color: disabled ? C.textFaint : (danger ? '#B93A3A' : C.textMuted),
      fontSize: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.12s',
    }}
    onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = C.bg }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
  >
    {children}
  </button>
)

/* ─── module shell ─── */

interface Props {
  open: boolean
  onClose: () => void
}

export default function ExtracurricularsModule({ open, onClose }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const tourSeen = profile?.settings?.intros_seen?.includes(TOUR_INTRO_KEY) ?? false
  const [showTour, setShowTour] = useState(false)
  const [tab, setTab] = useState<TabId>('overview')
  const [progress, setProgress] = useState<ChecklistProgressMap>({})
  const [activities, setActivities] = useState<ActivityEntry[]>([])

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
    getModuleData<ActivityEntry[]>(MODULE_NAME, ACTIVITIES_KEY)
      .then((a) => { if (!cancelled && Array.isArray(a)) setActivities(a) }).catch(() => {})
    return () => { cancelled = true }
  }, [open])

  const activitiesRef = useRef(activities)
  useEffect(() => { activitiesRef.current = activities }, [activities])
  const progressRef = useRef(progress)
  useEffect(() => { progressRef.current = progress }, [progress])

  const persistStatus = useCallback(async (itemId: string, next: ChecklistItemStatus) => {
    const before = progressRef.current[itemId] ?? 'available'
    setProgress((prev) => ({ ...prev, [itemId]: next }))
    try { await setModuleChecklistItem(MODULE_NAME, itemId, next) }
    catch {
      setProgress((prev) => prev[itemId] === next ? { ...prev, [itemId]: before } : prev)
    }
  }, [])

  const handleToggle = useCallback((itemId: string) => {
    const current = progressRef.current[itemId] ?? 'available'
    persistStatus(itemId, nextStatus(current))
  }, [persistStatus])

  const handleMarkComplete = useCallback((itemId: string) => {
    const current = progressRef.current[itemId] ?? 'available'
    persistStatus(itemId, current === 'completed' ? 'available' : 'completed')
  }, [persistStatus])

  const handleSaveActivities = useCallback(async (next: ActivityEntry[]) => {
    const before = activitiesRef.current
    setActivities(next)
    try { await setModuleData(MODULE_NAME, ACTIVITIES_KEY, next) }
    catch {
      setActivities((prev) => prev === next ? before : prev)
    }
  }, [])

  if (!open) return null

  const content =
    tab === 'overview'
      ? <OverviewTab progress={progress} onToggle={handleToggle} onMarkComplete={handleMarkComplete} />
      : <ActivitiesTab activities={activities} onSave={handleSaveActivities} />

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ position: 'fixed', inset: 0, background: C.bg, zIndex: 100, display: 'flex', flexDirection: 'column' }}
    >

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div data-tour="breadcrumb" style={{ padding: '13px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, background: C.surface, flexShrink: 0 }}>
          <button onClick={onClose} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 500, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Dashboard</button>
          <span style={{ color: C.textFaint }}>/</span>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>Extracurriculars</span>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <ModuleTabNav active={tab} onTab={setTab} progress={progress} onTour={() => setShowTour(true)} />
          <div data-tour="content" style={{ flex: 1, overflowY: 'auto' }}>{content}</div>
        </div>
      </div>

      <AnimatePresence>
        {showTour && (
          <ExtracurricularsModuleTour
            onStart={() => { if (user) markIntroSeen(user.id, TOUR_INTRO_KEY, profile?.settings ?? null).then(refreshProfile).catch(() => {}) }}
            onDismiss={() => setShowTour(false)}
            onSwitchTab={setTab}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
