/**
 * ModuleOverviewTab — the checklist Overview shared by module shells.
 *
 * Renders a title/subtitle, an overall progress bar, and collapsible sections
 * of checklist items (each a status Ring + type icon + label). Clicking an
 * item opens its ChecklistContentView reader. Modules supply their own
 * checklist data, content map, accent, and copy.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { C, EASE_OUT } from '../lib/designTokens'
import { Bar, Ring } from './moduleUI'
import ChecklistContentView from './ChecklistContentView'
import type { ChecklistItemStatus, ChecklistProgressMap } from '../lib/moduleProgress'
import type { ChecklistContent } from '../data/checklistContent'

// Generic over the module's item-type union (e.g. 'article' | 'task' |
// 'resource') so `itemTypeIcon` must cover every type the checklist uses — a
// missing/typo'd icon key is a compile error rather than a silent blank glyph.
interface OverviewChecklistItem<T extends string> { id: string; label: string; type: T }
interface OverviewChecklistSection<T extends string> { title: string; items: OverviewChecklistItem<T>[] }

interface Props<T extends string> {
  progress: ChecklistProgressMap
  onToggle: (itemId: string) => void
  onMarkComplete: (itemId: string) => void
  checklist: OverviewChecklistSection<T>[]
  contentMap: Record<string, ChecklistContent>
  allIds: string[]
  totalItems: number
  accent: string
  title: string
  subtitle: string
  itemTypeIcon: Record<T, string>
}

export default function ModuleOverviewTab<T extends string>({
  progress,
  onToggle,
  onMarkComplete,
  checklist,
  contentMap,
  allIds,
  totalItems,
  accent,
  title,
  subtitle,
  itemTypeIcon,
}: Props<T>) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(checklist.map((_, i) => [i, true])))
  const [activeContentId, setActiveContentId] = useState<string | null>(null)
  const statusOf = (id: string): ChecklistItemStatus => progress[id] ?? 'available'
  const done = checklist.reduce(
    (a, s) => a + s.items.filter((x) => statusOf(x.id) === 'completed').length,
    0,
  )

  if (activeContentId) {
    return (
      <ChecklistContentView
        itemId={activeContentId}
        status={statusOf(activeContentId)}
        contentMap={contentMap}
        allIds={allIds}
        accentColor={accent}
        onBack={() => setActiveContentId(null)}
        onMarkComplete={onMarkComplete}
        onNavigate={setActiveContentId}
      />
    )
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 760 }}>
      <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 24, color: C.text, margin: 0, marginBottom: 6 }}>{title}</h2>
      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, margin: 0, marginBottom: 20, lineHeight: 1.6 }}>
        {subtitle}
      </p>

      <div data-tour="overview-progress" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 18 }}>
        <div style={{ flex: 1 }}><Bar value={done / totalItems} color={accent} height={6} /></div>
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, color: accent, whiteSpace: 'nowrap' }}>{done}/{totalItems} completed</span>
      </div>

      {checklist.map((section, sIdx) => {
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
                          <Ring status={status} color={accent} />
                        </button>
                        <button
                          onClick={() => setActiveContentId(item.id)}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = accent }}
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
