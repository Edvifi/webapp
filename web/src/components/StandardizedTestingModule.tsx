/**
 * StandardizedTestingModule — second concrete module after Financial Aid.
 *
 * Demonstrates the framework primitives (designTokens, ModuleTour,
 * moduleProgress) without forcing the FAFSA layout on a different domain.
 * Three tabs: Overview (checklist), Test Calendar, Prep Resources. No chat
 * panel — modules don't all need one.
 */

import {
  useState,
  useEffect,
  useCallback,
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
} from '../lib/moduleProgress'
import type { ChecklistProgressMap, ChecklistItemStatus } from '../lib/fafsaData'
import {
  TESTING_CHECKLIST,
  TESTING_TOTAL_ITEMS,
  UPCOMING_TEST_DATES,
  PREP_RESOURCES,
  type PrepResource,
} from '../data/testingChecklist'
import TestingModuleTour, { type TestingTabId } from './TestingModuleTour'

const MC = MODULE_COLORS.testing
const MODULE_NAME = 'testing'
const TOUR_INTRO_KEY = 'testing-module-tour'

const EASE_OUT = [0.22, 1, 0.36, 1] as const

/* ─── primitives (kept inline; will extract once Module 3 also wants these) ─── */

const Bar = ({ value, color, height = 4 }: { value: number; color: string; height?: number }) => (
  <div style={{ width: '100%', height, borderRadius: height, background: 'rgba(60,35,10,0.10)', overflow: 'hidden' }}>
    <div style={{ width: `${value * 100}%`, height: '100%', borderRadius: height, background: color, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
  </div>
)

const SecLabel = ({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) => (
  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, color: 'rgba(28,18,7,0.40)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, ...style }}>{children}</div>
)

const Tag = ({ label, color, bg }: { label: string; color: string; bg?: string }) => (
  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 600, color, background: bg || `${color}15`, padding: '2px 8px', borderRadius: 99, border: `1px solid ${color}28`, whiteSpace: 'nowrap' }}>{label}</span>
)

const Ring = ({ status, color }: { status: ChecklistItemStatus; color: string }) => {
  if (status === 'completed') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: color, color: '#fff', flexShrink: 0, fontSize: 12 }}>✓</span>
  )
  if (status === 'in-progress') return (
    <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: `2.5px solid ${color}`, borderTopColor: 'transparent', display: 'inline-block', animation: 'testing-spin 1s linear infinite' }} />
  )
  return <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: '1.5px solid rgba(60,35,10,0.18)', display: 'inline-block' }} />
}

const itemTypeIcon: Record<string, string> = {
  article: '📖',
  quiz: '❓',
  task: '✓',
  resource: '🔗',
}

/* ─── tab nav ─── */

type TabId = TestingTabId

const TABS: Array<{ id: TabId; label: string; emoji: string }> = [
  { id: 'overview', label: 'Overview', emoji: '🏠' },
  { id: 'calendar', label: 'Test Calendar', emoji: '📅' },
  { id: 'resources', label: 'Prep Resources', emoji: '📚' },
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
  const pct = TESTING_TOTAL_ITEMS > 0 ? completed / TESTING_TOTAL_ITEMS : 0
  return (
    <nav data-tour="sidebar" style={{ width: 188, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
      <div style={{ padding: '0 14px 18px', borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ fontSize: 24, marginBottom: 5, lineHeight: 1 }}>✏️</div>
        <div style={{ fontFamily: "'Young Serif',serif", fontSize: 15, color: C.text, lineHeight: 1.3 }}>Standardized Testing</div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: MC, fontWeight: 600, marginTop: 3 }}>Test Season</div>
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
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, color: C.textFaint, marginTop: 5 }}>{completed} of {TESTING_TOTAL_ITEMS} items done</div>
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

/* ─── tabs ─── */

const nextStatus = (s: ChecklistItemStatus): ChecklistItemStatus => {
  if (s === 'available') return 'in-progress'
  if (s === 'in-progress') return 'completed'
  return 'available'
}

