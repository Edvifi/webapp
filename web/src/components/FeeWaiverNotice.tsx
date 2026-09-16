/**
 * FeeWaiverNotice — tells a student that application fees may not apply to
 * them, or asks for the one fact needed to find out.
 *
 * Shown on two surfaces (dashboard and the Applications module) from one
 * component so the copy can't drift between them. Dismissal is shared too:
 * both callers write the same `intros_seen` key, so clearing it in one place
 * clears it in the other.
 *
 * Renders nothing for students above the waiver line — the whole point is to
 * stay quiet for people it doesn't apply to.
 */

import { motion } from 'framer-motion'
import { C, MODULE_COLORS, EASE_OUT } from '../lib/designTokens'
import type { FeeWaiverEligibility } from '../lib/feeWaivers'

const MC = MODULE_COLORS.applications

interface Props {
  eligibility: FeeWaiverEligibility
  /** `dashboard` sits above the module grid; `module` sits above tab content. */
  variant: 'dashboard' | 'module'
  /** "How to claim them" when likely; "Add your income" when unknown. */
  onPrimary: () => void
  onDismiss: () => void
}

const COPY = {
  likely: {
    title: 'You likely qualify for application fee waivers',
    body:
      'Application fees run about $50–$90 per school, and waivers cover them in full. '
      + 'Common App, NACAC, and SAT/ACT waivers are all income-based, and your '
      + 'counselor can confirm eligibility and submit them for you.',
    cta: 'How to claim them',
  },
  unknown: {
    title: 'Could application fees be waived for you?',
    body:
      'Add your household income and we can tell you whether you qualify. Waivers '
      + 'cover the full fee at every school you apply to, and students often assume '
      + "they don't qualify when they do.",
    cta: 'Add your income',
  },
} as const

export default function FeeWaiverNotice({ eligibility, variant, onPrimary, onDismiss }: Props) {
  // Students above the line never see this.
  if (eligibility === 'unlikely') return null
  const copy = COPY[eligibility]

  return (
    <motion.section
      aria-labelledby="fee-waiver-notice-title"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      style={{
        position: 'relative',
        display: 'flex',
        gap: 12,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${MC}`,
        borderRadius: 14,
        padding: '14px 16px',
        boxShadow: C.shadow1,
        marginBottom: variant === 'dashboard' ? 20 : 16,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 18, lineHeight: '22px' }}>
        {eligibility === 'likely' ? '🎟️' : '💬'}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h2
          id="fee-waiver-notice-title"
          style={{
            margin: 0,
            fontFamily: "'Outfit',sans-serif",
            fontSize: 14,
            fontWeight: 600,
            color: C.text,
            // Leave room for the dismiss button in the corner.
            paddingRight: 24,
          }}
        >
          {copy.title}
        </h2>
        <p
          style={{
            margin: '5px 0 0',
            fontFamily: "'Outfit',sans-serif",
            fontSize: 13,
            lineHeight: 1.5,
            color: C.textMuted,
          }}
        >
          {copy.body}
        </p>
        <button
          type="button"
          onClick={onPrimary}
          style={{
            marginTop: 10,
            padding: '7px 13px',
            background: MC,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontFamily: "'Outfit',sans-serif",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {copy.cta}
        </button>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss fee waiver notice"
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 22,
          height: 22,
          display: 'grid',
          placeItems: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: 6,
          color: C.textFaint,
          fontSize: 15,
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        ×
      </button>
    </motion.section>
  )
}
