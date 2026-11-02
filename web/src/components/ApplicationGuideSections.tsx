/**
 * Application Tracking's Overview, under the list. Financial Aid's Overview
 * has the FAFSA and CSS Profile dates and its guide rows; this one has the
 * application rounds and what an application asks for. The articles stay in
 * Application 101: these rows sum up and point there.
 */
import { useState, type ReactNode } from 'react'
import { C } from '../lib/designTokens'
import { DateBox, EdvifiCan, ExtLink, GuideIntro, GuideItem, GuideRow, SecLabel } from './moduleUI'
import { DEADLINE_TYPES, type AppDeadlineType, type ApplicationEntry } from '../data/applicationsChecklist'
import {
  DEADLINE_TYPE_COLOR,
  DEADLINE_TYPE_LABEL,
  DEADLINE_TYPE_MEANING,
  deriveDeadlineEvents,
  seniorFallYear,
  type DeadlineCollege,
} from '../data/applicationDeadlines'

const SANS = "'Outfit',sans-serif"
const EARLY: ReadonlySet<AppDeadlineType> = new Set<AppDeadlineType>(['ED', 'EA', 'REA'])

const toSend = (apps: ApplicationEntry[]) => apps.filter((a) => a.status === 'not-started' || a.status === 'in-progress')
const schools = (k: number) => `${k} ${k === 1 ? 'school' : 'schools'}`

/** The early and regular rounds in the student's own cycle, and where their
 *  list sits in each. They don't open: the schools' dates are in Application Status. */
export function ApplicationRounds({ apps, colleges, gradeStartIdx, onSeeSchools }: {
  apps: ApplicationEntry[]
  colleges?: ReadonlyMap<string, DeadlineCollege>
  gradeStartIdx: number | null | undefined
  onSeeSchools: () => void
}) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const seniorFall = seniorFallYear(gradeStartIdx, now)
  // Sorted by date, so the first in a round is its soonest.
  const upcoming = deriveDeadlineEvents(apps, { gradeStartIdx, now, colleges })
    .filter((e) => e.category === 'application' && !e.done && e.date >= today)
  const pending = toSend(apps)
  const early = pending.filter((a) => EARLY.has(a.deadlineType))
  const regular = pending.filter((a) => a.deadlineType === 'RD')
  const rolling = pending.filter((a) => a.deadlineType === 'Rolling').length

  const withSoonest = (lead: string, round: ApplicationEntry[]) => {
    const ids = new Set(round.map((a) => a.collegeId))
    const e = upcoming.find((x) => x.collegeId != null && ids.has(x.collegeId))
    if (!e) return lead
    return round.length === 1 ? `${lead}: ${e.collegeName}, ${e.dateDisplay}` : `${lead}; ${e.collegeName} is first, ${e.dateDisplay}`
  }
  const listState = apps.length === 0 ? 'Add schools in Discover to see where yours fall'
    : pending.length === 0 ? 'Every application on your list is in'
    : null
  // Sent ones still count: "none set to apply early" is wrong once the ED one is in.
  const sent = (inRound: (t: AppDeadlineType) => boolean) => apps.filter((a) => inRound(a.deadlineType)).length
  const earlySent = sent((t) => EARLY.has(t))
  const earlySummary = listState ?? (early.length
    ? withSoonest(`Applying early to ${schools(early.length)}`, early)
    : earlySent ? `Your early ${earlySent === 1 ? 'application is' : 'applications are'} in`
    : 'None of your schools is set to apply early. Pick each one’s round on its page')
  const rollingNote = rolling ? `${rolling} more ${rolling === 1 ? 'is' : 'are'} rolling` : ''
  const regularSummary = listState ?? (regular.length
    ? withSoonest(`${schools(regular.length)} in Regular Decision`, regular) + (rollingNote && `; ${rollingNote}`)
    : rolling ? `${schools(rolling)} with rolling admission, so no fixed date. Earlier is better`
    : sent((t) => t === 'RD') ? 'Your Regular Decision applications are in'
    : 'None of your schools is set to Regular Decision')

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, alignItems: 'start' }}>
        <DateBox color={DEADLINE_TYPE_COLOR.ED} title="Early Decision & Early Action" dates={`Due Nov 1–15, ${seniorFall} · Decisions Dec–Feb`} summary={earlySummary} onClick={onSeeSchools} />
        <DateBox color={DEADLINE_TYPE_COLOR.RD} title="Regular Decision" dates={`Due Jan 1–Feb 1, ${seniorFall + 1} · Decisions Mar–Apr`} summary={regularSummary} onClick={onSeeSchools} />
      </div>
      <p style={{ fontFamily: SANS, fontSize: 12, color: C.textMuted, lineHeight: 1.5, margin: '8px 0 0' }}>
        The Common App opens Aug 1, {seniorFall}, and most schools want your answer by May 1, {seniorFall + 1}. These are the usual dates; each school’s own is on its page in Application Status.
      </p>
    </div>
  )
}

