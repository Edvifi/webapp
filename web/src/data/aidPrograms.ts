/**
 * The aid programs the Financial Aid overview teaches.
 *
 * Every figure here was checked against the program's official site for the
 * award year in AID_FACTS_AS_OF. They change every year, so the UI always shows
 * that label next to them and links out to the source rather than presenting
 * them as the final word.
 *
 * Schools' own income guarantees are not here: they live on the `colleges`
 * table (migration 20260930000000_college_aid_guarantees), the only source.
 */

export const AID_FACTS_AS_OF = '2026–27'

/** A guarantee's name with who it is for, written the same way everywhere. */
export function guaranteeLabel(g: { headline: string; residents?: string }): string {
  return g.residents ? `${g.headline} · ${g.residents}` : g.headline
}

export interface AidProgram {
  id: string
  name: string
  /** One line: what it pays. */
  amount: string
  /** Who it is for and how you get it. */
  summary: string
  /** The one thing a student is most likely to get wrong. */
  note?: string
  url: string
  /** Extra official links, e.g. one per ROTC branch. */
  links?: Array<{ label: string; url: string }>
}

export const MAJOR_PROGRAMS: AidProgram[] = [
  {
    id: 'pell',
    name: 'Federal Pell Grant',
    amount: 'Up to $7,395 a year',
    summary: 'Federal grant for students with financial need. You never have to pay it back.',
    note: 'There is no separate application. Filing the FAFSA is how you are considered.',
    url: 'https://studentaid.gov/understand-aid/types/grants/pell',
  },
  {
    id: 'questbridge',
    name: 'QuestBridge National College Match',
    amount: 'Full four-year scholarship',
    summary: 'For high-achieving seniors from low-income families. Matched students get a full scholarship at one of 55 partner colleges, including Harvard, MIT, Stanford and Yale.',
    note: 'Applications are due around Oct 1 of senior year, before most college deadlines. Plan for it in junior year.',
    url: 'https://www.questbridge.org/apply-to-college/programs/national-college-match',
  },
  {
    id: 'rotc',
    name: 'ROTC scholarships',
    amount: 'Up to full tuition, plus a monthly stipend',
    summary: 'The Army, Navy and Air Force pay for college in exchange for serving as an officer after you graduate.',
    note: 'Applications open the summer before senior year, and some need a fitness test and interview.',
    url: 'https://www.goarmy.com/rotc',
    links: [
      { label: 'Army', url: 'https://www.goarmy.com/rotc' },
      { label: 'Navy', url: 'https://www.navy.com/nrotc' },
      { label: 'Air Force', url: 'https://www.afrotc.com/scholarships/' },
    ],
  },
  {
    id: 'gi-bill',
    name: 'GI Bill (transferred from a parent)',
    amount: 'Up to 36 months of benefits',
    summary: 'A parent in the military can transfer their Post-9/11 GI Bill benefits to you to pay for college.',
    note: 'The transfer has to be set up while your parent is still serving, so ask early.',
    url: 'https://www.va.gov/education/transfer-post-9-11-gi-bill-benefits/',
  },
]

export type GrantState = 'CA' | 'NY' | 'TX' | 'FL' | 'GA'

export interface StateGrant extends AidProgram {
  state: GrantState
  stateName: string
}

