import { useEffect, useState, type ReactNode } from 'react'
import { C, MODULE_COLORS } from '../lib/designTokens'
import { fetchAllGuarantees, type AidGuarantee, type GuaranteeList } from '../lib/aidColleges'
import { formatCollegeDate, parseIsoDay } from '../data/applicationDeadlines'
import { SecLabel } from './moduleUI'
import {
  AID_FACTS_AS_OF,
  guaranteeLabel,
  MAJOR_PROGRAMS,
  SCHOLARSHIP_CATEGORIES,
  STATE_GRANTS,
  type AidProgram,
  type GrantState,
} from '../data/aidPrograms'

const MC = MODULE_COLORS.financialAid

/**
 * One color per source of money, carried through a row's icon, edge, figures
 * and links: federal and national programs blue, the school itself amber (the
 * row not to skip), the state green, scholarships purple.
 */
// Line icons in the module's own stroke style, drawn in the row's color.
const svg = (children: ReactNode) => (
  <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)
const ICONS = {
  // Columned building: federal and national programs.
  big: svg(<><path d="M2 6l6-3.5L14 6"/><line x1="2.5" y1="13.5" x2="13.5" y2="13.5"/><line x1="4" y1="7" x2="4" y2="12"/><line x1="8" y1="7" x2="8" y2="12"/><line x1="12" y1="7" x2="12" y2="12"/></>),
  // Mortarboard: the school's own aid.
  uni: svg(<><path d="M1.5 6L8 3l6.5 3L8 9z"/><path d="M4 7.3v3.2c0 .9 1.8 2 4 2s4-1.1 4-2V7.3"/><line x1="14.5" y1="6" x2="14.5" y2="10"/></>),
  // Map pin: the student's state.
  state: svg(<><path d="M8 14.5s-4.5-4.2-4.5-7.5a4.5 4.5 0 019 0c0 3.3-4.5 7.5-4.5 7.5z"/><circle cx="8" cy="7" r="1.6"/></>),
  // Rosette: scholarships.
  types: svg(<><circle cx="8" cy="6" r="3.8"/><path d="M5.6 9l-1.1 5.5L8 12.6l3.5 1.9L10.4 9"/></>),
}

const ROWS = {
  big: { color: '#1D7FC4', icon: ICONS.big },
  uni: { color: '#C47A12', icon: ICONS.uni },
  state: { color: MC, icon: ICONS.state },
  types: { color: '#7048C8', icon: ICONS.types },
} as const

/** Each kind of scholarship gets its own chip, so the five read apart at a glance. */
const CATEGORY_COLOR: Record<string, string> = {
  merit: '#7048C8',
  need: '#1D7FC4',
  institutional: '#C47A12',
  national: MC,
  specialized: '#3F5BA9',
}

const SANS = "'Outfit',sans-serif"

export type AidGuideDestination = 'fafsa' | 'deadlines' | 'aid-compare' | 'scholarship-search'

const Chevron = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 4l4 4-4 4"/></svg>
)

const ExtLink = ({ href, children, color = MC }: { href: string; children: ReactNode; color?: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color, textDecoration: 'none', whiteSpace: 'nowrap' }}>
    {children} ↗
  </a>
)

/** One entry inside an open row: name and figure on top, the explanation under it. */
const Item = ({ title, figure, children, links, color = MC, chip }: {
  title: string
  figure?: string
  children: ReactNode
  links?: ReactNode
  color?: string
  /** Render the title as a colored chip instead of bold text. */
  chip?: boolean
}) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: SANS, fontSize: 13, lineHeight: 1.4 }}>
        {chip
          ? <span style={{ display: 'inline-block', fontWeight: 700, fontSize: 12, color, background: `${color}15`, border: `1px solid ${color}30`, padding: '1px 9px', borderRadius: 99 }}>{title}</span>
          : <span style={{ fontWeight: 700, color: C.text }}>{title}</span>}
        {figure && <span style={{ fontWeight: 600, color }}> · {figure}</span>}
      </div>
      <div style={{ fontFamily: SANS, fontSize: 12, color: C.textMuted, lineHeight: 1.5, marginTop: 2 }}>{children}</div>
    </div>
    {links && <div style={{ display: 'flex', gap: 10, flexShrink: 0, paddingTop: 1 }}>{links}</div>}
  </div>
)

const ProgramItem = ({ p, color }: { p: AidProgram; color: string }) => (
  <Item
    title={p.name}
    figure={p.amount}
    color={color}
    links={p.links ? p.links.map((l) => <ExtLink key={l.url} href={l.url} color={color}>{l.label}</ExtLink>) : <ExtLink href={p.url} color={color}>Site</ExtLink>}
  >
    {p.summary}{p.note && <> {p.note}</>}
  </Item>
)