const OverviewTab = ({
  progress,
  onToggle,
}: {
  progress: ChecklistProgressMap
  onToggle: (itemId: string) => void
}) => {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: true })
  const statusOf = (id: string): ChecklistItemStatus => progress[id] ?? 'available'
  const done = TESTING_CHECKLIST.reduce(
    (a, s) => a + s.items.filter((x) => statusOf(x.id) === 'completed').length,
    0,
  )
  return (
    <div style={{ padding: '24px 28px', maxWidth: 760 }}>
      <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, color: C.text, margin: 0, marginBottom: 6 }}>Test Prep Checklist</h2>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 20, lineHeight: 1.6 }}>
        Work through these in order or jump to whatever feels relevant. Click an item to cycle its status: empty → in-progress → done.
      </p>

      <div data-tour="overview-progress" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 18 }}>
        <div style={{ flex: 1 }}><Bar value={done / TESTING_TOTAL_ITEMS} color={MC} height={6} /></div>
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, color: MC, whiteSpace: 'nowrap' }}>{done}/{TESTING_TOTAL_ITEMS} completed</span>
      </div>

      {TESTING_CHECKLIST.map((section, sIdx) => {
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
                      <button
                        key={item.id}
                        onClick={() => onToggle(item.id)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', background: 'transparent', border: 'none', borderTop: `1px solid ${C.border}`, cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.surfaceHover }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        <Ring status={status} color={MC} />
                        <span style={{ fontSize: 14 }}>{itemTypeIcon[item.type]}</span>
                        <span style={{ flex: 1, fontFamily: "'Outfit',sans-serif", fontSize: 13, color: status === 'completed' ? C.textMuted : C.text, textDecoration: status === 'completed' ? 'line-through' : 'none' }}>{item.label}</span>
                      </button>
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

const CalendarTab = () => {
  return (
    <div style={{ padding: '24px 28px', maxWidth: 760 }}>
      <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, color: C.text, margin: 0, marginBottom: 6 }}>Upcoming Test Dates</h2>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 20, lineHeight: 1.6 }}>
        Register early — late registration usually adds a $30+ fee, and seats fill up at popular centers.
      </p>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr', padding: '10px 16px', background: C.bg, borderBottom: `1px solid ${C.border}` }}>
          <SecLabel style={{ margin: 0 }}>Test</SecLabel>
          <SecLabel style={{ margin: 0 }}>Date</SecLabel>
          <SecLabel style={{ margin: 0 }}>Reg. Deadline</SecLabel>
          <SecLabel style={{ margin: 0 }}>Late Reg.</SecLabel>
        </div>
        {UPCOMING_TEST_DATES.map((d, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr', padding: '12px 16px', borderTop: i === 0 ? 'none' : `1px solid ${C.border}`, alignItems: 'center' }}>
            <Tag label={d.test} color={MC} />
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>{d.date}</span>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted }}>{d.registration_deadline}</span>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textFaint }}>{d.late_registration ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const ResourcesTab = () => {
  const [costFilter, setCostFilter] = useState<'all' | PrepResource['cost']>('all')
  const filtered = costFilter === 'all' ? PREP_RESOURCES : PREP_RESOURCES.filter(r => r.cost === costFilter)
  return (
    <div style={{ padding: '24px 28px', maxWidth: 820 }}>
      <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, color: C.text, margin: 0, marginBottom: 6 }}>Prep Resources</h2>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 16, lineHeight: 1.6 }}>
        Curated free and paid options. Start with Khan Academy + an official practice test before spending money.
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {(['all', 'Free', 'Paid', 'Mixed'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCostFilter(c)}
            style={{
              padding: '6px 12px', borderRadius: 6,
              fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600,
              border: `1px solid ${costFilter === c ? MC : C.border}`,
              background: costFilter === c ? `${MC}15` : C.surface,
              color: costFilter === c ? MC : C.textMuted,
              cursor: 'pointer',
            }}
          >
            {c === 'all' ? 'All' : c}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {filtered.map((r) => (
          <a
            key={r.title}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', padding: '14px 16px', border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, textDecoration: 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = MC; (e.currentTarget as HTMLAnchorElement).style.boxShadow = C.shadow1 }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = C.border; (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 10 }}>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: C.text }}>{r.title}</span>
              <Tag label={r.cost} color={r.cost === 'Free' ? '#2D9E72' : r.cost === 'Paid' ? '#C47A12' : MC} />
            </div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textMuted, marginBottom: 8 }}>{r.provider} · {r.type}</div>
            <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text, lineHeight: 1.5, margin: 0 }}>{r.blurb}</p>
          </a>
        ))}
      </div>
    </div>
  )
}

/* ─── module shell ─── */

interface Props {
  open: boolean
  onClose: () => void
}

export default function StandardizedTestingModule({ open, onClose }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const tourSeen = profile?.settings?.intros_seen?.includes(TOUR_INTRO_KEY) ?? false
  const [showTour, setShowTour] = useState(false)
  const [tab, setTab] = useState<TabId>('overview')
  const [progress, setProgress] = useState<ChecklistProgressMap>({})

  // Auto-show tour on first open
  useEffect(() => {
    if (open && !tourSeen) {
      const t = setTimeout(() => setShowTour(true), 400)
      return () => clearTimeout(t)
    }
  }, [open, tourSeen])

  // Esc closes the module
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Load checklist progress on open
  useEffect(() => {
    if (!open) return
    let cancelled = false
    getModuleChecklistProgress(MODULE_NAME)
      .then((p) => { if (!cancelled) setProgress(p) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [open])

  const handleToggle = useCallback(async (itemId: string) => {
    const current = progress[itemId] ?? 'available'
    const next = nextStatus(current)
    setProgress((prev) => ({ ...prev, [itemId]: next }))
    try {
      await setModuleChecklistItem(MODULE_NAME, itemId, next)
    } catch {
      setProgress((prev) => ({ ...prev, [itemId]: current }))
    }
  }, [progress])

  if (!open) return null

  const content =
    tab === 'overview' ? <OverviewTab progress={progress} onToggle={handleToggle} /> :
    tab === 'calendar' ? <CalendarTab /> :
    <ResourcesTab />

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ position: 'fixed', inset: 0, background: C.bg, zIndex: 100, display: 'flex', flexDirection: 'column' }}
    >
      <style>{`
        @keyframes testing-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div data-tour="breadcrumb" style={{ padding: '13px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, background: C.surface, flexShrink: 0 }}>
          <button onClick={onClose} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 500, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Dashboard</button>
          <span style={{ color: C.textFaint }}>/</span>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>Standardized Testing</span>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <ModuleTabNav active={tab} onTab={setTab} progress={progress} onTour={() => setShowTour(true)} />
          <div data-tour="content" style={{ flex: 1, overflowY: 'auto' }}>{content}</div>
        </div>
      </div>

      <AnimatePresence>
        {showTour && (
          <TestingModuleTour
            onStart={() => {
              if (user) markIntroSeen(user.id, TOUR_INTRO_KEY, profile?.settings ?? null).then(refreshProfile).catch(() => {})
            }}
            onDismiss={() => setShowTour(false)}
            onSwitchTab={setTab}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
