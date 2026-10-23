/**
 * Each state's own aid deadline tied to the FAFSA.
 *
 * Checked 2026-10-20 for the 2027–28 aid year (fall-2027 entry) against Federal
 * Student Aid's state list and, wherever it loads, the state agency's own page.
 * Where the two disagree the earlier date is kept, since filing early never
 * costs a student anything. Most of these recur on the same month and day each
 * year; for any other cycle the year is moved and the date marked as moved.
 *
 * Only two kinds are worth a calendar entry: a fixed date, and "as soon as
 * possible" — first come, until the money runs out — which belongs on the day
 * the FAFSA opens. States that leave it to each college (AL, CO, DC, HI, MI,
 * MN, NE, NH, NM, OK, RI, SD, VA, WI, WY) are left out rather than given a date
 * nobody set, and so is Georgia, whose HOPE deadline is the end of the term.
 */

/** The senior fall these dates were checked for. Any other cycle is an estimate. */
export const STATE_AID_CHECKED_FOR = 2026

export type StateAidDeadline =
  | {
      kind: 'fixed'
      state: string
      stateName: string
      program: string
      /** Compact label for tight spots. */
      short: string
      /** 0-based month and day. */
      month: number
      day: number
      /** The calendar year the aid year starts in ('start', 2027 for fall-2027
       *  entry), or the one it ends in ('end'). */
      year: 'start' | 'end'
      /** What the date means, in a sentence. */
      rule: string
      url: string
    }
  | { kind: 'asap'; state: string; stateName: string; program: string; url: string }

type Fixed = Omit<Extract<StateAidDeadline, { kind: 'fixed' }>, 'state' | 'kind'>
type Asap = Omit<Extract<StateAidDeadline, { kind: 'asap' }>, 'state' | 'kind'>

const FSA = 'https://studentaid.gov/apply-for-aid/fafsa/fafsa-deadlines'