export const STATE_GRANTS: StateGrant[] = [
  {
    id: 'cal-grant',
    state: 'CA',
    stateName: 'California',
    name: 'Cal Grant',
    amount: 'Up to $15,588 at a UC, $6,838 at a CSU, $9,358 at a private college',
    summary: 'Need-based grant for California residents. File the FAFSA or the California Dream Act Application, and your high school submits your GPA.',
    url: 'https://www.csac.ca.gov/cal-grant',
  },
  {
    id: 'ny-tap',
    state: 'NY',
    stateName: 'New York',
    name: 'Tuition Assistance Program (TAP)',
    amount: 'Up to $5,665 a year',
    summary: 'Need-based grant for New York residents at New York colleges, for families with taxable income up to $125,000.',
    note: 'New York residents also pay a lower tuition at Cornell’s state-supported colleges (Agriculture & Life Sciences, Human Ecology, ILR, and Public Policy).',
    url: 'https://www.hesc.ny.gov/',
    links: [{ label: 'Cornell aid', url: 'https://finaid.cornell.edu/' }],
  },
  {
    id: 'texas-grant',
    state: 'TX',
    stateName: 'Texas',
    name: 'TEXAS Grant',
    amount: 'Up to $5,399 a semester at a public university',
    summary: 'Need-based grant for Texas residents at Texas public colleges. File the FAFSA or TASFA by the state priority deadline.',
    note: 'The top 5% of your class (for fall 2027 entry) gets automatic admission to UT Austin. That is admission, not aid. Free tuition there comes from UT’s Texas Advance Commitment (see university guarantees).',
    url: 'https://www.highered.texas.gov/',
  },
  {
    id: 'bright-futures',
    state: 'FL',
    stateName: 'Florida',
    name: 'Florida Bright Futures',
    amount: '100% of tuition (Academic Scholars) or 75% (Medallion Scholars)',
    summary: 'Merit scholarship for Florida residents at Florida colleges. Academic Scholars need a 3.5 weighted GPA, a 1330 SAT or 29 ACT, and 100 service or work hours.',
    note: 'You have to submit the Florida Financial Aid Application during senior year, between Oct 1 and Aug 31 after you graduate.',
    url: 'https://www.floridastudentfinancialaidsg.org/SAPHome/SAPHome',
  },
  {
    id: 'georgia-hope',
    state: 'GA',
    stateName: 'Georgia',
    name: 'HOPE & Zell Miller Scholarships',
    amount: 'Most of tuition (HOPE) or full tuition (Zell Miller)',
    summary: 'Merit scholarships for Georgia residents at Georgia colleges. HOPE needs a 3.0 GPA. Zell Miller needs a 3.7 GPA plus a 1200 SAT or 26 ACT.',
    url: 'https://www.gafutures.org/hope-state-aid-programs/',
  },
]

export interface ScholarshipCategory {
  id: string
  name: string
  description: string
  example: string
}

export const SCHOLARSHIP_CATEGORIES: ScholarshipCategory[] = [
  {
    id: 'merit',
    name: 'Merit-based',
    description: 'Awarded for grades, test scores, leadership or talent. Financial need is not required.',
    example: 'e.g. National Merit, Florida Bright Futures',
  },
  {
    id: 'need',
    name: 'Need-based',
    description: 'Goes first to students from lower-income families. It often stacks with federal aid like the Pell Grant.',
    example: 'e.g. Pell Grant, Cal Grant',
  },
  {
    id: 'institutional',
    name: 'Institutional',
    description: 'Paid by the university itself. At schools like Vanderbilt or Emory, most aid comes from the school.',
    example: 'Often needs the school’s own aid form',
  },
  {
    id: 'national',
    name: 'Private / national',
    description: 'Competitive programs open to students across the country.',
    example: 'e.g. QuestBridge, Coca-Cola Scholars',
  },
  {
    id: 'specialized',
    name: 'Specialized',
    description: 'For particular groups or paths: STEM, first-generation students, students of color, or a specific major.',
    example: 'Check the Aid Engine for ones that fit you',
  },
]

/**
 * A two-letter state from a ZIP code, for the five states with a grant card.
 * The profile stores only a ZIP, and the first three digits are enough to put
 * the student's own state first. Anything outside these five returns null.
 */
export function grantStateFromZip(zip: string | null | undefined): GrantState | null {
  // Five digits required: '7501' (07501 with its zero dropped) must not read as 750, Texas.
  const m = /^\s*(\d{3})\d{2}/.exec(zip ?? '')
  if (!m) return null
  const p = Number(m[1])
  if (p >= 900 && p <= 961) return 'CA'
  if ((p >= 100 && p <= 149) || p === 5) return 'NY'
  if ((p >= 750 && p <= 799) || p === 733 || p === 885) return 'TX'
  // 340 is the military APO/FPO prefix (AA), not Florida.
  if (p >= 320 && p <= 349 && p !== 340) return 'FL'
  if ((p >= 300 && p <= 319) || p === 398 || p === 399) return 'GA'
  return null
}