const GuaranteeItem = ({ g }: { g: AidGuarantee }) => (
  <Item title={g.school} figure={guaranteeLabel(g)} color={ROWS.uni.color} links={<ExtLink href={g.url} color={ROWS.uni.color}>Aid page</ExtLink>}>
    {g.detail} <strong style={{ color: C.text, fontWeight: 600 }}>To get it:</strong> {g.action}
  </Item>
)

/** "Edvifi can ___" — one line at the foot of a row, pointing at the tool that does it. */
const EdvifiCan = ({ can, cta, onClick, color = MC }: { can: string; cta: string; onClick: () => void; color?: string }) => (
  // A quiet tinted strip rather than a banner: it should read as the next step,
  // not as an ad, but still be the first thing the eye lands on at the bottom.
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 12, padding: '10px 12px', borderRadius: 9, background: `${color}10`, border: `1px solid ${color}2E`, fontFamily: SANS, fontSize: 13, color: C.text }}>
    <span style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.surface, border: `1px solid ${color}26` }}>
        <img src="/logos/logo-color.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
      </span>
      <span style={{ lineHeight: 1.45 }}><strong style={{ color: C.text, fontWeight: 700 }}>Edvifi</strong> can {can}</span>
    </span>
    <button onClick={onClick} style={{ flexShrink: 0, padding: '7px 13px', borderRadius: 8, border: 'none', background: color, color: '#fff', cursor: 'pointer', fontFamily: SANS, fontSize: 12, fontWeight: 600 }}>
      {cta} →
    </button>
  </div>
)

/** A collapsible row in the same shape as the checklist sections below it. */
const Row = ({ kind, title, summary, tag, open, onToggle, children }: {
  kind: keyof typeof ROWS
  title: string
  summary: string
  tag?: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) => {
  const { color, icon } = ROWS[kind]
  const [hover, setHover] = useState(false)
  const edge = open || hover ? `${color}45` : C.border
  return (
    // Longhands only. Mixing the `border` shorthand with `borderLeft` lets React
    // re-apply the shorthand on toggle and wipe the colored edge.
    <div style={{ marginBottom: 10, borderStyle: 'solid', borderWidth: '1px 1px 1px 3px', borderColor: `${edge} ${edge} ${edge} ${color}`, transition: 'border-color 0.15s ease', borderRadius: 10, overflow: 'hidden', background: C.surface }}>
      <button
        onClick={onToggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-expanded={open}
        style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '11px 14px', background: open || hover ? `${color}0D` : C.surface, transition: 'background 0.15s ease', border: 'none', borderBottom: open ? `1px solid ${color}25` : 'none', cursor: 'pointer', gap: 12, textAlign: 'left' }}
      >
        <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color, background: `${color}18` }}>{icon}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: SANS, fontSize: 13.5, fontWeight: 700, color: C.text }}>{title}</span>
          <span style={{ display: 'block', fontFamily: SANS, fontSize: 12, color: C.textMuted, marginTop: 1 }}>{summary}</span>
        </span>
        {tag && <span style={{ flexShrink: 0, fontFamily: SANS, fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '3px 9px', borderRadius: 99 }}>{tag}</span>}
        <span style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s ease', color: open || hover ? color : C.textMuted, display: 'flex', flexShrink: 0 }}><Chevron /></span>
      </button>
      {open && <div style={{ padding: '2px 16px 12px' }}>{children}</div>}
    </div>
  )
}

const Intro = ({ children }: { children: ReactNode }) => (
  <p style={{ fontFamily: SANS, fontSize: 12.5, color: C.text, lineHeight: 1.55, margin: '10px 0 4px' }}>{children}</p>
)

export type GuideRowId = 'big' | 'uni' | 'state' | 'types'

interface Props {
  /** The student's state, when their ZIP tells us. Puts their grant first. */
  homeState: GrantState | null
  /** Guarantees at schools the student has added, in their list order. */
  yourSchools: AidGuarantee[]
  /** The list lookup failed, so "none on your list" would be a guess. */
  listFailed: boolean
  /** Which row is open. Held by the caller so it survives opening an article and coming back. */
  open: GuideRowId | null
  onOpenChange: (row: GuideRowId | null) => void
  onGoTo: (dest: AidGuideDestination) => void
}

