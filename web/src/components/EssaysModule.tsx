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
  useMemo,
  type CSSProperties,
} from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { markIntroSeen } from '../lib/profiles'
import { C, MODULE_COLORS } from '../lib/designTokens'
import { Bar, Tag } from './moduleUI'
import { useModuleChecklist, useModuleData } from '../lib/useModuleState'
import { FEATURES } from '../lib/featureFlags'
import {
  getEssayFeedback,
  isEssayFeedback,
  FEEDBACK_AREA_LABELS,
  FEEDBACK_MIN_WORDS,
  type EssayFeedback,
} from '../lib/essayFeedback'
import {
  ESSAYS_CHECKLIST,
  ESSAYS_TOTAL_ITEMS,
  ESSAYS_ALL_IDS,
  ESSAY_STATUS_META,
  COMMON_APP_PROMPTS_2026,
  type EssayDraft,
  type EssayStatus,
  type EssaysItemType,
} from '../data/essaysChecklist'
import { ESSAYS_CONTENT_MAP } from '../data/essaysContent'
import EssaysModuleTour, { type EssaysTabId } from './EssaysModuleTour'
import ModuleTabNav from './ModuleTabNav'
import ModuleOverviewTab from './ModuleOverviewTab'
import ModuleShell from './ModuleShell'

const DRAFTS_LOAD_FAILED_MESSAGE =
  "Couldn't load your saved work — check your connection and reopen. Editing is paused so nothing already saved gets overwritten."

const MC = MODULE_COLORS.essays
const MODULE_NAME = 'essays'
const TOUR_INTRO_KEY = 'essays-module-tour'
const DRAFTS_KEY = 'drafts'


/* ─── primitives ─── */

const itemTypeIcon: Record<EssaysItemType, string> = {
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
  draftsRef,
  onSave,
}: {
  drafts: EssayDraft[]
  /** Latest committed drafts. Handlers read this (not `drafts`) so a slow
   *  feedback response can't overwrite edits made while it was loading. */
  draftsRef: { current: EssayDraft[] }
  /** Resolves false if the write was rolled back. */
  onSave: (next: EssayDraft[]) => Promise<boolean>
}) => {
  const [activeId, setActiveId] = useState<string | null>(null)

  const addDraft = (preset?: Partial<EssayDraft>) => {
    const d: EssayDraft = { ...newDraft(), ...preset }
    onSave([...draftsRef.current, d])
    setActiveId(d.id)
  }

  const updateDraft = (id: string, fields: Partial<EssayDraft>) =>
    onSave(draftsRef.current.map(d => d.id === id ? { ...d, ...fields, updatedAt: Date.now() } : d))

  const removeDraft = (id: string) => {
    onSave(draftsRef.current.filter(d => d.id !== id))
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
  onUpdate: (fields: Partial<EssayDraft>) => Promise<boolean>
  onClose: () => void
  onDelete: () => void
}) => {
  const wc = useMemo(() => wordCount(draft.body), [draft.body])
  const overTarget = draft.wordTarget > 0 && wc > draft.wordTarget
  const meta = ESSAY_STATUS_META[draft.status]
  const toast = useToast()

  // Behind VITE_FEATURE_ESSAY_FEEDBACK: when off, no button, no panel, no
  // requests — previously saved feedback stays in the draft but isn't shown.
  const feedbackEnabled = FEATURES.essayFeedback
  const savedFeedback: EssayFeedback | undefined = isEssayFeedback(draft.feedback) ? draft.feedback : undefined
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const requestFeedback = async () => {
    if (!feedbackEnabled || feedbackLoading) return
    if (wc < FEEDBACK_MIN_WORDS) {
      toast.info(`Write at least ${FEEDBACK_MIN_WORDS} words first — feedback needs something to work with.`)
      return
    }
    setFeedbackLoading(true)
    setFeedbackOpen(true)
    try {
      const feedback = await getEssayFeedback(draft)
      // The result cost the student one of their daily requests and can't be
      // reproduced, so a failed save has to be visible rather than silently
      // rolled back.
      const saved = await onUpdate({ feedback, feedbackAt: Date.now(), feedbackWordCount: wc })
      if (!saved) toast.error("Feedback couldn't be saved — copy anything you need before closing this draft.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Feedback failed — try again.')
      if (!savedFeedback) setFeedbackOpen(false)
    } finally {
      setFeedbackLoading(false)
    }
  }

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
        {feedbackEnabled && (
          <button
            onClick={() => { if (savedFeedback && !feedbackOpen) setFeedbackOpen(true); else void requestFeedback() }}
            disabled={feedbackLoading}
            style={{
              padding: '7px 14px', borderRadius: 8, border: `1px solid ${MC}40`,
              background: feedbackLoading ? `${MC}10` : `${MC}08`, color: MC,
              fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600,
              cursor: feedbackLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {feedbackLoading ? 'Reviewing…' : savedFeedback && !feedbackOpen ? '✦ View feedback' : '✦ Get feedback'}
          </button>
        )}
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

      {/* Editor body — essay + optional feedback panel */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
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
        {feedbackEnabled && feedbackOpen && (
          <FeedbackPanel
            feedback={savedFeedback}
            loading={feedbackLoading}
            stale={savedFeedback != null && draft.feedbackWordCount != null && Math.abs(wc - draft.feedbackWordCount) > 40}
            onRefresh={() => void requestFeedback()}
            onClose={() => setFeedbackOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

/* ─── Feedback panel ─── */

const AREA_COLORS: Record<string, string> = {
  structure: '#7048C8',
  voice: '#C47A12',
  specificity: '#2D9E72',
  clarity: '#1D7FC4',
  'prompt-fit': '#B93A3A',
  length: '#7A6D5C',
}

const FeedbackPanel = ({
  feedback,
  loading,
  stale,
  onRefresh,
  onClose,
}: {
  feedback: EssayFeedback | undefined
  loading: boolean
  stale: boolean
  onRefresh: () => void
  onClose: () => void
}) => (
  <div style={{ width: 360, flexShrink: 0, borderLeft: `1px solid ${C.border}`, background: C.surface, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
    <div style={{ padding: '13px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <span style={{ fontFamily: "'Young Serif',serif", fontSize: 14, color: C.text }}>Essay Feedback</span>
      <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 600, color: MC, textTransform: 'uppercase', letterSpacing: '0.06em', background: `${MC}12`, padding: '2px 7px', borderRadius: 99 }}>AI</span>
      <span style={{ flex: 1 }} />
      <button
        onClick={onClose}
        aria-label="Close feedback"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 15, padding: 4, lineHeight: 1 }}
      >
        ✕
      </button>
    </div>

    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 12px' }}>
          <div style={{ fontSize: 26, marginBottom: 12 }}>✦</div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>
            Reading your draft…<br />This usually takes under a minute.
          </div>
        </div>
      ) : !feedback ? (
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, padding: '24px 8px', textAlign: 'center' }}>
          No feedback yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {stale && (
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: '#C47A12', background: '#FFF3E0', border: '1px solid #C47A1230', borderRadius: 8, padding: '8px 11px', lineHeight: 1.5 }}>
              Your draft has changed a lot since this feedback.{' '}
              <button onClick={onRefresh} style={{ background: 'none', border: 'none', padding: 0, color: '#C47A12', fontWeight: 700, cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>
                Get fresh feedback
              </button>
            </div>
          )}

          <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.text, lineHeight: 1.65, margin: 0 }}>
            {feedback.summary}
          </p>

          <div>
            <div style={panelHeading}>What's working</div>
            {feedback.strengths.map((s, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: '#2D9E72', marginBottom: 2 }}>✓ {s.point}</div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted, lineHeight: 1.55, fontStyle: 'italic' }}>"{s.evidence}"</div>
              </div>
            ))}
          </div>

          <div>
            <div style={panelHeading}>Where to focus</div>
            {feedback.improvements.map((imp, i) => {
              const color = AREA_COLORS[imp.area] ?? MC
              return (
                <div key={i} style={{ marginBottom: 12, padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  <span style={{ display: 'inline-block', fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                    {FEEDBACK_AREA_LABELS[imp.area] ?? imp.area}
                  </span>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.text, lineHeight: 1.55, marginBottom: 5 }}>{imp.issue}</div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.textMuted, lineHeight: 1.55 }}>
                    <span style={{ fontWeight: 600, color }}>Try: </span>{imp.suggestion}
                  </div>
                </div>
              )
            })}
          </div>

          <div>
            <div style={panelHeading}>Next session</div>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {feedback.next_steps.map((step, i) => (
                <li key={i} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12.5, color: C.text, lineHeight: 1.6, marginBottom: 4 }}>{step}</li>
              ))}
            </ol>
          </div>

          <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint, lineHeight: 1.5, margin: 0, textAlign: 'center' }}>
            Feedback is a starting point — the essay stays yours. Share drafts with a counselor or teacher too.
          </p>
        </div>
      )}
    </div>
  </div>
)