// Line icons in the module's own stroke style, drawn in the row's color.
const svg = (children: ReactNode) => (
  <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)
const ROWS = {
  // Laptop: where you apply.
  apply: { color: '#1D7FC4', icon: svg(<><rect x="2.5" y="3" width="11" height="8" rx="1" /><path d="M1 13.5h14" /></>) },
  // Page: what goes in.
  parts: { color: '#7048C8', icon: svg(<><path d="M4 1.8h5.5L12.5 5v9.2H4z" /><path d="M9.5 1.8V5h3" /><line x1="6" y1="8" x2="10.5" y2="8" /><line x1="6" y1="10.5" x2="10.5" y2="10.5" /></>) },
  // Calendar: rounds.
  rounds: { color: '#C47A12', icon: svg(<><rect x="2" y="3" width="12" height="11" rx="1.5" /><line x1="2" y1="6.5" x2="14" y2="6.5" /><line x1="5.5" y1="1.5" x2="5.5" y2="4.5" /><line x1="10.5" y1="1.5" x2="10.5" y2="4.5" /></>) },
  // Price tag: fees.
  fees: { color: '#2D9E72', icon: svg(<><path d="M8.5 1.8H14v5.5l-6.7 6.7-5.5-5.5z" /><circle cx="11" cy="4.8" r="1" /></>) },
} as const
type RowId = keyof typeof ROWS

