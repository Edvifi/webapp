/**
 * EssaysModule — sixth concrete module.
 *
 * Tabs: Overview (writing strategy checklist) + Drafts (drafting workspace
 * with list view and full-pane editor). Most distinct shape so far —
 * when an essay is opened the editor takes the full content area, like
 * a focused writing app.
 */

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { markIntroSeen } from '../lib/profiles'
import { C, MODULE_COLORS } from '../lib/designTokens'
import { Bar, Tag } from './moduleUI'
import {
  getModuleChecklistProgress,
  setModuleChecklistItem,
  getModuleData,
  setModuleData,
} from '../lib/moduleProgress'
import type { ChecklistProgressMap, ChecklistItemStatus } from '../lib/moduleProgress'
import {
  ESSAYS_CHECKLIST,
  ESSAYS_TOTAL_ITEMS,
  ESSAYS_ALL_IDS,
  ESSAY_STATUS_META,
  COMMON_APP_PROMPTS_2026,
  type EssayDraft,
  type EssayStatus,
} from '../data/essaysChecklist'
import { ESSAYS_CONTENT_MAP } from '../data/essaysContent'
import EssaysModuleTour, { type EssaysTabId } from './EssaysModuleTour'
import ModuleTabNav from './ModuleTabNav'
import ModuleOverviewTab from './ModuleOverviewTab'

const MC = MODULE_COLORS.essays
const MODULE_NAME = 'essays'
const TOUR_INTRO_KEY = 'essays-module-tour'
const DRAFTS_KEY = 'drafts'


/* ─── primitives ─── */

const itemTypeIcon: Record<string, string> = {
  article: '📖',
  task: '✓',
  resource: '🔗',
}

/* ─── tab nav ─── */

type TabId = EssaysTabId

const TABS: Array<{ id: TabId; label: string; emoji: string }> = [
  { id: 'overview', label: 'Overview', emoji: '🏠' },
  { id: 'drafts', label: 'Drafts', emoji: '🪶' },
]

/* ─── Overview tab ─── */

const nextStatus = (s: ChecklistItemStatus): ChecklistItemStatus => {
  if (s === 'available') return 'in-progress'
  if (s === 'in-progress') return 'completed'
  return 'available'
}

/* ─── Drafts tab ─── */

const wordCount = (text: string): number => {
  const t = text.trim()
  if (t.length === 0) return 0
  return t.split(/\s+/).length
}