const panelHeading: CSSProperties = {
  fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700,
  color: 'rgba(var(--ink-rgb), 0.40)', textTransform: 'uppercase',
  letterSpacing: '0.08em', marginBottom: 8,
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
  const { progress, handleToggle, handleMarkComplete } = useModuleChecklist(MODULE_NAME, open)
  const { data: drafts, saveData: handleSaveDrafts, dataRef: draftsRef, loadFailed: draftsLoadFailed } =
    useModuleData<EssayDraft>(MODULE_NAME, DRAFTS_KEY, open)
  const shellToast = useToast()
  // A blocked save must not be silent: the hook refuses to write when the read
  // failed, so without this the student would type into a void.
  useEffect(() => {
    if (draftsLoadFailed) shellToast.error(DRAFTS_LOAD_FAILED_MESSAGE)
  }, [draftsLoadFailed, shellToast])

  useEffect(() => {
    if (open && !tourSeen) {
      const t = setTimeout(() => setShowTour(true), 400)
      return () => clearTimeout(t)
    }
  }, [open, tourSeen])

  const content =
    tab === 'overview'
      ? <ModuleOverviewTab progress={progress} onToggle={handleToggle} onMarkComplete={handleMarkComplete} checklist={ESSAYS_CHECKLIST} contentMap={ESSAYS_CONTENT_MAP} allIds={ESSAYS_ALL_IDS} totalItems={ESSAYS_TOTAL_ITEMS} accent={MC} title="Essay Strategy" subtitle="Click an item title to read it. Click the circle to cycle status." itemTypeIcon={itemTypeIcon} />
      : <DraftsTab drafts={drafts} draftsRef={draftsRef} onSave={handleSaveDrafts} />

  return (
    <ModuleShell
      open={open}
      onClose={onClose}
      breadcrumbLabel="College Essays"
      fillContent
      nav={<ModuleTabNav active={tab} onTab={setTab} progress={progress} totalItems={ESSAYS_TOTAL_ITEMS} accent={MC} icon="🪶" title="Essays" subtitle="Drafting Season" tabs={TABS} onTour={() => setShowTour(true)} />}
      tour={showTour && (
        <EssaysModuleTour
          onStart={() => { if (user) markIntroSeen(TOUR_INTRO_KEY).then(refreshProfile).catch(() => {}) }}
          onDismiss={() => setShowTour(false)}
          onSwitchTab={setTab}
        />
      )}
    >
      {content}
    </ModuleShell>
  )
}
