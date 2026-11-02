import { useEffect, useState, type ReactNode } from 'react'
import { C, MODULE_COLORS } from '../lib/designTokens'
import { fetchAllGuarantees, type AidGuarantee, type GuaranteeList } from '../lib/aidColleges'
import { formatCollegeDate, parseIsoDay } from '../data/applicationDeadlines'
import { US_STATES } from '../lib/fafsaData'
import { EdvifiCan, ExtLink, GuideIntro as Intro, GuideItem as Item, GuideRow, SecLabel } from './moduleUI'
import {
  AID_FACTS_AS_OF,
  guaranteeLabel,
  MAJOR_PROGRAMS,
  SCHOLARSHIP_CATEGORIES,
  STATE_GRANTS,
  type AidProgram,
  type StateGrant,
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

export type AidGuideDestination = 'fafsa' | 'scholarships' | 'scholarship-search'

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

export type GuideRowId = 'big' | 'uni' | 'state' | 'types'

interface Props {
  /** The student's two-letter state, when their ZIP tells us. Their grant
   *  shows on its own, the other states' behind "Other states". */
  homeState: string | null
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
  const homeName = US_STATES.find((s) => s.code === homeState)?.name ?? null
  const otherGrants = STATE_GRANTS.filter((g) => g !== homeGrant)
  const grantItem = (g: StateGrant) => <ProgramItem key={g.id} p={{ ...g, name: `${g.stateName}: ${g.name}` }} color={ROWS.state.color} />
  const n = yourSchools.length
  const checked = all && all !== 'failed' && all.checkedOn ? parseIsoDay(all.checkedOn) : null

  return (
    <div>
      <SecLabel>Know your aid</SecLabel>

      <GuideRow {...ROWS.big} title="The big programs" summary="Pell Grant, QuestBridge, ROTC and the GI Bill" open={open === 'big'} onToggle={() => toggle('big')}>
        {MAJOR_PROGRAMS.map((p) => <ProgramItem key={p.id} p={p} color={ROWS.big.color} />)}
        <EdvifiCan color={ROWS.big.color} can="walk you through the FAFSA, which is how you get considered for Pell." cta="Start FAFSA prep" onClick={() => onGoTo('fafsa')} />
      </GuideRow>

      <GuideRow
        {...ROWS.uni}
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
      </GuideRow>

      <GuideRow
        {...ROWS.state}
        title="State grants"
        summary={homeGrant ? `${homeGrant.name} for ${homeGrant.stateName} residents`
          : homeName ? `Where to find ${homeName}’s aid`
          : otherGrants.map((g) => g.stateName).join(', ')}
        open={open === 'state'}
        onToggle={() => toggle('state')}
      >
        <Intro>
          Most states have aid for residents who stay in state.{' '}
          {homeGrant ? null
            : homeName ? `We haven’t written up ${homeName}’s yet: search “${homeName} higher education grant” or ask your school counselor.`
            : 'If yours isn’t here, search “[your state] higher education grant”.'}
        </Intro>
        {homeGrant && grantItem(homeGrant)}
        {/* Folded away once we know the student's state: listed open, five
            other states' programs read to a Michigan student as theirs. */}
        {homeName ? (
          <details style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
            <summary style={{ cursor: 'pointer', fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: ROWS.state.color }}>Other states</summary>
            {otherGrants.map(grantItem)}
          </details>
        ) : otherGrants.map(grantItem)}
        <EdvifiCan color={ROWS.state.color} can="line up the FAFSA priority date for every school on your list." cta="See my schools’ dates" onClick={() => onGoTo('scholarships')} />
      </GuideRow>

      <GuideRow {...ROWS.types} title="Five kinds of scholarships" summary="Merit, need, institutional, national and specialized" open={open === 'types'} onToggle={() => toggle('types')}>
        {SCHOLARSHIP_CATEGORIES.map((c) => <Item key={c.id} title={c.name} chip color={CATEGORY_COLOR[c.id] ?? ROWS.types.color}>{c.description} {c.example}.</Item>)}
        <EdvifiCan color={ROWS.types.color} can="match you with scholarships that fit your profile." cta="Find my matches" onClick={() => onGoTo('scholarship-search')} />
      </GuideRow>

      <p style={{ fontFamily: SANS, fontSize: 11, color: C.textMuted, margin: '2px 0 0' }}>
        Amounts are for {AID_FACTS_AS_OF} and change every year. Confirm on the official site.
      </p>
    </div>
  )
}
