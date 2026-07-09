/**
 * ChecklistContentView — full-page article reader for module checklist items.
 * Used by FinancialAidModule (and other content-driven modules).
 *
 * Renders a single ChecklistContent's body via ContentBlockRenderer, with
 * back/next/prev navigation and a "Mark complete" CTA. Stateless — the
 * parent owns `status` and the toggle action.
 */

import { C } from '../lib/designTokens'
import type { ChecklistContent } from '../data/checklistContent'
import { ContentBlockRenderer } from './contentBlocks'
import { TYPE_BADGE_META } from './contentBlocks.constants'

const SUCCESS_GREEN = '#2D9E72'

interface Props {
  itemId: string
  status: 'available' | 'in-progress' | 'completed'
  contentMap: Record<string, ChecklistContent>
  allIds: string[]
  accentColor: string
  onBack: () => void
  onMarkComplete: (itemId: string) => void
  onNavigate: (itemId: string) => void
}

const Tag = ({ label, color, bg }: { label: string; color: string; bg?: string }) => (
  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 600, color, background: bg || `${color}15`, padding: '2px 8px', borderRadius: 99, border: `1px solid ${color}28`, whiteSpace: 'nowrap' }}>{label}</span>
)

const Check = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7l3 3 5-5" />
  </svg>
)

const Chevron = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4l4 4-4 4" />
  </svg>
)

export default function ChecklistContentView({
  itemId,
  status,
  contentMap,
  allIds,
  accentColor,
  onBack,
  onMarkComplete,
  onNavigate,
}: Props) {
  const content = contentMap[itemId]
  const currentIndex = allIds.indexOf(itemId)
  const prevId = currentIndex > 0 ? allIds[currentIndex - 1] : null
  const nextId = currentIndex >= 0 && currentIndex < allIds.length - 1 ? allIds[currentIndex + 1] : null
  const prevContent = prevId ? contentMap[prevId] : null
  const nextContent = nextId ? contentMap[nextId] : null

  if (!content) {
    return (
      <div style={{ padding: '28px 30px' }}>
        <button onClick={onBack} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 500, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 5 }}>
          ← Back to Overview
        </button>
        <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: C.textMuted }}>Content not found for this item.</p>
      </div>
    )
  }

  const badge = TYPE_BADGE_META[content.type] ?? TYPE_BADGE_META.article
  const isCompleted = status === 'completed'

  return (
    <div style={{ padding: '24px 30px 32px' }}>
      <button onClick={onBack} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 500, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 5 }}>
        ← Back to Overview
      </button>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Tag label={badge.label} color={badge.color} bg={badge.bg} />
          {isCompleted && <Tag label="Completed" color={SUCCESS_GREEN} bg="#EBF5F0" />}
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: C.textFaint, marginLeft: 'auto' }}>{currentIndex + 1} of {allIds.length}</span>
        </div>
        <h1 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, fontWeight: 400, color: C.text, margin: '0 0 6px', lineHeight: 1.25 }}>
          {content.title}
        </h1>
      </div>

      <div style={{ maxWidth: 600 }}>
        {content.body.map((block, i) => (
          <ContentBlockRenderer key={i} block={block} accentColor={accentColor} />
        ))}
      </div>

      <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button
          onClick={() => onMarkComplete(itemId)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 22px', borderRadius: 10,
            background: isCompleted ? C.surface : accentColor,
            color: isCompleted ? accentColor : '#fff',
            border: isCompleted ? `1.5px solid ${accentColor}40` : 'none',
            fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s ease', alignSelf: 'flex-start',
          }}
        >
          <span style={{ display: 'flex' }}><Check /></span>
          {isCompleted ? 'Completed — click to undo' : 'Mark as Complete'}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {prevId ? (
            <button
              onClick={() => onNavigate(prevId)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, color: C.textMuted, maxWidth: '45%', textAlign: 'left' }}
            >
              <span style={{ display: 'flex', transform: 'rotate(180deg)', flexShrink: 0 }}><Chevron /></span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prevContent?.title}</span>
            </button>
          ) : <span />}
          {nextId ? (
            <button
              onClick={() => onNavigate(nextId)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid ${accentColor}40`, background: `${accentColor}08`, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: accentColor, maxWidth: '45%', textAlign: 'right' }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextContent?.title}</span>
              <span style={{ display: 'flex', flexShrink: 0 }}><Chevron /></span>
            </button>
          ) : <span />}
        </div>
      </div>
    </div>
  )
}
