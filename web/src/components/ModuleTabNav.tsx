/**
 * ModuleTabNav — the left sidebar shared by module shells.
 *
 * Renders the module identity (title / subtitle), the tab list, a progress
 * meter, and an optional "guided tour" button. Modules supply their own
 * accent, tabs, and total item count. Financial Aid uses it too, inside its
 * own shell.
 */

import type { CSSProperties, ReactNode } from 'react'
import { C } from '../lib/designTokens'
import { Bar, SecLabel } from './moduleUI'
import { MODULE_ICONS } from './moduleIcons'
import type { ChecklistProgressMap } from '../lib/moduleProgress'

export interface ModuleTab<TabId extends string> {
  id: TabId
  label: string
  icon: ReactNode
}

interface Props<TabId extends string> {
  active: TabId
  onTab: (id: TabId) => void
  progress: ChecklistProgressMap
  totalItems: number
  accent: string
  title: string
  subtitle: string
  tabs: ModuleTab<TabId>[]
  onTour?: () => void
}

export default function ModuleTabNav<TabId extends string>({
  active,
  onTab,
  progress,
  totalItems,
  accent,
  title,
  subtitle,
  tabs,
  onTour,
}: Props<TabId>) {
  const completed = Object.values(progress).filter((v) => v === 'completed').length
  const pct = totalItems > 0 ? completed / totalItems : 0
  return (
    // The accent, tinted, for the phone's pill tabs (index.css), which a
    // stylesheet can't read from the inline styles.
    <nav className="msh-nav" data-tour="sidebar" style={{ width: 188, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', padding: '20px 0', '--msh-accent': accent, '--msh-accent-tint': `${accent}12`, '--msh-accent-line': `${accent}50` } as CSSProperties}>
      <div className="msh-nav-id" style={{ padding: '0 14px 18px', borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ fontFamily: "'Young Serif',serif", fontSize: 15, color: C.text, lineHeight: 1.3 }}>{title}</div>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: accent, fontWeight: 600, marginTop: 3 }}>{subtitle}</div>
      </div>

      <div className="msh-nav-tabs" style={{ padding: '0 8px' }}>
        <SecLabel className="msh-nav-seclabel" style={{ padding: '0 6px', marginBottom: 8 }}>Module Sections</SecLabel>
        {tabs.map((tab) => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              data-tour={`tab-${tab.id}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', marginBottom: 2,
                border: 'none', borderRadius: 7, borderLeft: `2px solid ${isActive ? accent : 'transparent'}`,
                background: isActive ? C.bg : 'transparent',
                color: isActive ? C.text : C.textMuted,
                fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: isActive ? 600 : 400,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s ease',
              }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = C.surfaceHover }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <span className="msh-nav-tab-icon" style={{ opacity: isActive ? 1 : 0.5, display: 'flex', flexShrink: 0 }}>{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="msh-nav-progress" style={{ margin: '16px 8px 0', padding: '12px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <SecLabel style={{ margin: 0 }}>Progress</SecLabel>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, color: accent }}>{Math.round(pct * 100)}%</span>
        </div>
        <Bar value={pct} color={accent} height={5} />
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, color: C.textFaint, marginTop: 5 }}>{completed} of {totalItems} items done</div>
      </div>

      {onTour && (
        <button
          className="msh-nav-tour"
          aria-label="Guided tour"
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
          <span style={{ display: 'flex' }}>{MODULE_ICONS.bulb}</span> <span className="msh-nav-tour-label">Guided tour</span>
        </button>
      )}
    </nav>
  )
}
