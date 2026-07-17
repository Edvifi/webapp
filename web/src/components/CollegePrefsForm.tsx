/**
 * College Match onboarding intake. Prop-driven & presentational: it edits a
 * local draft of CollegePrefs and calls onSave when the student is done.
 * Mounted by the Application Tracking "Discover" tab (M4), which owns persistence.
 */
import { useState, type CSSProperties } from 'react'
import { C } from '../lib/designTokens'
import { US_STATES } from '../lib/fafsaData'
import { INTENDED_FIELD_OPTIONS, type CollegePrefs } from '../lib/collegeMatch'

const ACCENT = '#7048C8'

const SETTINGS: Array<{ key: 'city' | 'suburb' | 'town' | 'rural'; label: string }> = [
  { key: 'city', label: 'City' },
  { key: 'suburb', label: 'Suburb' },
  { key: 'town', label: 'Town' },
  { key: 'rural', label: 'Rural' },
]

const CARET =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%238a7a68' stroke-width='1.5'/%3E%3C/svg%3E\")"

/* ─── small building blocks ─── */

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13.5, fontWeight: 600, color: C.text, marginBottom: hint ? 1 : 8 }}>{title}</div>
    {hint && <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{hint}</div>}
    {children}
  </div>
)

const chipStyle = (active: boolean): CSSProperties => ({
  padding: '6px 12px', borderRadius: 999, cursor: 'pointer', userSelect: 'none',
  fontFamily: "'Outfit',sans-serif", fontSize: 12.5, fontWeight: 500,
  border: `1px solid ${active ? ACCENT : C.border}`,
  background: active ? ACCENT : C.white, color: active ? C.white : C.text,
  transition: 'all 120ms ease',
})
const Chip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button type="button" onClick={onClick} style={chipStyle(active)}>{label}</button>
)
const ChipRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{children}</div>
)