const FIXED: Readonly<Record<string, Fixed>> = {
  AZ: { stateName: 'Arizona', program: 'Arizona Promise Program', short: 'AZ Promise', month: 3, day: 1, year: 'start', rule: 'File the FAFSA by April 1 of senior year to be considered.', url: 'https://www.azregents.edu/programs/arizona-promise-program' },
  AR: { stateName: 'Arkansas', program: 'Academic Challenge Scholarship', short: 'AR Challenge', month: 6, day: 1, year: 'start', rule: 'The yearly deadline. The Governor’s Distinguished Scholarship closes earlier, on March 1.', url: 'https://sams.adhe.edu/Scholarship/details/ACST' },
  CA: { stateName: 'California', program: 'Cal Grant', short: 'Cal Grant', month: 2, day: 2, year: 'start', rule: 'Submit the FAFSA (or CA Dream Act) and your GPA by this date. Community college students have until September 2.', url: 'https://www.csac.ca.gov/apply' },
  CT: { stateName: 'Connecticut', program: 'Roberta B. Willis Need-Merit Scholarship', short: 'CT Need-Merit', month: 1, day: 15, year: 'start', rule: 'File the FAFSA by this date. The need-based grant is set by each college.', url: 'https://portal.ct.gov/ohe/knowledge-base/articles/for-students/connecticut-student-aid-programs' },
  DE: { stateName: 'Delaware', program: 'Scholarship Incentive Program', short: 'DE ScIP', month: 4, day: 15, year: 'start', rule: 'Submit the FAFSA by this date, midnight Central time.', url: FSA },
  FL: { stateName: 'Florida', program: 'Florida state aid', short: 'FL state aid', month: 4, day: 15, year: 'start', rule: 'Your FAFSA must be processed by this date. Florida colleges may set earlier ones.', url: FSA },
  ID: { stateName: 'Idaho', program: 'Idaho Opportunity Scholarship', short: 'ID Opportunity', month: 2, day: 1, year: 'start', rule: 'File the FAFSA by this date.', url: 'https://nextsteps.idaho.gov/scholarship-idaho/idaho-opportunity-scholarship' },
  IN: { stateName: 'Indiana', program: 'Frank O’Bannon Grant and 21st Century Scholars', short: 'IN state aid', month: 3, day: 15, year: 'start', rule: 'File the FAFSA by this date.', url: 'https://www.in.gov/che/state-financial-aid/state-financial-aid-by-program/frank-obannon-grant/' },
  IA: { stateName: 'Iowa', program: 'Iowa Tuition Grant and most state aid', short: 'IA state aid', month: 6, day: 1, year: 'start', rule: 'File the FAFSA by this date. The All Iowa Opportunity Scholarship closes earlier, on April 1.', url: 'https://educate.iowa.gov/higher-ed/financial-aid/scholarships-grants/iowa-tuition-grant' },
  KS: { stateName: 'Kansas', program: 'Kansas state aid', short: 'KS state aid', month: 3, day: 1, year: 'start', rule: 'A priority date; your college may set its own.', url: FSA },
  LA: { stateName: 'Louisiana', program: 'TOPS', short: 'LA TOPS', month: 1, day: 1, year: 'start', rule: 'The priority date for TOPS. Filing later can cost you semesters of the award.', url: 'https://mylosfa.la.gov/wp-content/uploads/2026/07/TOPS-Application-Process.pdf' },
  ME: { stateName: 'Maine', program: 'Maine State Grant', short: 'ME State Grant', month: 4, day: 1, year: 'start', rule: 'File the FAFSA by this date.', url: 'https://www.famemaine.com/' },
  MD: { stateName: 'Maryland', program: 'Howard P. Rawlings Educational Excellence Awards', short: 'MD state grant', month: 2, day: 1, year: 'start', rule: 'Your FAFSA must be received by this date.', url: 'https://mhec.maryland.gov/preparing/pages/financialaid/programdescriptions/prog_ea.aspx' },
  MA: { stateName: 'Massachusetts', program: 'MASSGrant', short: 'MASSGrant', month: 4, day: 1, year: 'start', rule: 'A priority date. The state has also used a later final date, but filing by this one is safe.', url: FSA },
  MS: { stateName: 'Mississippi', program: 'MTAG and MESG', short: 'MS state grants', month: 8, day: 15, year: 'start', rule: 'The state aid application deadline. The HELP grant closes much earlier, on March 31.', url: 'https://www.msfinancialaid.org/students-parents/application-process/awards-process-timeline/' },
  MO: { stateName: 'Missouri', program: 'Access Missouri Grant', short: 'Access MO', month: 1, day: 1, year: 'start', rule: 'File by this priority date and an eligible student is guaranteed an award. The final deadline is April 1.', url: 'https://dhewd.mo.gov/ppc/grants-scholarships/access-mo' },
  NJ: { stateName: 'New Jersey', program: 'Tuition Aid Grant', short: 'NJ TAG', month: 8, day: 15, year: 'start', rule: 'The deadline for first-time applicants; your FAFSA must be received by it.', url: 'https://hesaa.org/Pages/StateDeadlinesNextAY.aspx' },
  NY: { stateName: 'New York', program: 'Tuition Assistance Program', short: 'NY TAP', month: 5, day: 30, year: 'end', rule: 'The last day for the year. Apply well before your first term so the award is in place.', url: 'https://hesc.ny.gov/find-aid/nys-grants-scholarships/tuition-assistance-program-tap' },
  NC: { stateName: 'North Carolina', program: 'NC Next Scholarship', short: 'NC Next', month: 5, day: 1, year: 'start', rule: 'The priority date for UNC System schools and community colleges. Private colleges award as soon as possible.', url: 'https://www.cfnc.org/pay-for-college/next-nc-scholarship/' },
  OH: { stateName: 'Ohio', program: 'Ohio College Opportunity Grant', short: 'OCOG', month: 9, day: 1, year: 'start', rule: 'Counted by the date your FAFSA is received.', url: 'https://highered.ohio.gov/educators/financial-aid/sgs/ocog/ocog' },
  PA: { stateName: 'Pennsylvania', program: 'PA State Grant', short: 'PA State Grant', month: 4, day: 1, year: 'start', rule: 'File the FAFSA by this date. Community college and some career programs have until August 1.', url: 'https://www.pheaa.org/grants/state-grant-program' },
  TN: { stateName: 'Tennessee', program: 'Tennessee Promise and state grant', short: 'TN state aid', month: 3, day: 1, year: 'start', rule: 'File the FAFSA by this date.', url: 'https://www.collegefortn.org/tnpromise/' },
  TX: { stateName: 'Texas', program: 'Texas state aid', short: 'TX state aid', month: 0, day: 15, year: 'start', rule: 'The priority date for state aid at Texas public colleges.', url: 'https://www.highered.texas.gov/' },
  UT: { stateName: 'Utah', program: 'Utah Opportunity Scholarship', short: 'UT Opportunity', month: 1, day: 5, year: 'start', rule: 'The priority date; the final deadline is March 19.', url: 'https://ushe.edu/state-scholarships-aid/opportunity-scholarship/' },
  WV: { stateName: 'West Virginia', program: 'PROMISE Scholarship', short: 'WV PROMISE', month: 2, day: 1, year: 'start', rule: 'The PROMISE deadline. The WV Higher Education Grant follows on April 15.', url: 'https://www.cfwv.com/financial-aid/promise-scholarship/' },
}

const ASAP: Readonly<Record<string, Asap>> = {
  AK: { stateName: 'Alaska', program: 'The Alaska Education Grant', url: 'https://acpe.alaska.gov/Funding-Solutions/Alaska-Education-Grant' },
  IL: { stateName: 'Illinois', program: 'The Monetary Award Program (MAP)', url: FSA },
  KY: { stateName: 'Kentucky', program: 'Kentucky’s need-based grants', url: 'https://www.kheaa.com/web/scholarships-grants.faces' },
  MT: { stateName: 'Montana', program: 'Montana’s state aid', url: 'https://applymontana.mus.edu/paying-for-school/financial-aid/applying-for-financial-aid.html' },
  NV: { stateName: 'Nevada', program: 'The Silver State Opportunity Grant', url: FSA },
  ND: { stateName: 'North Dakota', program: 'The North Dakota State Grant', url: 'https://ndus.edu/paying-for-college/state-grant' },
  OR: { stateName: 'Oregon', program: 'The Oregon Opportunity Grant', url: 'https://oregonstudentaid.gov/grants/oregon-opportunity-grant/' },
  SC: { stateName: 'South Carolina', program: 'South Carolina’s need-based grants', url: FSA },
  VT: { stateName: 'Vermont', program: 'The Vermont Grant', url: 'https://www.vsac.org/plan/paying-for-college/fafsa-first' },
  WA: { stateName: 'Washington', program: 'The Washington College Grant', url: 'https://wsac.wa.gov/apply' },
}

/** The deadline for a two-letter state, or null where we hold none. */
export function stateAidDeadline(state: string): StateAidDeadline | null {
  const st = state.toUpperCase()
  if (FIXED[st]) return { kind: 'fixed', state: st, ...FIXED[st] }
  if (ASAP[st]) return { kind: 'asap', state: st, ...ASAP[st] }
  return null
}