const newDraft = (): EssayDraft => ({
  id: `essay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: '',
  prompt: '',
  schools: '',
  wordTarget: 650,
  status: 'draft',
  body: '',
  updatedAt: Date.now(),
})

const DraftsTab = ({
  drafts,
  onSave,
}: {
  drafts: EssayDraft[]
  onSave: (next: EssayDraft[]) => void
}) => {
  const [activeId, setActiveId] = useState<string | null>(null)

  const addDraft = (preset?: Partial<EssayDraft>) => {
    const d: EssayDraft = { ...newDraft(), ...preset }
    onSave([...drafts, d])
    setActiveId(d.id)
  }

  const updateDraft = (id: string, fields: Partial<EssayDraft>) => {
    onSave(drafts.map(d => d.id === id ? { ...d, ...fields, updatedAt: Date.now() } : d))
  }

  const removeDraft = (id: string) => {
    onSave(drafts.filter(d => d.id !== id))
    if (activeId === id) setActiveId(null)
  }

  const active = drafts.find(d => d.id === activeId)

  if (active) {
    return (
      <DraftEditor
        draft={active}
        onUpdate={(fields) => updateDraft(active.id, fields)}
        onClose={() => setActiveId(null)}
        onDelete={() => removeDraft(active.id)}
      />
    )
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 920 }}>
      <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, color: C.text, margin: 0, marginBottom: 6 }}>Drafts</h2>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 20, lineHeight: 1.6 }}>
        Track every essay you're drafting — personal statement, "Why us" supplements, short-takes. Click a draft to open the editor.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <button
          onClick={() => addDraft({ title: 'Personal Statement', wordTarget: 650, schools: 'Common App' })}
          style={primaryBtn}
        >
          + Personal Statement
        </button>
        <button
          onClick={() => addDraft({ title: 'New supplement', wordTarget: 250 })}
          style={secondaryBtn}
        >
          + Supplement
        </button>
        <button
          onClick={() => addDraft()}
          style={secondaryBtn}
        >
          + Blank essay
        </button>
      </div>

      {drafts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🪶</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: C.textMuted }}>No drafts yet — start with the Personal Statement above.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {drafts.map((d) => (
            <DraftCard key={d.id} draft={d} onOpen={() => setActiveId(d.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

const primaryBtn: CSSProperties = {
  padding: '10px 18px', borderRadius: 10, background: MC, color: '#fff',
  border: 'none', fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600,
  cursor: 'pointer',
}

const secondaryBtn: CSSProperties = {
  padding: '10px 18px', borderRadius: 10, background: 'transparent',
  border: `1px solid ${MC}40`, color: MC,
  fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer',
}

const DraftCard = ({ draft, onOpen }: { draft: EssayDraft; onOpen: () => void }) => {
  const wc = wordCount(draft.body)
  const meta = ESSAY_STATUS_META[draft.status]
  const wordPct = draft.wordTarget > 0 ? wc / draft.wordTarget : 0
  return (
    <button
      onClick={onOpen}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        width: '100%', padding: '14px 16px',
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
        cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${MC}50` }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: "'Young Serif',serif", fontSize: 16, color: C.text, flex: 1 }}>
          {draft.title || <span style={{ color: C.textFaint, fontStyle: 'italic' }}>Untitled essay</span>}
        </span>
        <Tag label={meta.label} color={meta.color} bg={meta.bg} />
      </div>
      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted, marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {draft.schools || 'No school tagged'} · {draft.prompt ? draft.prompt.slice(0, 60) + (draft.prompt.length > 60 ? '…' : '') : 'No prompt set'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Bar value={wordPct} color={wc > draft.wordTarget ? '#C47A12' : MC} height={4} />
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: wc > draft.wordTarget ? '#C47A12' : C.textMuted, whiteSpace: 'nowrap', minWidth: 80, textAlign: 'right' }}>
          {wc} / {draft.wordTarget} words
        </span>
      </div>
    </button>
  )
}