function Segmented<T extends string>({ options, value, onChange }: { options: Array<{ key: T; label: string }>; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'inline-flex', background: C.surfaceHover, borderRadius: 9, padding: 3, gap: 2, flexWrap: 'wrap' }}>
      {options.map((o) => {
        const active = o.key === value
        return (
          <button key={o.key} type="button" onClick={() => onChange(o.key)}
            style={{ padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontFamily: "'Outfit',sans-serif", fontSize: 12.5, fontWeight: active ? 600 : 500,
              background: active ? C.white : 'transparent', color: active ? ACCENT : C.textMuted,
              boxShadow: active ? C.shadow1 : 'none' }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

const Toggle = ({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) => (
  <button type="button" onClick={() => onChange(!on)}
    style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', cursor: 'pointer',
      background: 'transparent', border: 'none', padding: '5px 0' }}>
    <span style={{ width: 38, height: 22, borderRadius: 999, background: on ? ACCENT : C.borderStrong, position: 'relative', flexShrink: 0, transition: 'background 140ms ease' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: 999, background: C.white, transition: 'left 140ms ease', boxShadow: C.shadow1 }} />
    </span>
    <span>
      <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 500, color: C.text }}>{label}</span>
      {hint && <span style={{ display: 'block', fontFamily: "'Outfit',sans-serif", fontSize: 11.5, color: C.textMuted }}>{hint}</span>}
    </span>
  </button>
)

// While typing, clamp only the MAX (so "1500" doesn't flash through 400 on each digit).
const parseMax = (s: string, hi: number): number | null => {
  const n = parseInt(s.replace(/[^\d]/g, ''), 10)
  return isNaN(n) ? null : Math.min(hi, n)
}
// On blur, apply the floor (an empty/zero field clears; a too-low score snaps up).
const clampFloor = (n: number | null, lo: number, hi: number): number | null =>
  n == null || n === 0 ? null : Math.max(lo, Math.min(hi, n))

/* ─── the form ─── */

export default function CollegePrefsForm({
  value,
  onSave,
  submitLabel = 'Find my matches',
}: {
  value: CollegePrefs
  onSave: (next: CollegePrefs) => void
  submitLabel?: string
}) {
  const [d, setD] = useState<CollegePrefs>(value)
  const set = <K extends keyof CollegePrefs>(k: K, v: CollegePrefs[K]) => setD((prev) => ({ ...prev, [k]: v }))
  const toggleIn = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const input: CSSProperties = {
    fontFamily: "'Outfit',sans-serif", fontSize: 13.5, color: C.text, background: C.white,
    border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 11px', outline: 'none',
  }
  const selectStyle: CSSProperties = {
    ...input, minWidth: 190, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
    backgroundImage: CARET, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 11px center', paddingRight: 30,
  }
  const scoreLabel: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textMuted }

  return (
    <div style={{ maxWidth: 660 }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontFamily: "'Young Serif',serif", fontSize: 21, color: C.text, margin: 0 }}>Find your best-fit schools</h2>
        <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: C.textMuted, margin: '5px 0 0', lineHeight: 1.5 }}>
          A few quick questions so we can score every school for how well it fits <em>you</em>. All optional — the more you share, the sharper the matches.
        </p>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 22px', boxShadow: C.shadow1 }}>
        <Section title="Where's home?" hint="Powers distance and 'close to home' matching.">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={d.homeState ?? ''} onChange={(e) => set('homeState', e.target.value || null)} style={selectStyle}>
              <option value="">Select your state…</option>
              {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            <Segmented
              options={[{ key: 'in_state', label: 'In my state' }, { key: 'in_region', label: 'My region' }, { key: 'anywhere', label: 'Anywhere' }]}
              value={d.prefMaxDistance}
              onChange={(v) => set('prefMaxDistance', v)}
            />
          </div>
        </Section>

        <Section title="What do you want to study?" hint="Pick any that interest you — we'll favor schools strong in those fields.">
          <ChipRow>
            {INTENDED_FIELD_OPTIONS.map((f) => (
              <Chip key={f.key} label={f.label} active={d.intendedFields.includes(f.key)} onClick={() => set('intendedFields', toggleIn(d.intendedFields, f.key))} />
            ))}
          </ChipRow>
        </Section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
          <Section title="Test scores" hint="Optional — leave blank if test-optional.">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <label style={scoreLabel}>
                SAT (400–1600)
                <input inputMode="numeric" value={d.satTotal ?? ''} placeholder="—" style={{ ...input, width: 108 }}
                  onChange={(e) => set('satTotal', parseMax(e.target.value, 1600))}
                  onBlur={() => setD((p) => ({ ...p, satTotal: clampFloor(p.satTotal, 400, 1600) }))} />
              </label>
              <label style={scoreLabel}>
                ACT (1–36)
                <input inputMode="numeric" value={d.act ?? ''} placeholder="—" style={{ ...input, width: 92 }}
                  onChange={(e) => set('act', parseMax(e.target.value, 36))}
                  onBlur={() => setD((p) => ({ ...p, act: clampFloor(p.act, 1, 36) }))} />
              </label>
            </div>
          </Section>

          <Section title="School type">
            <Segmented
              options={[{ key: 'public', label: 'Public' }, { key: 'private', label: 'Private' }, { key: 'either', label: 'Either' }]}
              value={d.prefOwnership}
              onChange={(v) => set('prefOwnership', v)}
            />
          </Section>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
          <Section title="Campus size">
            <Segmented
              options={[{ key: 'small', label: 'Small' }, { key: 'medium', label: 'Medium' }, { key: 'large', label: 'Large' }, { key: 'any', label: 'Any' }]}
              value={d.prefSize ?? 'any'}
              onChange={(v) => set('prefSize', v === 'any' ? null : v)}
            />
          </Section>

          <Section title="Setting" hint="Any that appeal to you.">
            <ChipRow>
              {SETTINGS.map((s) => (
                <Chip key={s.key} label={s.label} active={d.prefSettings.includes(s.key)} onClick={() => set('prefSettings', toggleIn(d.prefSettings, s.key))} />
              ))}
            </ChipRow>
          </Section>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 4, paddingTop: 14 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13.5, fontWeight: 600, color: C.text, marginBottom: 6 }}>Pathways to include</div>
          <Toggle label="Community college → transfer paths" hint="A lower-cost route to a 4-year degree — we'll suggest 2+2 pairings." on={d.openToTransfer} onChange={(v) => set('openToTransfer', v)} />
          <Toggle label="Trade & career/technical programs" hint="Certificate and associate programs with strong job outcomes." on={d.openToTrade} onChange={(v) => set('openToTrade', v)} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSave({ ...d, completed: true })}
        style={{ marginTop: 16, padding: '11px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: ACCENT, color: C.white, fontFamily: "'Outfit',sans-serif", fontSize: 14.5, fontWeight: 600, boxShadow: C.shadow2 }}
      >
        {submitLabel}
      </button>
    </div>
  )
}