export default function AidGuideSections({ homeState, yourSchools, listFailed, open, onOpenChange, onGoTo }: Props) {
  // The full list is only needed once the row is opened.
  const [all, setAll] = useState<GuaranteeList | 'failed' | null>(null)
  const toggle = (id: GuideRowId) => {
    // Reopening after a failed load tries again.
    if (id === 'uni' && open !== 'uni' && all === 'failed') setAll(null)
    onOpenChange(open === id ? null : id)
  }
  useEffect(() => {
    if (open !== 'uni' || all !== null) return
    let cancelled = false
    fetchAllGuarantees()
      .then((list) => { if (!cancelled) setAll(list) })
      .catch(() => { if (!cancelled) setAll('failed') })
    return () => { cancelled = true }
  }, [open, all])

  const homeGrant = STATE_GRANTS.find((g) => g.state === homeState)
  const stateGrants = homeGrant ? [homeGrant, ...STATE_GRANTS.filter((g) => g !== homeGrant)] : STATE_GRANTS
  const n = yourSchools.length
  const checked = all && all !== 'failed' && all.checkedOn ? parseIsoDay(all.checkedOn) : null

  return (
    <div>
      <SecLabel>Know your aid</SecLabel>

      <Row kind="big" title="The big programs" summary="Pell Grant, QuestBridge, ROTC and the GI Bill" open={open === 'big'} onToggle={() => toggle('big')}>
        {MAJOR_PROGRAMS.map((p) => <ProgramItem key={p.id} p={p} color={ROWS.big.color} />)}
        <EdvifiCan color={ROWS.big.color} can="walk you through the FAFSA, which is how you get considered for Pell." cta="Start FAFSA prep" onClick={() => onGoTo('fafsa')} />
      </Row>

      <Row
        kind="uni"
        title="Your schools’ own aid applications"
        summary={listFailed
          ? 'Couldn’t check your schools just now. Your list is saved'
          : n > 0
            ? `${n} ${n === 1 ? 'school' : 'schools'} on your list ${n === 1 ? 'has an aid guarantee' : 'have aid guarantees'}. Check whether you qualify`
            : 'Many schools guarantee free tuition below a family income, if you file their forms'}
        tag="Don’t skip"
        open={open === 'uni'}
        onToggle={() => toggle('uni')}
      >
        <Intro>
          Guarantees only apply if you finish <strong>that school’s</strong> aid steps on time. That can mean the CSS Profile, the
          school’s own form, or the FAFSA by an early date. Check the aid page of every school on your list.
        </Intro>
        {yourSchools.map((g) => <GuaranteeItem key={g.school} g={g} />)}
        <details style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
          <summary style={{ cursor: 'pointer', fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: ROWS.uni.color }}>
            {n > 0 ? 'All' : 'See all'} {all && all !== 'failed' ? `${all.guarantees.length} ` : ''}schools with a guarantee
          </summary>
          {all === null && <Intro>Loading…</Intro>}
          {all === 'failed' && <Intro>Couldn’t load the full list just now.</Intro>}
          {all && all !== 'failed' && (
            <>
              {all.guarantees.map((g) => <GuaranteeItem key={g.school} g={g} />)}
              {checked && <p style={{ fontFamily: SANS, fontSize: 11, color: C.textMuted, margin: '6px 0 0' }}>Checked against each school’s site on {formatCollegeDate(checked)}.</p>}
            </>
          )}
        </details>
        <EdvifiCan color={ROWS.uni.color} can="put the estimated net price of every school on your list side by side." cta="Open Aid Compare" onClick={() => onGoTo('aid-compare')} />
      </Row>

      <Row
        kind="state"
        title="State grants"
        summary={homeGrant ? `${homeGrant.name} for ${homeGrant.stateName}, plus four other states` : 'California, New York, Texas, Florida and Georgia'}
        open={open === 'state'}
        onToggle={() => toggle('state')}
      >
        <Intro>Most states have aid for residents who stay in state. If yours isn’t here, search “[your state] higher education grant”.</Intro>
        {stateGrants.map((g) => <ProgramItem key={g.id} p={{ ...g, name: `${g.stateName}: ${g.name}` }} color={ROWS.state.color} />)}
        <EdvifiCan color={ROWS.state.color} can="line up the FAFSA priority date for every school on your list." cta="See my deadlines" onClick={() => onGoTo('deadlines')} />
      </Row>

      <Row kind="types" title="Five kinds of scholarships" summary="Merit, need, institutional, national and specialized" open={open === 'types'} onToggle={() => toggle('types')}>
        {SCHOLARSHIP_CATEGORIES.map((c) => <Item key={c.id} title={c.name} chip color={CATEGORY_COLOR[c.id] ?? ROWS.types.color}>{c.description} {c.example}.</Item>)}
        <EdvifiCan color={ROWS.types.color} can="match you with scholarships that fit your profile." cta="Find my matches" onClick={() => onGoTo('scholarship-search')} />
      </Row>

      <p style={{ fontFamily: SANS, fontSize: 11, color: C.textMuted, margin: '2px 0 0' }}>
        Amounts are for {AID_FACTS_AS_OF} and change every year. Confirm on the official site.
      </p>
    </div>
  )
}