const DraftEditor = ({
  draft,
  onUpdate,
  onClose,
  onDelete,
}: {
  draft: EssayDraft
  onUpdate: (fields: Partial<EssayDraft>) => void
  onClose: () => void
  onDelete: () => void
}) => {
  const wc = useMemo(() => wordCount(draft.body), [draft.body])
  const overTarget = draft.wordTarget > 0 && wc > draft.wordTarget
  const meta = ESSAY_STATUS_META[draft.status]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Editor toolbar */}
      <div style={{ padding: '14px 28px', borderBottom: `1px solid ${C.border}`, background: C.surface, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 500, color: C.textMuted, padding: 0 }}
        >
          ← All drafts
        </button>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: overTarget ? '#C47A12' : C.textMuted, fontWeight: 600 }}>
          {wc} / {draft.wordTarget} words
        </span>
        <select
          value={draft.status}
          onChange={(e) => onUpdate({ status: e.target.value as EssayStatus })}
          style={{
            padding: '6px 10px', borderRadius: 6,
            border: `1px solid ${meta.color}40`, background: meta.bg,
            color: meta.color, fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <option value="draft">Draft</option>
          <option value="revising">Revising</option>
          <option value="final">Final</option>
        </select>
        <button
          onClick={onDelete}
          aria-label="Delete draft"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, fontSize: 16, padding: 6 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#B93A3A' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.textFaint }}
        >
          🗑
        </button>
      </div>

      {/* Metadata strip */}
      <div style={{ padding: '14px 28px', borderBottom: `1px solid ${C.border}`, background: C.bg, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Title</div>
          <input
            value={draft.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Personal Statement, Why Yale, …"
            style={inputStyle}
          />
        </div>
        <div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>School(s)</div>
          <input
            value={draft.schools}
            onChange={(e) => onUpdate({ schools: e.target.value })}
            placeholder="Common App, Yale, …"
            style={inputStyle}
          />
        </div>
        <div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Word target</div>
          <input
            type="number"
            min={0}
            value={draft.wordTarget}
            onChange={(e) => onUpdate({ wordTarget: Number(e.target.value) })}
            style={inputStyle}
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prompt</div>
            <PromptPicker onPick={(text) => onUpdate({ prompt: text })} />
          </div>
          <textarea
            value={draft.prompt}
            onChange={(e) => onUpdate({ prompt: e.target.value })}
            placeholder="Paste the essay prompt here…"
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: "'Outfit',sans-serif" }}
          />
        </div>
      </div>

      {/* Editor body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <textarea
          value={draft.body}
          onChange={(e) => onUpdate({ body: e.target.value })}
          placeholder="Write your essay here. Word count updates live."
          style={{
            flex: 1,
            border: 'none', outline: 'none', resize: 'none',
            padding: '32px 60px', fontFamily: "'Outfit',sans-serif",
            fontSize: 15, lineHeight: 1.75, color: C.text, background: C.bg,
            maxWidth: 760, alignSelf: 'center', width: '100%',
          }}
        />
      </div>
    </div>
  )
}

const PromptPicker = ({ onPick }: { onPick: (text: string) => void }) => {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '4px 10px', borderRadius: 5,
          border: `1px solid ${MC}40`, background: `${MC}08`,
          fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: MC, cursor: 'pointer',
        }}
      >
        Insert Common App prompt ↓
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: C.shadow2, zIndex: 5, width: 380, maxHeight: 360, overflowY: 'auto' }}>
          {COMMON_APP_PROMPTS_2026.map((p, i) => (
            <button
              key={p.id}
              onClick={() => { onPick(p.text); setOpen(false) }}
              style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderTop: i === 0 ? 'none' : `1px solid ${C.border}`, cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.surfaceHover }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, color: MC, marginBottom: 3 }}>Prompt {i + 1}</div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.text, lineHeight: 1.45 }}>{p.text}</div>
            </button>
          ))}
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

/* ─── module shell ─── */

interface Props {
  open: boolean
  onClose: () => void
}

export default function EssaysModule({ open, onClose }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const tourSeen = profile?.settings?.intros_seen?.includes(TOUR_INTRO_KEY) ?? false
  const [showTour, setShowTour] = useState(false)
  const [tab, setTab] = useState<TabId>('overview')
  const [progress, setProgress] = useState<ChecklistProgressMap>({})
  const [drafts, setDrafts] = useState<EssayDraft[]>([])

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
    getModuleData<EssayDraft[]>(MODULE_NAME, DRAFTS_KEY)
      .then((d) => { if (!cancelled && Array.isArray(d)) setDrafts(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [open])

  // Refs mirror state so persist callbacks see latest values for rollback /
  // read-modify operations (closure-captured state would be stale under
  // rapid concurrent calls).
  const draftsRef = useRef(drafts)
  useEffect(() => { draftsRef.current = drafts }, [drafts])
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

  const handleSaveDrafts = useCallback(async (next: EssayDraft[]) => {
    const before = draftsRef.current
    setDrafts(next)
    try { await setModuleData(MODULE_NAME, DRAFTS_KEY, next) }
    catch {
      setDrafts((prev) => prev === next ? before : prev)
    }
  }, [])

  if (!open) return null

  const content =
    tab === 'overview'
      ? <ModuleOverviewTab progress={progress} onToggle={handleToggle} onMarkComplete={handleMarkComplete} checklist={ESSAYS_CHECKLIST} contentMap={ESSAYS_CONTENT_MAP} allIds={ESSAYS_ALL_IDS} totalItems={ESSAYS_TOTAL_ITEMS} accent={MC} title="Essay Strategy" subtitle="Click an item title to read it. Click the circle to cycle status." itemTypeIcon={itemTypeIcon} />
      : <DraftsTab drafts={drafts} onSave={handleSaveDrafts} />

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
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: C.text }}>College Essays</span>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <ModuleTabNav active={tab} onTab={setTab} progress={progress} totalItems={ESSAYS_TOTAL_ITEMS} accent={MC} icon="🪶" title="Essays" subtitle="Drafting Season" tabs={TABS} onTour={() => setShowTour(true)} />
          <div data-tour="content" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>{content}</div>
        </div>
      </div>

      <AnimatePresence>
        {showTour && (
          <EssaysModuleTour
            onStart={() => { if (user) markIntroSeen(TOUR_INTRO_KEY).then(refreshProfile).catch(() => {}) }}
            onDismiss={() => setShowTour(false)}
            onSwitchTab={setTab}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
