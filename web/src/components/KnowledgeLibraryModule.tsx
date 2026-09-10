/**
 * KnowledgeLibraryModule — the "start here" module.
 *
 * A static intro to Edvifi: what we help students with and how, with pointers
 * into the concrete tools (Financial Aid, College Essays, Application
 * Tracking). Content-only — no persistence or checklist state.
 */

import { C, MODULE_COLORS, mono, fillOf } from '../lib/designTokens'
import ModuleShell from './ModuleShell'

const MC = MODULE_COLORS.knowledgeLibrary

interface Props {
  open: boolean
  onClose: () => void
  /** Open another module by its dashboard key. */
  onOpenModule?: (key: string) => void
}

interface Capability {
  emoji: string
  title: string
  blurb: string
  /** Dashboard key of the tool this maps to, if any. */
  module?: string
  cta?: string
}

const CAPABILITIES: Capability[] = [
  {
    emoji: '💰',
    title: 'Financial aid & scholarships',
    blurb:
      'Understand every kind of aid, find scholarships you actually qualify for, and track them in one place. We also surface colleges whose aid could fit your goals.',
    module: 'Financial Aid',
    cta: 'Open Financial Aid',
  },
  {
    emoji: '🎓',
    title: 'Affordable college paths',
    blurb:
      'Great degrees do not have to mean crushing debt. Explore lower-cost routes — starting at community college and transferring, in-state public schools, and generous-aid colleges — and compare real costs.',
    module: 'Financial Aid',
    cta: 'Explore affordable options',
  },
  {
    emoji: '🪶',
    title: 'Essay & application feedback',
    blurb:
      'Draft your essays in a focused workspace and get structured feedback on essays and applications so every piece is stronger before you submit.',
    module: 'College Essays',
    cta: 'Open College Essays',
  },
  {
    emoji: '📋',
    title: 'Application tracking & review',
    blurb:
      'Keep every school, deadline, and requirement in one tracker so nothing slips — then review each application before it goes out.',
    module: 'Application Tracking',
    cta: 'Open Application Tracking',
  },
]

export default function KnowledgeLibraryModule({ open, onClose, onOpenModule }: Props) {
  return (
    <ModuleShell open={open} onClose={onClose} breadcrumbLabel="Knowledge Library">
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 28px 64px' }}>
          {/* Hero */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <span className="emoji" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 14, background: fillOf(MC), color: 'var(--on-accent)', fontSize: 26 }}>{mono('📚')}</span>
            <div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, color: MC, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Start Here</div>
              <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 30, fontWeight: 600, color: C.text, margin: 0, lineHeight: 1.1 }}>Knowledge Library</h1>
            </div>
          </div>

          <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, lineHeight: 1.6, color: C.text, marginBottom: 10 }}>
            Getting into college — and paying for it — is confusing. Edvifi is your guide through it: we break down what actually matters, then give you focused tools to do the work.
          </p>
          <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, lineHeight: 1.6, color: C.textMuted, marginBottom: 32 }}>
            Here is what we can help you with, and where to do it.
          </p>

          {/* Capabilities */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {CAPABILITIES.map((cap) => {
              const canOpen = Boolean(cap.module && onOpenModule)
              return (
                <div
                  key={cap.title}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px', boxShadow: C.shadow1 }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1.2 }}>{mono(cap.emoji)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>{cap.title}</h3>
                      <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, lineHeight: 1.55, color: C.textMuted, margin: 0 }}>{cap.blurb}</p>
                      {canOpen && (
                        <button
                          onClick={() => cap.module && onOpenModule?.(cap.module)}
                          style={{ marginTop: 14, fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: '#fff', background: MC, border: 'none', borderRadius: 9, padding: '9px 16px', cursor: 'pointer' }}
                        >
                          {cap.cta ?? 'Open'} →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
    </ModuleShell>
  )
}
