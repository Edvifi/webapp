/* ═══════════════════════════════════════════════════════════════
   COLLEGE DATA

   Colleges live in the Supabase `colleges` table (see the ingestion
   pipeline). This module loads them into an in-memory cache once, so the
   rest of the app keeps using synchronous getCollegeById/searchColleges.
   The hardcoded SEED_COLLEGES below is an offline fallback the cache
   starts from, so the UI is never empty even before the DB load resolves.
   ═══════════════════════════════════════════════════════════════ */

import { supabase } from '../lib/supabase'

export interface CollegeInfo {
  id: string
  name: string
  emoji: string
  type: string
  state: string
  city?: string | null
  logoUrl?: string | null
  costOfAttendance: number
  costOutOfState?: number
  avgNetPrice?: number | null
  applicationDeadlines: {
    earlyAction?: string | null
    earlyDecision?: string | null
    regularDecision: string
  }
  financialAidDeadlines: {
    fafsaPriority: string
    cssProfile?: string | null
    aidNotification: string
  }
  meetsFullNeed: boolean
  noLoanPolicy: boolean
  npcUrl: string
  acceptanceRate?: number
  /** true when deadlines are smart defaults rather than curated real dates. */
  deadlinesEstimated?: boolean
}

const SEED_COLLEGES: CollegeInfo[] = [
  // ─── UC Schools ───────────────────────────────────────────
  {
    id: 'ucla',
    name: 'UCLA',
    emoji: '🐻',
    type: 'Public',
    state: 'CA',
    costOfAttendance: 36297,
    costOutOfState: 66297,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Nov 30, 2026' },
    financialAidDeadlines: { fafsaPriority: 'Mar 2, 2027', cssProfile: null, aidNotification: 'Mar 2027' },
    meetsFullNeed: true,
    noLoanPolicy: false,
    npcUrl: 'https://www.ucla.edu/admission/affordability',
    acceptanceRate: 0.09,
  },
  {
    id: 'uc-berkeley',
    name: 'UC Berkeley',
    emoji: '🔵',
    type: 'Public',
    state: 'CA',
    costOfAttendance: 38066,
    costOutOfState: 68066,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Nov 30, 2026' },
    financialAidDeadlines: { fafsaPriority: 'Mar 2, 2027', cssProfile: null, aidNotification: 'Mar 2027' },
    meetsFullNeed: true,
    noLoanPolicy: false,
    npcUrl: 'https://financialaid.berkeley.edu/net-price-calculator/',
    acceptanceRate: 0.11,
  },
  {
    id: 'ucsd',
    name: 'UC San Diego',
    emoji: '🔱',
    type: 'Public',
    state: 'CA',
    costOfAttendance: 35436,
    costOutOfState: 65436,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Nov 30, 2026' },
    financialAidDeadlines: { fafsaPriority: 'Mar 2, 2027', cssProfile: null, aidNotification: 'Mar 2027' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://fas.ucsd.edu/cost/net-price-calculator.html',
    acceptanceRate: 0.24,
  },
  {
    id: 'uci',
    name: 'UC Irvine',
    emoji: '🐜',
    type: 'Public',
    state: 'CA',
    costOfAttendance: 34261,
    costOutOfState: 64261,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Nov 30, 2026' },
    financialAidDeadlines: { fafsaPriority: 'Mar 2, 2027', cssProfile: null, aidNotification: 'Mar 2027' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://www.ofas.uci.edu/content/costs.aspx?nav=2',
    acceptanceRate: 0.21,
  },
  {
    id: 'uc-davis',
    name: 'UC Davis',
    emoji: '🐄',
    type: 'Public',
    state: 'CA',
    costOfAttendance: 34098,
    costOutOfState: 64098,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Nov 30, 2026' },
    financialAidDeadlines: { fafsaPriority: 'Mar 2, 2027', cssProfile: null, aidNotification: 'Mar 2027' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://financialaid.ucdavis.edu/undergraduate/net-price-calculator',
    acceptanceRate: 0.37,
  },
  {
    id: 'uc-santa-barbara',
    name: 'UC Santa Barbara',
    emoji: '🏖️',
    type: 'Public',
    state: 'CA',
    costOfAttendance: 35658,
    costOutOfState: 65658,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Nov 30, 2026' },
    financialAidDeadlines: { fafsaPriority: 'Mar 2, 2027', cssProfile: null, aidNotification: 'Mar 2027' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://www.finaid.ucsb.edu/net-price-calculator',
    acceptanceRate: 0.26,
  },
  {
    id: 'uc-santa-cruz',
    name: 'UC Santa Cruz',
    emoji: '🐌',
    type: 'Public',
    state: 'CA',
    costOfAttendance: 35043,
    costOutOfState: 65043,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Nov 30, 2026' },
    financialAidDeadlines: { fafsaPriority: 'Mar 2, 2027', cssProfile: null, aidNotification: 'Mar 2027' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://financialaid.ucsc.edu/cost-to-attend/net-price-calculator.html',
    acceptanceRate: 0.47,
  },
  // ─── CSU Schools ──────────────────────────────────────────
  {
    id: 'cal-poly-slo',
    name: 'Cal Poly SLO',
    emoji: '🌿',
    type: 'Public',
    state: 'CA',
    costOfAttendance: 30402,
    costOutOfState: 42282,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Dec 1, 2026' },
    financialAidDeadlines: { fafsaPriority: 'Mar 2, 2027', cssProfile: null, aidNotification: 'Apr 2027' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://www.calpoly.edu/financial-aid/net-price-calculator',
    acceptanceRate: 0.28,
  },
  {
    id: 'sdsu',
    name: 'San Diego State',
    emoji: '🔴',
    type: 'Public',
    state: 'CA',
    costOfAttendance: 28100,
    costOutOfState: 39980,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Dec 1, 2026' },
    financialAidDeadlines: { fafsaPriority: 'Mar 2, 2027', cssProfile: null, aidNotification: 'Apr 2027' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://financialaid.sdsu.edu/net-price-calculator/',
    acceptanceRate: 0.39,
  },
  {
    id: 'sjsu',
    name: 'San Jose State',
    emoji: '🟡',
    type: 'Public',
    state: 'CA',
    costOfAttendance: 26424,
    costOutOfState: 38304,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Dec 1, 2026' },
    financialAidDeadlines: { fafsaPriority: 'Mar 2, 2027', cssProfile: null, aidNotification: 'Apr 2027' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://www.sjsu.edu/faso/net-price-calculator/',
    acceptanceRate: 0.72,
  },
  {
    id: 'cal-state-la',
    name: 'Cal State LA',
    emoji: '🦅',
    type: 'Public',
    state: 'CA',
    costOfAttendance: 24366,
    costOutOfState: 36246,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Dec 1, 2026' },
    financialAidDeadlines: { fafsaPriority: 'Mar 2, 2027', cssProfile: null, aidNotification: 'Apr 2027' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://www.calstatela.edu/financialaid/net-price-calculator',
    acceptanceRate: 0.68,
  },
  // ─── Ivy League ───────────────────────────────────────────
  {
    id: 'harvard',
    name: 'Harvard',
    emoji: '🟥',
    type: 'Private',
    state: 'MA',
    costOfAttendance: 82866,
    applicationDeadlines: { earlyAction: 'Nov 1, 2026', earlyDecision: null, regularDecision: 'Jan 1, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 1, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: true,
    npcUrl: 'https://college.harvard.edu/financial-aid/net-price-calculator',
    acceptanceRate: 0.03,
  },
  {
    id: 'yale',
    name: 'Yale',
    emoji: '🐶',
    type: 'Private',
    state: 'CT',
    costOfAttendance: 83880,
    applicationDeadlines: { earlyAction: 'Nov 1, 2026', earlyDecision: null, regularDecision: 'Jan 2, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Mar 1, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: true,
    npcUrl: 'https://finaid.yale.edu/costs-affordability/net-price-calculator',
    acceptanceRate: 0.04,
  },
  {
    id: 'princeton',
    name: 'Princeton',
    emoji: '🐯',
    type: 'Private',
    state: 'NJ',
    costOfAttendance: 82710,
    applicationDeadlines: { earlyAction: 'Nov 1, 2026', earlyDecision: null, regularDecision: 'Jan 1, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 1, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: true,
    npcUrl: 'https://admission.princeton.edu/cost-aid/financial-aid-estimator',
    acceptanceRate: 0.04,
  },
  {
    id: 'columbia',
    name: 'Columbia',
    emoji: '🦁',
    type: 'Private',
    state: 'NY',
    costOfAttendance: 84216,
    applicationDeadlines: { earlyAction: null, earlyDecision: 'Nov 1, 2026', regularDecision: 'Jan 1, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 15, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: true,
    npcUrl: 'https://cc-seas.financialaid.columbia.edu/net-price-calculator',
    acceptanceRate: 0.04,
  },
  {
    id: 'upenn',
    name: 'UPenn',
    emoji: '🔴',
    type: 'Private',
    state: 'PA',
    costOfAttendance: 84570,
    applicationDeadlines: { earlyAction: null, earlyDecision: 'Nov 1, 2026', regularDecision: 'Jan 5, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 15, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: false,
    npcUrl: 'https://srfs.upenn.edu/financial-aid/net-price-calculator',
    acceptanceRate: 0.06,
  },
  {
    id: 'brown',
    name: 'Brown',
    emoji: '🐻',
    type: 'Private',
    state: 'RI',
    costOfAttendance: 83006,
    applicationDeadlines: { earlyAction: null, earlyDecision: 'Nov 1, 2026', regularDecision: 'Jan 5, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 1, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: false,
    npcUrl: 'https://www.brown.edu/about/administration/financial-aid/net-price-calculator',
    acceptanceRate: 0.05,
  },
  {
    id: 'dartmouth',
    name: 'Dartmouth',
    emoji: '🌲',
    type: 'Private',
    state: 'NH',
    costOfAttendance: 83307,
    applicationDeadlines: { earlyAction: null, earlyDecision: 'Nov 1, 2026', regularDecision: 'Jan 2, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 1, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: true,
    npcUrl: 'https://financialaid.dartmouth.edu/net-price-calculator',
    acceptanceRate: 0.06,
  },
  {
    id: 'cornell',
    name: 'Cornell',
    emoji: '🐻‍❄️',
    type: 'Private',
    state: 'NY',
    costOfAttendance: 82260,
    applicationDeadlines: { earlyAction: null, earlyDecision: 'Nov 1, 2026', regularDecision: 'Jan 2, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 15, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: false,
    npcUrl: 'https://finaid.cornell.edu/net-price-calculator',
    acceptanceRate: 0.07,
  },
  // ─── Top Privates ─────────────────────────────────────────
  {
    id: 'stanford',
    name: 'Stanford',
    emoji: '🌲',
    type: 'Private',
    state: 'CA',
    costOfAttendance: 84683,
    applicationDeadlines: { earlyAction: 'Nov 1, 2026', earlyDecision: null, regularDecision: 'Jan 2, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 15, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: true,
    npcUrl: 'https://financialaid.stanford.edu/undergrad/calculator/index.html',
    acceptanceRate: 0.04,
  },
  {
    id: 'mit',
    name: 'MIT',
    emoji: '🦫',
    type: 'Private',
    state: 'MA',
    costOfAttendance: 82180,
    applicationDeadlines: { earlyAction: 'Nov 1, 2026', earlyDecision: null, regularDecision: 'Jan 1, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 15, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Mar 2027' },
    meetsFullNeed: true,
    noLoanPolicy: true,
    npcUrl: 'https://sfs.mit.edu/undergraduate-students/the-cost-of-attendance/net-price-calculator/',
    acceptanceRate: 0.04,
  },
  {
    id: 'caltech',
    name: 'Caltech',
    emoji: '🔬',
    type: 'Private',
    state: 'CA',
    costOfAttendance: 82764,
    applicationDeadlines: { earlyAction: 'Nov 1, 2026', earlyDecision: null, regularDecision: 'Jan 3, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 15, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: true,
    npcUrl: 'https://www.finaid.caltech.edu/net-price-calculator',
    acceptanceRate: 0.03,
  },
  {
    id: 'duke',
    name: 'Duke',
    emoji: '😈',
    type: 'Private',
    state: 'NC',
    costOfAttendance: 83263,
    applicationDeadlines: { earlyAction: null, earlyDecision: 'Nov 1, 2026', regularDecision: 'Jan 4, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 1, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: false,
    npcUrl: 'https://financialaid.duke.edu/net-price-calculator/',
    acceptanceRate: 0.06,
  },
  {
    id: 'northwestern',
    name: 'Northwestern',
    emoji: '🟣',
    type: 'Private',
    state: 'IL',
    costOfAttendance: 83556,
    applicationDeadlines: { earlyAction: null, earlyDecision: 'Nov 1, 2026', regularDecision: 'Jan 3, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 15, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: false,
    npcUrl: 'https://undergradaid.northwestern.edu/net-price-calculator/',
    acceptanceRate: 0.07,
  },
  {
    id: 'uchicago',
    name: 'UChicago',
    emoji: '🐦',
    type: 'Private',
    state: 'IL',
    costOfAttendance: 84816,
    applicationDeadlines: { earlyAction: 'Nov 1, 2026', earlyDecision: 'Nov 1, 2026', regularDecision: 'Jan 4, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 15, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: true,
    npcUrl: 'https://financialaid.uchicago.edu/net-price-calculator',
    acceptanceRate: 0.05,
  },
  {
    id: 'georgetown',
    name: 'Georgetown',
    emoji: '🐶',
    type: 'Private',
    state: 'DC',
    costOfAttendance: 82526,
    applicationDeadlines: { earlyAction: 'Nov 1, 2026', earlyDecision: null, regularDecision: 'Jan 10, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 1, 2027', cssProfile: 'Feb 1, 2027', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: false,
    npcUrl: 'https://finaid.georgetown.edu/net-price-calculator/',
    acceptanceRate: 0.12,
  },
  {
    id: 'nyu',
    name: 'NYU',
    emoji: '🗽',
    type: 'Private',
    state: 'NY',
    costOfAttendance: 83250,
    applicationDeadlines: { earlyAction: null, earlyDecision: 'Nov 1, 2026', regularDecision: 'Jan 5, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 15, 2027', cssProfile: 'Feb 15, 2027', aidNotification: 'Apr 2027' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://www.nyu.edu/admissions/financial-aid-and-scholarships/net-price-calculator.html',
    acceptanceRate: 0.08,
  },
  {
    id: 'usc',
    name: 'USC',
    emoji: '✌️',
    type: 'Private',
    state: 'CA',
    costOfAttendance: 87881,
    applicationDeadlines: { earlyAction: 'Nov 1, 2026', earlyDecision: null, regularDecision: 'Jan 15, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 1, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: false,
    npcUrl: 'https://financialaid.usc.edu/net-price-calculator/',
    acceptanceRate: 0.09,
  },
  {
    id: 'vanderbilt',
    name: 'Vanderbilt',
    emoji: '⚓',
    type: 'Private',
    state: 'TN',
    costOfAttendance: 82282,
    applicationDeadlines: { earlyAction: null, earlyDecision: 'Nov 1, 2026', regularDecision: 'Jan 1, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 1, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: true,
    npcUrl: 'https://www.vanderbilt.edu/financialaid/net-price-calculator/',
    acceptanceRate: 0.06,
  },
  {
    id: 'rice',
    name: 'Rice',
    emoji: '🦉',
    type: 'Private',
    state: 'TX',
    costOfAttendance: 74244,
    applicationDeadlines: { earlyAction: null, earlyDecision: 'Nov 1, 2026', regularDecision: 'Jan 4, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 15, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: true,
    npcUrl: 'https://financialaid.rice.edu/net-price-calculator',
    acceptanceRate: 0.08,
  },
  {
    id: 'emory',
    name: 'Emory',
    emoji: '🦅',
    type: 'Private',
    state: 'GA',
    costOfAttendance: 79594,
    applicationDeadlines: { earlyAction: null, earlyDecision: 'Nov 1, 2026', regularDecision: 'Jan 1, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 15, 2027', cssProfile: 'Nov 15, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: false,
    npcUrl: 'https://www.emory.edu/admission/afford/net-price-calculator.html',
    acceptanceRate: 0.11,
  },
  {
    id: 'washu',
    name: 'WashU',
    emoji: '🐻',
    type: 'Private',
    state: 'MO',
    costOfAttendance: 82780,
    applicationDeadlines: { earlyAction: null, earlyDecision: 'Nov 1, 2026', regularDecision: 'Jan 4, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 1, 2027', cssProfile: 'Nov 1, 2026', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: false,
    npcUrl: 'https://financialaid.wustl.edu/net-price-calculator/',
    acceptanceRate: 0.11,
  },
  // ─── Top Publics ──────────────────────────────────────────
  {
    id: 'umich',
    name: 'UMich',
    emoji: '〽️',
    type: 'Public',
    state: 'MI',
    costOfAttendance: 33007,
    costOutOfState: 69326,
    applicationDeadlines: { earlyAction: 'Nov 1, 2026', earlyDecision: null, regularDecision: 'Feb 1, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 28, 2027', cssProfile: 'Feb 28, 2027', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: false,
    npcUrl: 'https://finaid.umich.edu/net-price-calculator/',
    acceptanceRate: 0.18,
  },
  {
    id: 'uva',
    name: 'UVA',
    emoji: '⚔️',
    type: 'Public',
    state: 'VA',
    costOfAttendance: 34810,
    costOutOfState: 68102,
    applicationDeadlines: { earlyAction: 'Nov 1, 2026', earlyDecision: null, regularDecision: 'Jan 5, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Mar 1, 2027', cssProfile: 'Mar 1, 2027', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: false,
    npcUrl: 'https://sfs.virginia.edu/net-price-calculator',
    acceptanceRate: 0.19,
  },
  {
    id: 'unc',
    name: 'UNC Chapel Hill',
    emoji: '🐏',
    type: 'Public',
    state: 'NC',
    costOfAttendance: 26092,
    costOutOfState: 55060,
    applicationDeadlines: { earlyAction: 'Oct 15, 2026', earlyDecision: null, regularDecision: 'Jan 15, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Mar 1, 2027', cssProfile: 'Mar 1, 2027', aidNotification: 'Apr 2027' },
    meetsFullNeed: true,
    noLoanPolicy: true,
    npcUrl: 'https://studentaid.unc.edu/incoming/net-price-calculator/',
    acceptanceRate: 0.17,
  },
  {
    id: 'georgia-tech',
    name: 'Georgia Tech',
    emoji: '🐝',
    type: 'Public',
    state: 'GA',
    costOfAttendance: 29488,
    costOutOfState: 53448,
    applicationDeadlines: { earlyAction: 'Nov 1, 2026', earlyDecision: null, regularDecision: 'Jan 4, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 15, 2027', cssProfile: null, aidNotification: 'Apr 2027' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://finaid.gatech.edu/net-price-calculator/',
    acceptanceRate: 0.16,
  },
  {
    id: 'ut-austin',
    name: 'UT Austin',
    emoji: '🤘',
    type: 'Public',
    state: 'TX',
    costOfAttendance: 28426,
    costOutOfState: 57412,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Dec 1, 2026' },
    financialAidDeadlines: { fafsaPriority: 'Jan 15, 2027', cssProfile: null, aidNotification: 'Apr 2027' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://onestop.utexas.edu/managing-costs/cost-tuition-rates/net-price-calculator/',
    acceptanceRate: 0.29,
  },
  {
    id: 'uf',
    name: 'University of Florida',
    emoji: '🐊',
    type: 'Public',
    state: 'FL',
    costOfAttendance: 22260,
    costOutOfState: 44720,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Nov 1, 2026' },
    financialAidDeadlines: { fafsaPriority: 'Dec 15, 2026', cssProfile: null, aidNotification: 'Mar 2027' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://www.sfa.ufl.edu/net-price-calculator/',
    acceptanceRate: 0.23,
  },
  {
    id: 'ohio-state',
    name: 'Ohio State',
    emoji: '🌰',
    type: 'Public',
    state: 'OH',
    costOfAttendance: 29696,
    costOutOfState: 54720,
    applicationDeadlines: { earlyAction: 'Nov 1, 2026', earlyDecision: null, regularDecision: 'Feb 1, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Feb 1, 2027', cssProfile: null, aidNotification: 'Apr 2027' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://sfa.osu.edu/incoming-students/net-price-calculator',
    acceptanceRate: 0.53,
  },
  {
    id: 'penn-state',
    name: 'Penn State',
    emoji: '🦁',
    type: 'Public',
    state: 'PA',
    costOfAttendance: 36766,
    costOutOfState: 56378,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Dec 1, 2026' },
    financialAidDeadlines: { fafsaPriority: 'Feb 15, 2027', cssProfile: null, aidNotification: 'Apr 2027' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://admissions.psu.edu/costs-aid/net-price-calculator/',
    acceptanceRate: 0.54,
  },
  {
    id: 'purdue',
    name: 'Purdue',
    emoji: '🚂',
    type: 'Public',
    state: 'IN',
    costOfAttendance: 24090,
    costOutOfState: 45594,
    applicationDeadlines: { earlyAction: 'Nov 1, 2026', earlyDecision: null, regularDecision: 'Jan 15, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Mar 1, 2027', cssProfile: null, aidNotification: 'Apr 2027' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://www.purdue.edu/dfa/types/calculator.html',
    acceptanceRate: 0.53,
  },
  {
    id: 'wisconsin',
    name: 'UW-Madison',
    emoji: '🦡',
    type: 'Public',
    state: 'WI',
    costOfAttendance: 28404,
    costOutOfState: 56364,
    applicationDeadlines: { earlyAction: 'Nov 1, 2026', earlyDecision: null, regularDecision: 'Feb 1, 2027' },
    financialAidDeadlines: { fafsaPriority: 'Mar 1, 2027', cssProfile: null, aidNotification: 'Apr 2027' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://financialaid.wisc.edu/net-price-calculator/',
    acceptanceRate: 0.49,
  },
  // ─── Community Colleges ───────────────────────────────────
  {
    id: 'smc',
    name: 'Santa Monica College',
    emoji: '🏄',
    type: 'Community College',
    state: 'CA',
    costOfAttendance: 11766,
    costOutOfState: 20526,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Rolling' },
    financialAidDeadlines: { fafsaPriority: 'Mar 2, 2027', cssProfile: null, aidNotification: 'Rolling' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://www.smc.edu/student-support/financial-aid-scholarships/net-price-calculator.php',
    acceptanceRate: 1.0,
  },
  {
    id: 'de-anza',
    name: 'De Anza College',
    emoji: '🌊',
    type: 'Community College',
    state: 'CA',
    costOfAttendance: 10692,
    costOutOfState: 19038,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Rolling' },
    financialAidDeadlines: { fafsaPriority: 'Mar 2, 2027', cssProfile: null, aidNotification: 'Rolling' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://www.deanza.edu/financialaid/net-price-calculator.html',
    acceptanceRate: 1.0,
  },
  {
    id: 'pasadena-city',
    name: 'Pasadena City College',
    emoji: '🌹',
    type: 'Community College',
    state: 'CA',
    costOfAttendance: 11024,
    costOutOfState: 18632,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Rolling' },
    financialAidDeadlines: { fafsaPriority: 'Mar 2, 2027', cssProfile: null, aidNotification: 'Rolling' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://pasadena.edu/financial-aid/net-price-calculator.php',
    acceptanceRate: 1.0,
  },
  {
    id: 'miami-dade',
    name: 'Miami Dade College',
    emoji: '🌴',
    type: 'Community College',
    state: 'FL',
    costOfAttendance: 11060,
    costOutOfState: 18840,
    applicationDeadlines: { earlyAction: null, earlyDecision: null, regularDecision: 'Rolling' },
    financialAidDeadlines: { fafsaPriority: 'Mar 1, 2027', cssProfile: null, aidNotification: 'Rolling' },
    meetsFullNeed: false,
    noLoanPolicy: false,
    npcUrl: 'https://www.mdc.edu/financial-aid/net-price-calculator/',
    acceptanceRate: 1.0,
  },
]

/* ─── in-memory cache (seeded offline, replaced by the DB on load) ─── */

let CACHE: CollegeInfo[] = SEED_COLLEGES
let COLLEGE_MAP = new Map<string, CollegeInfo>(SEED_COLLEGES.map((c) => [c.id, c]))
let loaded = false
let loadPromise: Promise<void> | null = null

function rebuild(list: CollegeInfo[]) {
  CACHE = list
  COLLEGE_MAP = new Map(list.map((c) => [c.id, c]))
}

type CollegeRow = Awaited<ReturnType<typeof fetchRows>>[number]
async function fetchRows() {
  const { data, error } = await supabase
    .from('colleges')
    .select('*')
    .eq('status', 'published')
  if (error) throw error
  return data ?? []
}

function mapRow(r: CollegeRow): CollegeInfo {
  const deadlines = (r.application_deadlines ?? {}) as CollegeInfo['applicationDeadlines']
  const aid = (r.financial_aid_deadlines ?? {}) as CollegeInfo['financialAidDeadlines']
  return {
    id: r.slug,
    name: r.name,
    emoji: r.emoji ?? '🎓',
    type: r.type ?? 'Private',
    state: r.state ?? '',
    city: r.city,
    logoUrl: r.logo_url,
    costOfAttendance: r.cost_of_attendance ?? 0,
    costOutOfState: r.cost_out_of_state ?? undefined,
    avgNetPrice: r.avg_net_price,
    applicationDeadlines: deadlines,
    financialAidDeadlines: aid,
    meetsFullNeed: r.meets_full_need,
    noLoanPolicy: r.no_loan_policy,
    npcUrl: r.npc_url ?? '',
    acceptanceRate: r.acceptance_rate ?? undefined,
    deadlinesEstimated: r.deadlines_estimated,
  }
}

/** Load colleges from the DB into the cache once. Idempotent; safe to call often. */
export function loadColleges(): Promise<void> {
  if (loadPromise) return loadPromise
  loadPromise = fetchRows()
    .then((rows) => {
      if (rows.length) rebuild(rows.map(mapRow))
      loaded = true
    })
    .catch((e) => {
      loadPromise = null // allow retry; keep the seed cache in the meantime
      throw e
    })
  return loadPromise
}

export function collegesLoaded(): boolean {
  return loaded
}

/** All colleges currently in the cache (seed until the DB load resolves). */
export function getAllColleges(): CollegeInfo[] {
  return CACHE
}

/** Look up a single college by id (slug). */
export function getCollegeById(id: string): CollegeInfo | undefined {
  return COLLEGE_MAP.get(id)
}

/** Client-side fuzzy search across the cache. */
export function searchColleges(query: string): CollegeInfo[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  return CACHE.filter((c) => {
    const hay = `${c.id} ${c.name} ${c.state} ${c.type}`.toLowerCase()
    return q.split(/\s+/).every((token) => hay.includes(token))
  })
}
