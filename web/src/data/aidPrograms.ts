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

export type GrantState = 'CA' | 'NY' | 'TX' | 'FL' | 'GA' | 'MI'

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
  {
    id: 'mi-achievement',
    state: 'MI',
    stateName: 'Michigan',
    name: 'Michigan Achievement Scholarship',
    amount: 'Up to $5,500 a year at a public university, for up to five years',
    summary: 'For Michigan residents who finish high school in 2023 or later, with a Student Aid Index of $30,000 or less. File the FAFSA, then pick your college in the state’s MiSSG portal.',
    note: 'You have to enroll full time within 15 months of graduating. Community college and career training pay differently.',
    url: 'https://www.michigan.gov/mistudentaid/programs/michigan-achievement-scholarship',
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
    example: 'Check the Scholarship Engine for ones that fit you',
  },
]

/**
 * USPS three-digit ZIP prefixes by state, as [first, last, state]. Military
 * (AA/AE/AP — 340 sits inside Florida's run) and territory prefixes are left
 * out, so they read as no state.
 */
const ZIP3_STATES: ReadonlyArray<readonly [number, number, string]> = [
  [5, 5, 'NY'], [10, 27, 'MA'], [28, 29, 'RI'], [30, 38, 'NH'], [39, 49, 'ME'],
  [50, 54, 'VT'], [55, 55, 'MA'], [56, 59, 'VT'], [60, 69, 'CT'], [70, 89, 'NJ'],
  [100, 149, 'NY'], [150, 196, 'PA'], [197, 199, 'DE'], [200, 200, 'DC'], [201, 201, 'VA'],
  [202, 205, 'DC'], [206, 219, 'MD'], [220, 246, 'VA'], [247, 268, 'WV'], [270, 289, 'NC'],
  [290, 299, 'SC'], [300, 319, 'GA'], [320, 339, 'FL'], [341, 349, 'FL'], [350, 369, 'AL'],
  [370, 385, 'TN'], [386, 397, 'MS'], [398, 399, 'GA'], [400, 427, 'KY'], [430, 459, 'OH'],
  [460, 479, 'IN'], [480, 499, 'MI'], [500, 528, 'IA'], [530, 549, 'WI'], [550, 567, 'MN'],
  [569, 569, 'DC'], [570, 577, 'SD'], [580, 588, 'ND'], [590, 599, 'MT'], [600, 629, 'IL'],
  [630, 658, 'MO'], [660, 679, 'KS'], [680, 693, 'NE'], [700, 714, 'LA'], [716, 729, 'AR'],
  [730, 732, 'OK'], [733, 733, 'TX'], [734, 749, 'OK'], [750, 799, 'TX'], [800, 816, 'CO'],
  [820, 831, 'WY'], [832, 838, 'ID'], [840, 847, 'UT'], [850, 865, 'AZ'], [870, 884, 'NM'],
  [885, 885, 'TX'], [889, 898, 'NV'], [900, 961, 'CA'], [967, 968, 'HI'], [970, 979, 'OR'],
  [980, 994, 'WA'], [995, 999, 'AK'],
]

/**
 * A two-letter state (or DC) from a ZIP code. The profile stores only a ZIP,
 * and its first three digits are enough. Null for military, territory and
 * malformed ZIPs.
 */
export function stateFromZip(zip: string | null | undefined): string | null {
  // Five digits required: '7501' (07501 with its zero dropped) must not read as 750, Texas.
  const m = /^\s*(\d{3})\d{2}/.exec(zip ?? '')
  if (!m) return null
  const p = Number(m[1])
  return ZIP3_STATES.find(([lo, hi]) => p >= lo && p <= hi)?.[2] ?? null
}