/** "Know your application": four rows, each pointing at the article or tab that goes further. */
export default function ApplicationGuideSections({ apps, onRead, onSeeSchools }: {
  apps: ApplicationEntry[]
  /** Open one of Application 101's items, to read. */
  onRead: (itemId: string) => void
  onSeeSchools: () => void
}) {
  const [open, setOpen] = useState<RowId | null>(null)
  const row = (id: RowId) => ({ ...ROWS[id], open: open === id, onToggle: () => setOpen(open === id ? null : id) })

  const perRound = DEADLINE_TYPES.map((t) => ({ t, n: apps.filter((a) => a.deadlineType === t).length }))
  const onList = perRound.filter((r) => r.n > 0)

  // Fees for what's still to send. A missing figure is "not on file", never $0.
  const fees = toSend(apps).map((a) => a.applicationFeeCents)
  const charged = fees.filter((c): c is number => c != null && c > 0)
  const free = fees.filter((c) => c === 0).length
  const unknown = fees.filter((c) => c == null).length
  const total = Math.round(charged.reduce((s, c) => s + c, 0) / 100)
  // Only once a figure is known: "14 not on file" alone says nothing.
  const feeParts = charged.length + free === 0 ? [] : [
    charged.length > 0 && `$${total.toLocaleString('en-US')} for ${schools(charged.length)}`,
    free > 0 && `${free} free`,
    unknown > 0 && `${unknown} not on file`,
  ].filter(Boolean)

  return (
    <div>
      <SecLabel>Know your application</SecLabel>

      <GuideRow {...row('apply')} title="Where you apply" summary="The Common App, the Coalition App, or the school’s own">
        <GuideIntro>Most schools take more than one, and you only need one per school. Each school’s admissions page says which it accepts.</GuideIntro>
        <GuideItem title="Common App" figure="1,000+ colleges" color={ROWS.apply.color} links={<ExtLink href="https://www.commonapp.org/" color={ROWS.apply.color}>Site</ExtLink>}>
          One application for every school that takes it. Your details, activities and personal essay go to all of them, and each school can add its own questions.
        </GuideItem>
        <GuideItem title="Coalition App" color={ROWS.apply.color}>
          Run on Scoir and taken by a smaller group of colleges. It works the same way: one form, sent to many.
        </GuideItem>
        <GuideItem title="The school’s own" color={ROWS.apply.color}>
          A few schools take only their own application, like the University of California and MIT.
        </GuideItem>
        <EdvifiCan color={ROWS.apply.color} can="help you choose between them." cta="Compare the apps" onClick={() => onRead('as-3')} />
      </GuideRow>

      <GuideRow {...row('parts')} title="What goes into an application" summary="Essays, recommendations, transcript, test scores and activities">
        <GuideItem title="Personal essay" figure="650 words max" color={ROWS.parts.color}>
          One essay that goes to every school on the Common App. Many schools add shorter essays of their own.
        </GuideItem>
        <GuideItem title="Recommendations" figure="usually 2 teachers and your counselor" color={ROWS.parts.color}>
          Ask teachers who know your work well, at least three weeks before your first deadline.
        </GuideItem>
        <GuideItem title="Transcript" color={ROWS.parts.color}>
          Your counselor sends it with a school report. Schools see your senior grades too, at midyear and at the end.
        </GuideItem>
        <GuideItem title="Test scores" color={ROWS.parts.color}>
          Many schools are test-optional, but some require the SAT or ACT again. Check each school’s policy.
        </GuideItem>
        <GuideItem title="Activities" figure="up to 10" color={ROWS.parts.color}>
          Jobs, family responsibilities and clubs all count. The Common App also has room for 5 honors.
        </GuideItem>
        <EdvifiCan color={ROWS.parts.color} can="keep each school’s essays, recommendations and other steps in one checklist." cta="See my applications" onClick={onSeeSchools} />
      </GuideRow>

      <GuideRow
        {...row('rounds')}
        title="Application rounds"
        summary={onList.length ? `On your list: ${onList.map((r) => `${r.n} ${r.t === 'Rolling' ? 'rolling' : r.t}`).join(', ')}` : 'ED, EA, REA, RD and rolling: what each one commits you to'}
      >
        <GuideIntro>Each school on your list has one round, set on its page in Application Status. Only Early Decision is binding.</GuideIntro>
        {perRound.map(({ t, n }) => (
          <GuideItem key={t} title={DEADLINE_TYPE_LABEL[t]} chip color={DEADLINE_TYPE_COLOR[t]} figure={n ? `${n} on your list` : undefined}>
            {DEADLINE_TYPE_MEANING[t]}
          </GuideItem>
        ))}
        <EdvifiCan color={ROWS.rounds.color} can="help you decide whether Early Decision is right for you." cta="Should I apply ED?" onClick={() => onRead('as-2')} />
      </GuideRow>

      <GuideRow {...row('fees')} title="Fees and fee waivers" summary={feeParts.length ? `Your list: ${feeParts.join(', ')}` : 'Many schools are free, and a waiver covers the rest for many families'}>
        <GuideIntro>More than half the schools on the Common App charge nothing to apply. If money is tight, a fee waiver covers the rest, and asking for one is routine.</GuideIntro>
        <GuideItem title="Common App fee waiver" color={ROWS.fees.color}>
          Ask for it in the Common App’s profile section if you qualify, for example through free or reduced-price lunch or an SAT or ACT fee waiver. Your counselor confirms it.
        </GuideItem>
        <GuideItem title="SAT, ACT and NACAC waivers" color={ROWS.fees.color}>
          Testing with an SAT fee waiver also gets you free applications at participating colleges. Your counselor can sign a NACAC waiver for the rest.
        </GuideItem>
        <EdvifiCan color={ROWS.fees.color} can="explain who qualifies and how to ask." cta="Read about fee waivers" onClick={() => onRead('sw-3')} />
      </GuideRow>
    </div>
  )
}
