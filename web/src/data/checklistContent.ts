/* ═══════════════════════════════════════════════════════════════
   CHECKLIST EDUCATIONAL CONTENT
   Curated content for the Financial Aid module's Overview checklist.
   Written for high school juniors/seniors (2026-2027 cycle).
   ═══════════════════════════════════════════════════════════════ */

export interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

/** Text in paragraphs, lists, callouts and tables may mark **bold** and *italic*. */
export type ContentBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string; level?: 3 }
  | { kind: 'list'; items: string[]; ordered?: boolean }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'callout'; title: string; text: string; variant: 'info' | 'tip' | 'warning' }
  | { kind: 'quiz'; questions: QuizQuestion[] }
  | { kind: 'checklist'; title: string; items: string[] }
  | { kind: 'link'; label: string; url: string; description?: string }

export interface ChecklistContent {
  id: string
  title: string
  type: 'article' | 'quiz' | 'assignment' | 'task' | 'resource'
  body: ContentBlock[]
}

export const CHECKLIST_CONTENT: ChecklistContent[] = [
  /* ─────────────────────────────────────────────────────────────
     SECTION 1: Understanding Aid Types
     ───────────────────────────────────────────────────────────── */
  {
    id: 'at-1',
    title: 'Grants vs. Loans vs. Work-Study',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Three Pillars of Financial Aid' },
      {
        kind: 'paragraph',
        text: 'Financial aid comes in three main forms, and understanding the difference between them is one of the most important things you can do before college. Not all aid is equal — some is free money, and some you have to pay back. Let\'s break it down.',
      },
      { kind: 'heading', text: 'Grants: Free Money You Don\'t Pay Back' },
      {
        kind: 'paragraph',
        text: 'Grants are the best kind of financial aid because they\'re essentially gifts. You receive the money, use it for college expenses, and never have to repay it. The most well-known is the Federal Pell Grant, which is awarded based on financial need and can provide up to $7,395 per year (2026-2027 academic year). Many states and individual colleges also offer their own grants.',
      },
      {
        kind: 'callout',
        title: 'Key Fact',
        text: 'About one-third of all undergraduate students receive Pell Grants. You might qualify even if you think your family earns too much — always file FAFSA to find out.',
        variant: 'info',
      },
      { kind: 'heading', text: 'Loans: Borrowed Money You Must Repay' },
      {
        kind: 'paragraph',
        text: 'Student loans let you borrow money for college, but you\'ll need to pay it all back with interest after you graduate. Federal student loans (Direct Subsidized and Unsubsidized) generally have lower interest rates and more flexible repayment options than private loans. With subsidized loans, the government pays the interest while you\'re in school — a significant benefit.',
      },
      {
        kind: 'list',
        items: [
          'Direct Subsidized Loans — need-based, no interest while enrolled at least half-time',
          'Direct Unsubsidized Loans — not need-based, interest accrues immediately',
          'Parent PLUS Loans — your parents borrow on your behalf (credit check required)',
          'Private Loans — from banks or lenders, usually higher rates and fewer protections',
        ],
      },
      {
        kind: 'callout',
        title: 'Be Careful',
        text: 'Always exhaust grants, scholarships, and federal loans before considering private loans. Private loans lack federal protections like income-driven repayment plans and loan forgiveness programs.',
        variant: 'warning',
      },
      { kind: 'heading', text: 'Work-Study: Earn While You Learn' },
      {
        kind: 'paragraph',
        text: 'Federal Work-Study provides part-time jobs for students with financial need, allowing you to earn money to help pay education expenses. Jobs are often on campus (like working at the library or a campus office) and your schedule is designed to work around your classes. The money you earn goes directly to you — you can use it for tuition, books, or living expenses.',
      },
      {
        kind: 'callout',
        title: 'Pro Tip',
        text: 'Work-study earnings are not counted against you on next year\'s FAFSA, unlike regular job income. This makes work-study financially smarter than a regular part-time job when it comes to future aid eligibility.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'Putting It All Together' },
      {
        kind: 'paragraph',
        text: 'Most financial aid packages combine all three types. Your goal is to maximize grants and scholarships (free money), use federal loans wisely if needed, and consider work-study for additional support. When comparing college aid offers, always look at how much free aid you\'re getting versus how much you\'d need to borrow.',
      },
    ],
  },
  {
    id: 'at-2',
    title: 'Federal vs. Institutional vs. Private Aid',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Where Does Financial Aid Come From?' },
      {
        kind: 'paragraph',
        text: 'Financial aid doesn\'t all come from one place. Understanding the three major sources — federal, institutional, and private — helps you maximize the total aid you receive. Each source has different application processes, deadlines, and criteria.',
      },
      { kind: 'heading', text: 'Federal Aid: The Foundation' },
      {
        kind: 'paragraph',
        text: 'The U.S. Department of Education is the largest provider of student financial aid. Federal aid is available to nearly all students who file the FAFSA. It includes Pell Grants, Direct Loans, Federal Work-Study, and FSEOG (Supplemental Educational Opportunity Grants). Federal aid is consistent — the rules are the same no matter which school you attend.',
      },
      {
        kind: 'list',
        items: [
          'How to apply: File the FAFSA at studentaid.gov (opens October 1 each year)',
          'Based on: Financial need (using your Student Aid Index / SAI)',
          'Pros: Standardized process, strong borrower protections, income-driven repayment',
          'Watch out: Annual and aggregate borrowing limits exist for federal loans',
        ],
      },
      { kind: 'heading', text: 'Institutional Aid: From the College Itself' },
      {
        kind: 'paragraph',
        text: 'Many colleges use their own funds to offer scholarships, grants, and tuition discounts. This is often the largest source of aid at private universities. Some schools guarantee to meet 100% of demonstrated financial need, while others may leave a gap between what you need and what they offer. Institutional aid can be need-based, merit-based, or both.',
      },
      {
        kind: 'callout',
        title: 'CSS Profile Alert',
        text: 'About 200 colleges require the CSS Profile (from College Board) in addition to FAFSA. The CSS Profile collects more detailed financial information and is used to distribute institutional aid. Check each school\'s financial aid page to see if they require it.',
        variant: 'warning',
      },
      { kind: 'heading', text: 'Private Aid: External Scholarships and Loans' },
      {
        kind: 'paragraph',
        text: 'Private aid comes from organizations outside of the government and your college — businesses, nonprofits, community groups, professional associations, and foundations. Private scholarships are competitive but can significantly reduce your costs. Private loans from banks are also available but should be a last resort.',
      },
      {
        kind: 'callout',
        title: 'Important Note',
        text: 'Some colleges reduce their institutional aid when you win outside scholarships (called "scholarship displacement"). Ask each school\'s financial aid office about their policy before assuming outside scholarships will lower your out-of-pocket costs dollar-for-dollar.',
        variant: 'info',
      },
      { kind: 'heading', text: 'Maximizing All Three Sources' },
      {
        kind: 'paragraph',
        text: 'The students who pay the least for college typically tap all three sources effectively. Start with FAFSA (always), complete the CSS Profile if your schools require it, and apply to external scholarships throughout junior and senior year. The more proactive you are, the more options you\'ll have.',
      },
    ],
  },
  {
    id: 'at-3',
    title: 'How the Student Aid Index (SAI) is Calculated',
    type: 'article',
    body: [
      { kind: 'heading', text: 'What is the Student Aid Index (SAI)?' },
      {
        kind: 'paragraph',
        text: 'As of the 2024-2025 FAFSA cycle, the Expected Family Contribution (EFC) was renamed to the Student Aid Index (SAI). The SAI is a number calculated from the information you provide on the FAFSA. It represents an estimate of your family\'s financial strength and is used by colleges to determine how much federal student aid you\'re eligible for. A lower SAI means you\'re eligible for more need-based aid.',
      },
      {
        kind: 'callout',
        title: 'Key Change',
        text: 'Unlike the old EFC, the new SAI can be a negative number (as low as -1,500). A negative SAI may qualify you for additional aid. The formula was significantly simplified in the FAFSA Simplification Act.',
        variant: 'info',
      },
      { kind: 'heading', text: 'What Goes Into the Calculation?' },
      {
        kind: 'paragraph',
        text: 'The SAI formula considers several factors from your family\'s financial situation. The exact formula is set by Congress, and it weighs each factor differently.',
      },
      {
        kind: 'list',
        items: [
          'Parent income (wages, salary, business income from tax returns)',
          'Parent assets (savings, investments, real estate other than primary home)',
          'Student income (your own earnings, if any)',
          'Student assets (savings accounts, investments in your name)',
          'Family size and number of household members in college',
          'Whether parents receive means-tested federal benefits (like Medicaid or SNAP)',
        ],
      },
      { kind: 'heading', text: 'How Colleges Use Your SAI' },
      {
        kind: 'paragraph',
        text: 'Your financial need at any given school is calculated as: Cost of Attendance (COA) minus your SAI equals your Financial Need. For example, if a school\'s COA is $60,000 and your SAI is $15,000, your demonstrated financial need is $45,000. However, not all schools promise to meet 100% of your need — many will leave a "gap" that you\'ll need to cover with loans or out-of-pocket payments.',
      },
      {
        kind: 'callout',
        title: 'Pro Tip',
        text: 'Your SAI is the same for every school, but your financial need varies because each school has a different cost of attendance. A more expensive school may actually cost you less out-of-pocket if it offers better institutional aid.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'Common Misconceptions' },
      {
        kind: 'list',
        items: [
          'Your SAI is NOT what you\'ll actually pay — it\'s a starting point for aid calculations',
          'Owning a home does NOT count against you on FAFSA (but it does on the CSS Profile)',
          'Retirement accounts (401k, IRA) are NOT included in the FAFSA asset calculation',
          'Having money in a 529 college savings plan owned by a parent counts as a parent asset (lower impact than student assets)',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Understanding your SAI helps you set realistic expectations about aid. Use the Federal Student Aid Estimator at studentaid.gov to get a preview of your SAI before the FAFSA opens.',
      },
      {
        kind: 'link',
        label: 'Federal Student Aid Estimator',
        url: 'https://studentaid.gov/aid-estimator/',
        description: 'Get a preliminary estimate of your SAI and federal aid eligibility',
      },
    ],
  },
  {
    id: 'at-4',
    title: 'Quiz: Financial Aid Fundamentals',
    type: 'quiz',
    body: [
      {
        kind: 'paragraph',
        text: 'Test your knowledge of financial aid basics. This quiz covers concepts from the articles on aid types, funding sources, and the SAI calculation.',
      },
      {
        kind: 'quiz',
        questions: [
          {
            question: 'Which type of financial aid do you NOT have to pay back?',
            options: [
              'Direct Unsubsidized Loan',
              'Pell Grant',
              'Parent PLUS Loan',
              'Private student loan',
            ],
            correctIndex: 1,
            explanation: 'Grants are free money that you never have to repay. The Federal Pell Grant is the most common need-based federal grant, providing up to $7,395 per year for the 2026-2027 academic year.',
          },
          {
            question: 'What is the key advantage of a Direct Subsidized Loan over an Unsubsidized Loan?',
            options: [
              'It has a lower borrowing limit',
              'The government pays the interest while you\'re enrolled at least half-time',
              'It doesn\'t require FAFSA',
              'It can be forgiven after 5 years',
            ],
            correctIndex: 1,
            explanation: 'With subsidized loans, the federal government pays the interest that accrues while you\'re enrolled at least half-time, during grace periods, and during deferment. This can save you thousands of dollars over the life of the loan.',
          },
          {
            question: 'About 200 colleges require which additional financial aid application beyond FAFSA?',
            options: [
              'The PROFILE Plus form',
              'The CSS Profile',
              'The Institutional Need Form',
              'The College Financial Statement',
            ],
            correctIndex: 1,
            explanation: 'The CSS Profile, administered by College Board, is required by approximately 200 colleges (mostly private institutions) to determine institutional financial aid. It asks for more detailed financial information than FAFSA.',
          },
          {
            question: 'The Student Aid Index (SAI) replaced which older term?',
            options: [
              'Financial Need Assessment (FNA)',
              'Expected Family Contribution (EFC)',
              'Cost of Attendance Index (CAI)',
              'Federal Aid Calculation (FAC)',
            ],
            correctIndex: 1,
            explanation: 'The FAFSA Simplification Act renamed the EFC to the Student Aid Index (SAI) starting with the 2024-2025 cycle. Unlike the old EFC, the SAI can be negative (as low as -1,500), potentially qualifying students for additional aid.',
          },
          {
            question: 'Why is Federal Work-Study often financially smarter than a regular part-time job?',
            options: [
              'Work-study pays a higher hourly wage',
              'Work-study earnings aren\'t counted against you on next year\'s FAFSA',
              'Work-study hours are unlimited',
              'Work-study jobs don\'t require tax filing',
            ],
            correctIndex: 1,
            explanation: 'Work-study earnings are excluded from the income calculation on your next FAFSA, meaning they won\'t reduce your financial aid eligibility for the following year. Regular job income, on the other hand, is factored into the SAI formula.',
          },
          {
            question: 'Your financial need at a specific college is calculated as:',
            options: [
              'Family Income minus Tuition',
              'Cost of Attendance minus Student Aid Index',
              'Total Grants minus Total Loans',
              'Tuition minus Expected Family Contribution',
            ],
            correctIndex: 1,
            explanation: 'Financial need = Cost of Attendance (COA) - Student Aid Index (SAI). Since COA varies by school, your demonstrated need is different at each college, even though your SAI stays the same.',
          },
        ],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
     SECTION 2: FAFSA Preparation
     ───────────────────────────────────────────────────────────── */
  {
    id: 'fp-1',
    title: 'What is FAFSA and Why Every Student Should File',
    type: 'article',
    body: [
      { kind: 'heading', text: 'FAFSA: Your Gateway to Financial Aid' },
      {
        kind: 'paragraph',
        text: 'The Free Application for Federal Student Aid (FAFSA) is a form you fill out every year to apply for financial aid from the federal government, your state, and most colleges. Filing FAFSA is free and is the single most important step in the financial aid process. Without it, you\'re leaving money on the table — potentially tens of thousands of dollars over four years.',
      },
      {
        kind: 'callout',
        title: 'Surprising Stat',
        text: 'Each year, billions of dollars in federal grants and aid go unclaimed because students don\'t file FAFSA. In recent years, an estimated $3.75 billion in Pell Grant money was left on the table by students who were eligible but didn\'t apply.',
        variant: 'info',
      },
      { kind: 'heading', text: 'Why File Even If You Think You Won\'t Qualify?' },
      {
        kind: 'paragraph',
        text: 'Many families assume their income is too high to qualify for aid. This is one of the most common — and costly — mistakes in the college process. Here\'s why you should always file:',
      },
      {
        kind: 'list',
        items: [
          'Unsubsidized federal loans are available regardless of income — FAFSA is required to access them',
          'Many state grants and institutional scholarships require FAFSA even if they\'re merit-based',
          'Financial circumstances change — job loss, medical expenses, or other events can shift your eligibility',
          'Some schools won\'t even consider you for their own institutional aid without a FAFSA on file',
          'If you ever need to appeal a financial aid offer, having FAFSA on file is essential',
        ],
      },
      { kind: 'heading', text: 'When to File' },
      {
        kind: 'paragraph',
        text: 'FAFSA opens on October 1 each year for the following academic year. For example, FAFSA for the 2027-2028 school year opens October 1, 2026. Many schools and states award aid on a first-come, first-served basis, so filing as close to October 1 as possible gives you the best shot at maximum aid.',
      },
      {
        kind: 'callout',
        title: 'Timing Matters',
        text: 'Some state aid programs run out of money within weeks of FAFSA opening. California\'s Cal Grant application deadline is March 2, and some states have deadlines as early as January. File early!',
        variant: 'warning',
      },
      { kind: 'heading', text: 'What Happens After You File' },
      {
        kind: 'paragraph',
        text: 'After you submit FAFSA, your information is processed and sent to every college you listed on the form (you can list up to 20 schools). Each school will then create a financial aid offer for you based on your SAI and their own institutional policies. You\'ll typically receive aid offers in March or April of your senior year, giving you time to compare before the May 1 decision deadline.',
      },
      {
        kind: 'link',
        label: 'FAFSA Application',
        url: 'https://studentaid.gov/h/apply-for-aid/fafsa',
        description: 'The official FAFSA application — always free to file',
      },
    ],
  },
  {
    id: 'fp-2',
    title: 'Documents You\'ll Need: FSA ID, Tax Returns, Bank Statements',
    type: 'resource',
    body: [
      { kind: 'heading', text: 'FAFSA Document Checklist' },
      {
        kind: 'paragraph',
        text: 'Gathering your documents before you sit down to fill out FAFSA will make the process much faster and less stressful. Most of the information comes from tax returns and financial records. The FAFSA for 2027-2028 will use 2025 tax information (two years prior to the academic year).',
      },
      {
        kind: 'callout',
        title: 'Time Saver',
        text: 'The FAFSA can import tax data directly from the IRS through the IRS Direct Data Exchange. This auto-fills most financial fields and reduces errors. You and your parent(s) will each need to consent to the data transfer using your FSA IDs.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'Required for You (the Student)' },
      {
        kind: 'checklist',
        title: 'Student Documents',
        items: [
          'FSA ID (username and password for studentaid.gov) — create this first!',
          'Social Security Number',
          'Driver\'s license number (if you have one)',
          'Your 2025 federal tax return (or W-2 forms if you worked)',
          'Records of untaxed income (child support, interest income, veterans benefits)',
          'Bank statements showing current balance of savings and checking accounts',
          'Investment records (stocks, bonds, real estate other than your home)',
          'List of colleges you\'re applying to (up to 20 school codes)',
        ],
      },
      { kind: 'heading', text: 'Required for Your Parent(s)' },
      {
        kind: 'checklist',
        title: 'Parent Documents',
        items: [
          'Parent FSA ID (each contributing parent needs their own)',
          'Parent Social Security Numbers',
          'Parent 2025 federal tax return (1040, 1040A, or 1040EZ)',
          'Parent W-2 forms and other records of income earned',
          'Records of untaxed income or benefits',
          'Current bank statements (savings, checking)',
          'Net worth of investments, businesses, and investment farms',
          'Records of child support paid or received',
        ],
      },
      {
        kind: 'callout',
        title: 'Which Parent?',
        text: 'If your parents are divorced or separated, the parent who provides more financial support (the one you lived with more in the past 12 months) reports their info on FAFSA. If that parent has remarried, the stepparent\'s information is also required.',
        variant: 'info',
      },
      { kind: 'heading', text: 'Good to Have Ready' },
      {
        kind: 'checklist',
        title: 'Additional Helpful Items',
        items: [
          'Records of any 529 plan balances',
          'Documentation of special financial circumstances (medical bills, job loss)',
          'Alien registration number (if not a U.S. citizen)',
          'Selective Service registration number (for male students 18+)',
        ],
      },
    ],
  },
  {
    id: 'fp-3',
    title: 'Create Your FSA ID',
    type: 'task',
    body: [
      { kind: 'heading', text: 'What is an FSA ID?' },
      {
        kind: 'paragraph',
        text: 'Your FSA ID is a username and password that you\'ll use to log in to Federal Student Aid websites, including the FAFSA application. It also serves as your legal electronic signature. Both you AND your parent (the one who will provide information on FAFSA) each need your own separate FSA ID.',
      },
      {
        kind: 'callout',
        title: 'Do This Now',
        text: 'FSA ID verification can take up to 3 business days because the Social Security Administration needs to verify your identity. Create your FSA IDs well before FAFSA opens on October 1 so you\'re ready to file immediately.',
        variant: 'warning',
      },
      { kind: 'heading', text: 'Step-by-Step Instructions' },
      {
        kind: 'checklist',
        title: 'Create Your FSA ID',
        items: [
          'Go to studentaid.gov and click "Create Account"',
          'Enter your full legal name (must match your Social Security records exactly)',
          'Enter your Social Security Number and date of birth',
          'Create a username and password (write these down somewhere safe!)',
          'Set up multi-factor authentication (phone or email verification)',
          'Verify your email address by clicking the link sent to you',
          'Wait for SSA verification (typically 1-3 business days)',
          'Have your parent create their own FSA ID using the same process',
        ],
      },
      {
        kind: 'link',
        label: 'Create FSA ID',
        url: 'https://studentaid.gov/fsa-id/create-account/launch',
        description: 'Official FSA ID creation page at studentaid.gov',
      },
      { kind: 'heading', text: 'Common Issues' },
      {
        kind: 'list',
        items: [
          'Name must exactly match Social Security records — no nicknames, abbreviations, or typos',
          'Only one FSA ID per Social Security Number — a parent cannot share one with a student',
          'If your parent doesn\'t have a Social Security Number, they can still complete FAFSA without an FSA ID but will need to print, sign, and mail a signature page',
          'If you forget your FSA ID, use the "Forgot Username" or "Forgot Password" recovery options',
        ],
      },
      {
        kind: 'callout',
        title: 'Security Reminder',
        text: 'Never share your FSA ID with anyone, including your school counselor. Your FSA ID is your legal signature — treat it like you would a credit card. Your parent should create and manage their own FSA ID separately.',
        variant: 'warning',
      },
    ],
  },
  {
    id: 'fp-4',
    title: 'FAFSA Filing Timeline and Deadlines by School',
    type: 'article',
    body: [
      { kind: 'heading', text: 'FAFSA Timeline for the 2027-2028 Cycle' },
      {
        kind: 'paragraph',
        text: 'Timing is everything with FAFSA. While the federal deadline is technically June 30, 2028 (the end of the academic year), state and school deadlines are much earlier — and many states distribute aid on a first-come, first-served basis. Here\'s the timeline you should follow as a student applying for fall 2027.',
      },
      { kind: 'heading', text: 'Key Dates' },
      {
        kind: 'list',
        items: [
          'October 1, 2026 — FAFSA opens. File as soon as possible.',
          'October-November 2026 — Ideal window to submit FAFSA. The earlier you file, the more aid may be available.',
          'November-February — Most state priority deadlines fall in this window. Check your state\'s specific date.',
          'March 2, 2027 — California Cal Grant deadline (based on FAFSA filing date). Many other states have March deadlines.',
          'March-April 2027 — Colleges send financial aid offer letters.',
          'May 1, 2027 — National college decision day. Compare aid packages and commit.',
          'June 30, 2028 — Absolute federal FAFSA deadline (don\'t wait this long!).',
        ],
      },
      {
        kind: 'callout',
        title: 'State Deadlines Vary Widely',
        text: 'Some states (like Illinois and North Carolina) have deadlines as early as January. Others use a first-come, first-served approach. Always check your state\'s deadline at studentaid.gov/apply-for-aid/fafsa/fafsa-deadlines.',
        variant: 'warning',
      },
      { kind: 'heading', text: 'School-Specific Priority Dates' },
      {
        kind: 'paragraph',
        text: 'Beyond state deadlines, each college may have its own FAFSA priority filing date. This is the date by which the school wants your FAFSA to maximize your institutional aid. Missing a school\'s priority date doesn\'t disqualify you, but it may mean less aid is available.',
      },
      {
        kind: 'callout',
        title: 'Action Item',
        text: 'For each school on your list, look up the financial aid page and note their FAFSA priority filing date. Add these dates to a calendar or spreadsheet. This is one of the most impactful things you can do right now.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'What If Your Tax Return Isn\'t Ready?' },
      {
        kind: 'paragraph',
        text: 'FAFSA uses prior-prior year tax data (2025 taxes for the 2027-2028 cycle). Since most people file taxes by April 2026, your 2025 data should be available when FAFSA opens in October 2026. If for some reason it\'s not, you can estimate your income on FAFSA and correct it later — filing with estimates is better than not filing at all.',
      },
      {
        kind: 'link',
        label: 'FAFSA Deadlines by State',
        url: 'https://studentaid.gov/apply-for-aid/fafsa/fafsa-deadlines',
        description: 'Check your state\'s specific FAFSA deadline',
      },
    ],
  },
  {
    id: 'fp-5',
    title: 'CSS Profile: Who Needs It and How It Differs',
    type: 'article',
    body: [
      { kind: 'heading', text: 'What is the CSS Profile?' },
      {
        kind: 'paragraph',
        text: 'The CSS Profile (College Scholarship Service Profile) is a financial aid application administered by the College Board. While FAFSA is used by nearly all colleges for federal aid, about 200 colleges — mostly selective private institutions — also require the CSS Profile to award their own institutional aid. If any school on your list requires it, this form is not optional.',
      },
      { kind: 'heading', text: 'How CSS Profile Differs from FAFSA' },
      {
        kind: 'list',
        items: [
          'CSS Profile costs $25 for the first school and $16 for each additional school (fee waivers available for low-income families)',
          'It asks about home equity, which FAFSA ignores — this can significantly affect your institutional aid',
          'It considers both parents\' finances for divorced/separated families (FAFSA only requires the custodial parent)',
          'It asks about medical expenses, private school tuition for siblings, and other detailed costs',
          'It opens October 1 (same as FAFSA) but some schools have earlier priority deadlines',
        ],
      },
      {
        kind: 'callout',
        title: 'Who Needs It?',
        text: 'Schools like Stanford, USC, MIT, Yale, Georgetown, Emory, and many other private universities require the CSS Profile. Check each school\'s financial aid page — if they mention "CSS Profile," you must complete it in addition to FAFSA.',
        variant: 'info',
      },
      { kind: 'heading', text: 'Completing the CSS Profile' },
      {
        kind: 'paragraph',
        text: 'The CSS Profile is more detailed than FAFSA and typically takes 1-2 hours to complete. It\'s done through the College Board website (not studentaid.gov). Some colleges add their own custom questions to the form, so you may see different questions depending on which schools you include.',
      },
      {
        kind: 'callout',
        title: 'Timing Tip',
        text: 'If any of your Early Action or Early Decision schools require the CSS Profile, check their deadline carefully — it may be as early as November 1 (the same as the EA/ED application deadline). Don\'t wait until the regular deadline.',
        variant: 'warning',
      },
      { kind: 'heading', text: 'CSS Profile Fee Waivers' },
      {
        kind: 'paragraph',
        text: 'If your family\'s income is $100,000 or less, you may qualify for a CSS Profile fee waiver that covers the cost for up to 8 colleges. The fee waiver is automatically applied when you start the CSS Profile if you\'re eligible.',
      },
      {
        kind: 'link',
        label: 'CSS Profile Application',
        url: 'https://cssprofile.collegeboard.org/',
        description: 'Apply for the CSS Profile through College Board',
      },
      {
        kind: 'link',
        label: 'Schools Requiring CSS Profile',
        url: 'https://cssprofile.collegeboard.org/institutions-background',
        description: 'Full list of colleges and programs that require the CSS Profile',
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
     SECTION 3: Scholarships 101 — its own tab, in the content team's
     reading order (Edvifi Content, 2026-10-30)
     ───────────────────────────────────────────────────────────── */
  {
    id: 'sr-5',
    title: 'Understanding Scholarships: Types, Eligibility, and How They Work',
    type: 'article',
    body: [
      { kind: 'heading', text: 'What Is a Scholarship?' },
      {
        kind: 'paragraph',
        text: 'College can be expensive, but you don\'t necessarily have to pay for everything yourself. Scholarships are one of the best ways to make college more affordable because **they provide money for your education that you generally don\'t have to pay back.**',
      },
      {
        kind: 'paragraph',
        text: 'Unlike student loans, scholarships don\'t leave you with debt after graduation. Some scholarships cover a few hundred dollars, while others can pay for your entire tuition, housing, and other college expenses.',
      },
      {
        kind: 'paragraph',
        text: 'And here\'s something important: **You don\'t need perfect grades or an impressive résumé to qualify for scholarships.** There are scholarships for students with different academic abilities, financial circumstances, interests, backgrounds, and career goals.',
      },
      {
        kind: 'paragraph',
        text: 'The key is understanding what kinds of scholarships are available and which ones might be right for you.',
      },
      { kind: 'heading', text: 'Scholarships, Grants, and Loans: What\'s the Difference?' },
      {
        kind: 'paragraph',
        text: 'When researching how to pay for college, you\'ll come across several types of financial aid. They might sound similar, but they work differently.',
      },
      {
        kind: 'table',
        head: ['Type of Aid', 'What It Means', 'Do You Pay It Back?'],
        rows: [
          ['Scholarships', 'Money awarded based on financial need, academic achievement, interests, background, or other criteria', 'Usually no'],
          ['Grants', 'Financial aid often awarded based on financial need, such as the federal Pell Grant', 'Usually no'],
          ['Student Loans', 'Money you borrow to pay for college', 'Yes, generally with interest'],
          ['Work-Study', 'Money you earn through an eligible part-time job while attending college', 'No, because it\'s earned income'],
        ],
      },
      {
        kind: 'callout',
        title: 'Edvifi Tip: Start With Free Money',
        text: 'Before considering student loans, explore scholarships and grants. They can reduce how much you need to borrow and how much you\'ll owe after graduation. Remember that completing the FAFSA is one of the most important steps in accessing financial aid, including federal grants and certain scholarships offered by colleges.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'The Different Types of Scholarships' },
      {
        kind: 'paragraph',
        text: 'Not all scholarships work the same way. Understanding the different categories can help you find opportunities that match your circumstances.',
      },
      { kind: 'heading', level: 3, text: '1. Need-Based Scholarships' },
      {
        kind: 'paragraph',
        text: 'These scholarships are intended for students who demonstrate financial need.',
      },
      {
        kind: 'paragraph',
        text: 'Eligibility may depend on your family\'s income, household circumstances, or other financial information. Some scholarships require you to complete the FAFSA or submit additional financial documents.',
      },
      {
        kind: 'paragraph',
        text: 'You don\'t necessarily have to come from a very low-income household to qualify. Different programs have different eligibility standards.',
      },
      { kind: 'heading', level: 3, text: '2. Merit-Based Scholarships' },
      {
        kind: 'paragraph',
        text: 'Merit scholarships recognize achievements, talents, or accomplishments.',
      },
      {
        kind: 'paragraph',
        text: 'These can include:',
      },
      {
        kind: 'list',
        items: [
          'Academic performance or GPA',
          'Leadership and community service',
          'Artistic or musical talent',
          'Athletic achievement',
          'Accomplishments in specific subjects or activities',
        ],
      },
      {
        kind: 'paragraph',
        text: 'While some merit scholarships are highly competitive, others have more accessible requirements.',
      },
      { kind: 'heading', level: 3, text: '3. Identity, Background, and Interest-Based Scholarships' },
      {
        kind: 'paragraph',
        text: 'Many organizations offer scholarships to support students with particular backgrounds, experiences, interests, or career goals.',
      },
      {
        kind: 'paragraph',
        text: 'For example, scholarships may be available for:',
      },
      {
        kind: 'list',
        items: [
          'First-generation college students',
          'Students pursuing specific majors or careers',
          'Students from particular communities or geographic areas',
          'Students with disabilities',
          'Students involved in community service or leadership',
          'Children of employees of certain companies or organizations',
        ],
      },
      {
        kind: 'paragraph',
        text: 'You may qualify for scholarships based on experiences or interests you haven\'t considered particularly unusual.',
      },
      {
        kind: 'paragraph',
        text: '**Remember:** You can qualify for multiple categories of scholarships at the same time. For example, you might be eligible for a need-based scholarship, a local community scholarship, and a scholarship related to your intended major.',
      },
      { kind: 'heading', text: 'Where Does Scholarship Money Come From?' },
      {
        kind: 'paragraph',
        text: 'Scholarships can come from several different sources, and knowing where to look is just as important as knowing what you qualify for.',
      },
      { kind: 'heading', level: 3, text: 'Scholarships From Colleges' },
      {
        kind: 'paragraph',
        text: 'Many colleges offer scholarships directly to their students. These are called *institutional scholarships*.',
      },
      {
        kind: 'paragraph',
        text: 'Some colleges automatically consider students for certain scholarships when they apply for admission. Others require separate scholarship applications, essays, interviews, or earlier application deadlines.',
      },
      {
        kind: 'paragraph',
        text: 'Colleges may offer scholarships based on academic achievement, financial need, leadership, intended major, or other qualifications.',
      },
      {
        kind: 'paragraph',
        text: '**Important:** Don\'t assume that submitting your college application automatically qualifies you for every scholarship the school offers. Always check the college\'s financial aid and scholarship website for additional requirements.',
      },
      { kind: 'heading', level: 3, text: 'State and Local Scholarships' },
      {
        kind: 'paragraph',
        text: 'State governments, community foundations, school districts, local businesses, and civic organizations may offer scholarships to students in their communities.',
      },
      {
        kind: 'paragraph',
        text: 'Some are available only to residents of a particular state, county, or school district.',
      },
      {
        kind: 'paragraph',
        text: 'Because these scholarships may have smaller applicant pools than major national programs, they can be worth prioritizing.',
      },
      { kind: 'heading', level: 3, text: 'National and Private Scholarships' },
      {
        kind: 'paragraph',
        text: 'National scholarships are offered by foundations, nonprofits, corporations, and other organizations.',
      },
      {
        kind: 'paragraph',
        text: 'Some are open to students across the country, while others target particular academic interests, backgrounds, or career paths.',
      },
      {
        kind: 'paragraph',
        text: 'National scholarships can offer substantial funding, but some are also highly competitive.',
      },
      {
        kind: 'paragraph',
        text: 'A strong scholarship strategy includes exploring opportunities from multiple sources rather than focusing exclusively on one category.',
      },
      { kind: 'heading', text: 'One-Time vs. Renewable Scholarships' },
      {
        kind: 'paragraph',
        text: 'When comparing scholarships, don\'t just look at the amount advertised. Pay attention to **how often you\'ll receive the money**.',
      },
      {
        kind: 'paragraph',
        text: 'Some scholarships provide a one-time payment. Others are renewable, meaning you can receive funding for multiple years if you continue meeting the requirements.',
      },
      {
        kind: 'paragraph',
        text: 'For example:',
      },
      {
        kind: 'table',
        head: ['', 'Scholarship A', 'Scholarship B'],
        rows: [
          ['Award amount', '$5,000', '$2,000 per year'],
          ['Duration', 'One year', 'Up to four years'],
          ['Total potential value', '$5,000', '$8,000'],
          ['Renewal requirements', 'None', 'Maintain required GPA'],
        ],
      },
      {
        kind: 'paragraph',
        text: 'Even though Scholarship A offers more money initially, Scholarship B could provide more funding over the course of college.',
      },
      {
        kind: 'paragraph',
        text: 'Renewable scholarships may require you to maintain a minimum GPA, enroll full-time, continue in a particular major, or meet other conditions.',
      },
      {
        kind: 'paragraph',
        text: 'Before accepting an award, make sure you understand its requirements.',
      },
      { kind: 'heading', text: 'Can You Receive More Than One Scholarship?' },
      {
        kind: 'paragraph',
        text: '**Yes!** Students can often receive multiple scholarships from different organizations.',
      },
      {
        kind: 'paragraph',
        text: 'For example, you might receive:',
      },
      {
        kind: 'list',
        items: [
          'A $3,000 scholarship from your college',
          'A $1,500 scholarship from a local community foundation',
          'A $2,000 scholarship from a national organization',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Together, that\'s $6,500 in scholarship awards.',
      },
      {
        kind: 'paragraph',
        text: 'However, there\'s an important detail: receiving an outside scholarship can sometimes affect the financial aid your college offers.',
      },
      {
        kind: 'paragraph',
        text: 'Colleges generally have to account for outside scholarships when determining your total financial aid package. Depending on the school\'s policies and your existing aid, an outside scholarship might reduce your remaining costs, replace some loans or work-study, or reduce certain institutional grants.',
      },
      {
        kind: 'callout',
        title: 'Edvifi Tip: Check Before You Count',
        text: 'If you receive an outside scholarship, contact your college\'s financial aid office and ask how it will affect your financial aid package. Don\'t assume every additional scholarship will reduce your college bill by the full award amount.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'What Can Scholarships Pay For?' },
      {
        kind: 'paragraph',
        text: 'Scholarships aren\'t always limited to tuition.',
      },
      {
        kind: 'paragraph',
        text: 'Depending on the scholarship\'s rules, funds may be used for:',
      },
      {
        kind: 'list',
        items: [
          'Tuition and required fees',
          'Textbooks and course materials',
          'Housing and meals',
          'Computers and other educational supplies',
          'Other eligible education-related expenses',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Some scholarships send money directly to your college, while others pay students or reimburse approved expenses.',
      },
      {
        kind: 'paragraph',
        text: 'Always check how the scholarship can be used. Certain awards are restricted to tuition or specific educational costs, and some scholarship funds may have tax implications depending on how they\'re used.',
      },
      { kind: 'heading', text: 'Your Next Step: Start Finding Scholarships' },
      {
        kind: 'paragraph',
        text: 'Now that you understand how scholarships work, you\'re ready to start looking for opportunities that fit your goals and circumstances.',
      },
      {
        kind: 'paragraph',
        text: 'You don\'t have to qualify for every scholarship, and you don\'t have to apply to hundreds of them.',
      },
      {
        kind: 'paragraph',
        text: 'The goal is to find scholarships you\'re genuinely eligible for, understand what they\'re worth, and build a manageable application plan.',
      },
      {
        kind: 'callout',
        title: 'Up Next: How to Find Scholarships You Actually Qualify For',
        text: 'You\'ll learn where to search, how to identify scholarships that match your background and interests, and how to avoid wasting time on opportunities that aren\'t right for you.',
        variant: 'info',
      },
    ],
  },
  {
    id: 'sr-1',
    title: 'How to Find Scholarships You Actually Qualify For',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Cutting Through the Noise' },
      {
        kind: 'paragraph',
        text: 'There are thousands of scholarships available to help students pay for college. But with so many opportunities, finding the right ones can feel overwhelming.',
      },
      {
        kind: 'paragraph',
        text: 'Here\'s the good news: **You don\'t need to apply to every scholarship you find.** The key is identifying opportunities that match your background, interests, achievements, and goals.',
      },
      {
        kind: 'paragraph',
        text: 'Instead of spending hours applying to scholarships you might not qualify for, focus on finding ones where you meet the requirements and can put together a strong application.',
      },
      {
        kind: 'paragraph',
        text: 'A targeted approach can save you time and help you make the most of your scholarship search.',
      },
      { kind: 'heading', text: 'Start With What Makes You Unique' },
      {
        kind: 'paragraph',
        text: 'Scholarships aren\'t just for students with perfect grades or impressive extracurricular activities. Many organizations offer scholarships to students based on their experiences, interests, and circumstances.',
      },
      {
        kind: 'paragraph',
        text: 'Before you start searching, think about what makes you eligible for different opportunities:',
      },
      {
        kind: 'list',
        items: [
          '**Where you live:** Your state, county, city, or school district.',
          '**Your academic interests:** Your intended college major, favorite subjects, or career goals.',
          '**Your activities and experiences:** Extracurriculars, volunteering, community service, leadership, hobbies, or part-time jobs.',
          '**Your background:** First-generation college status, cultural background, or other characteristics relevant to eligibility.',
          '**Your financial circumstances:** Some scholarships are specifically intended for students from low-income or financially disadvantaged households.',
          '**Your family\'s connections:** Your parents\' or guardians\' employers, labor unions, military service, or professional organizations.',
          '**Your community affiliations:** Religious, cultural, or community organizations you belong to.',
          '**Other circumstances:** Disabilities, health conditions, caregiving responsibilities, or other life experiences.',
        ],
      },
      {
        kind: 'callout',
        title: 'Edvifi Tip: Think Beyond Your GPA',
        text: 'You might qualify for scholarships based on experiences you haven\'t considered particularly special. For example, working a part-time job to support your family, volunteering at a local organization, or being the first in your family to attend college could make you eligible for certain scholarships.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'Where to Search' },
      {
        kind: 'paragraph',
        text: 'You don\'t have to figure out where to look on your own. Here are some of the best places to start:',
      },
      {
        kind: 'list',
        items: [
          '**Your prospective colleges:** Visit each college\'s financial aid and scholarship website. Some scholarships are awarded automatically, while others require separate applications.',
          '**Your school counselor:** Counselors often maintain lists of local scholarships, including opportunities specifically for students at your high school.',
          '**Scholarship search engines:** Websites like Fastweb, Scholarships.com, Bold.org, and College Board\'s scholarship search tools can help you discover opportunities.',
          '**Your state\'s higher education agency:** Many states offer scholarships and grants for eligible residents.',
          '**Community foundations:** Search "[your county] community foundation scholarships" to find opportunities in your area.',
          '**Local organizations and businesses:** Rotary Clubs, Lions Clubs, banks, community groups, and other organizations may offer scholarships.',
          '**Professional associations:** Organizations connected to fields like engineering, healthcare, education, or public service sometimes fund scholarships for future professionals.',
          '**Your family\'s employers or unions:** Some employers and labor organizations offer scholarships for employees\' children or dependents.',
        ],
      },
      {
        kind: 'callout',
        title: 'Edvifi Tip: Start With Your College List',
        text: 'Before spending hours searching national scholarship websites, check the scholarships offered by colleges you\'re already planning to apply to. Some schools have important priority deadlines or separate scholarship applications. Missing those deadlines could mean missing out on significant financial aid.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'Check Whether You Actually Qualify' },
      {
        kind: 'paragraph',
        text: 'Finding a scholarship that sounds interesting is only the first step. Before spending time on an application, make sure you meet its eligibility requirements.',
      },
      {
        kind: 'paragraph',
        text: 'Pay attention to:',
      },
      {
        kind: 'list',
        items: [
          '**Grade level:** Is the scholarship open to high school seniors, current college students, or both?',
          '**GPA:** Does it require a minimum GPA?',
          '**Location:** Do you need to live in a particular state, county, or school district?',
          '**Financial need:** Does the scholarship have income requirements or require financial documentation?',
          '**Academic interests:** Do you need to pursue a specific major or career?',
          '**Other requirements:** Does the scholarship require community service, particular activities, or other qualifications?',
          '**Deadline:** Is the scholarship still accepting applications?',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Some scholarships also require you to attend a specific college or maintain certain qualifications after receiving the award.',
      },
      { kind: 'heading', level: 3, text: 'Before You Apply' },
      {
        kind: 'paragraph',
        text: 'Ask yourself three questions:',
      },
      {
        kind: 'list', ordered: true,
        items: [
          'Do I meet all the required eligibility criteria?',
          'Can I complete the application before the deadline?',
          'Is this scholarship worth the time and effort required to apply?',
        ],
      },
      {
        kind: 'paragraph',
        text: 'If the answer to all three is yes, it may be a good opportunity to add to your scholarship tracker.',
      },
      { kind: 'heading', text: 'Don\'t Overlook Smaller Scholarships' },
      {
        kind: 'paragraph',
        text: 'It\'s easy to get excited about scholarships offering $10,000, $20,000, or even a full ride. But smaller scholarships can be valuable too.',
      },
      {
        kind: 'paragraph',
        text: 'Local and specialized scholarships sometimes attract fewer applicants than major national awards, which may improve your chances of receiving funding.',
      },
      {
        kind: 'paragraph',
        text: 'For example, imagine two scholarships:',
      },
      {
        kind: 'list',
        items: [
          '**Scholarship A:** $10,000 award with 10,000 applicants.',
          '**Scholarship B:** $1,000 award with 50 applicants.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Although Scholarship A offers more money, Scholarship B has a much smaller applicant pool. That doesn\'t guarantee better odds, since the number of awards and selection criteria also matter, but it illustrates why smaller opportunities deserve attention.',
      },
      {
        kind: 'paragraph',
        text: 'And remember: **Scholarship money adds up.** Winning several smaller scholarships can make a meaningful difference in your college expenses.',
      },
      { kind: 'heading', text: 'Red Flags to Watch For' },
      {
        kind: 'paragraph',
        text: 'Unfortunately, scholarship scams exist. Be cautious when researching opportunities online.',
      },
      {
        kind: 'paragraph',
        text: 'Watch out for:',
      },
      {
        kind: 'list',
        items: [
          '**Application fees:** Be suspicious of scholarship programs that require you to pay money to apply or claim an award.',
          '**Guaranteed awards:** No legitimate competitive scholarship can promise you\'ll win before evaluating your application.',
          '**Requests for sensitive financial information:** Be careful about sharing bank account details, credit card information, or Social Security numbers through unfamiliar websites.',
          '**Upfront tax payments:** A scholarship provider should not demand that you pay taxes or processing fees upfront to receive your award.',
          '**Unclear organizations:** If you can\'t identify who funds the scholarship or find reliable information about the organization, investigate before applying.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Some legitimate scholarship programs request sensitive information for eligibility verification or award administration. Always confirm that you\'re communicating through the organization\'s official website or verified channels.',
      },
      {
        kind: 'callout',
        title: 'Edvifi Tip: Verify Before You Apply',
        text: 'If a scholarship seems suspicious, ask your school counselor for help or research the organization offering it. Never feel pressured to send money or sensitive personal information to claim a scholarship.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'Your Next Step: Start Building Your Scholarship List' },
      {
        kind: 'paragraph',
        text: 'Now that you know where to search and how to evaluate eligibility, it\'s time to put those strategies into practice.',
      },
      {
        kind: 'paragraph',
        text: 'You don\'t need to find dozens of scholarships all at once. Start with a few opportunities that genuinely match your qualifications.',
      },
      {
        kind: 'paragraph',
        text: 'As you discover scholarships, save them in Aid Tracker so you can keep track of deadlines, application requirements, and next steps.',
      },
      {
        kind: 'callout',
        title: 'Up Next: Local vs. National Scholarships: Where to Start',
        text: 'Learn how to balance local, specialized, and national scholarship opportunities to build a scholarship list that works for you.',
        variant: 'info',
      },
    ],
  },
  {
    id: 'sr-3',
    title: 'Local vs. National Scholarships: Where to Start',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Case for Starting Local' },
      {
        kind: 'paragraph',
        text: 'When most people think about scholarships, they picture big national programs like the Gates Scholarship or Coca-Cola Scholars. These scholarships can offer substantial financial support, but they also attract applicants from across the country, making them highly competitive.',
      },
      {
        kind: 'paragraph',
        text: 'Local scholarships can offer a different kind of opportunity.',
      },
      {
        kind: 'paragraph',
        text: 'Community foundations, local businesses, civic organizations, and school districts often provide scholarships specifically for students in their communities. Because fewer students may be eligible to apply, these scholarships sometimes have smaller applicant pools than major national programs.',
      },
      {
        kind: 'paragraph',
        text: 'And here\'s something worth remembering: **You don\'t need to win one enormous scholarship to make a difference in your college costs.**',
      },
      {
        kind: 'paragraph',
        text: 'For example, winning five $1,000 scholarships would give you $5,000 toward college expenses. That\'s money you may not have to borrow or pay out of pocket, depending on how your college applies outside scholarships to your financial aid package.',
      },
      {
        kind: 'paragraph',
        text: 'Smaller scholarships can add up, so don\'t overlook them just because the award amounts seem modest.',
      },
      {
        kind: 'callout',
        title: 'Edvifi Tip: Smaller Doesn\'t Mean Less Valuable',
        text: 'A $1,000 scholarship with a straightforward application might be worth prioritizing over a $10,000 scholarship requiring multiple essays, interviews, and recommendations. Consider how well you meet the requirements, how competitive the scholarship is, and how much time you\'ll need to apply—not just the award amount.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'Where to Find Local Scholarships' },
      {
        kind: 'paragraph',
        text: 'You might be surprised by how many scholarship opportunities exist in your own community.',
      },
      {
        kind: 'paragraph',
        text: 'Some good places to start include:',
      },
      {
        kind: 'list',
        items: [
          '**Your high school counseling office:** Counselors often maintain lists of scholarships specifically for students at your school or in your district.',
          '**Community foundations:** Search "[your county] community foundation scholarships" to find organizations offering scholarships to local students.',
          '**Civic organizations:** Rotary Clubs, Kiwanis, Lions Clubs, Elks Lodges, and similar organizations sometimes sponsor scholarships.',
          '**Local businesses:** Banks, law firms, medical practices, and other businesses may offer scholarships to students in their communities.',
          '**Your parents\' or guardians\' employers:** Some companies and labor unions offer scholarships for employees\' children or dependents.',
          '**Religious and community organizations:** Churches, mosques, synagogues, temples, and cultural organizations may offer scholarships to eligible students.',
          '**Your school district or PTA:** Some districts and parent-teacher organizations provide scholarships for graduating seniors.',
          '**Local newspapers and community websites:** These may advertise scholarship opportunities that aren\'t listed on major scholarship search engines.',
        ],
      },
      {
        kind: 'paragraph',
        text: '**Try This:** Search for scholarships using your city, county, or school district alongside terms like "high school senior scholarship" or "community foundation scholarship."',
      },
      {
        kind: 'paragraph',
        text: 'You may discover opportunities that students searching only national scholarship websites would miss.',
      },
      { kind: 'heading', text: 'When National Scholarships Make Sense' },
      {
        kind: 'paragraph',
        text: 'National scholarships are absolutely worth exploring, especially when you meet their eligibility requirements and have a strong application.',
      },
      {
        kind: 'paragraph',
        text: 'Some national programs offer awards that cover a significant portion of college expenses. Others provide smaller amounts but are designed for students with particular interests, backgrounds, or career goals.',
      },
      {
        kind: 'paragraph',
        text: 'The key is to be selective.',
      },
      {
        kind: 'paragraph',
        text: 'Prioritize national scholarships that:',
      },
      {
        kind: 'list',
        items: [
          '**Match your background or experiences:** Look for scholarships designed for students with qualifications or experiences that align with yours.',
          '**Connect to your interests or goals:** Scholarships focused on STEM, the arts, education, healthcare, public service, or other fields may be a good fit.',
          '**Have specific eligibility requirements:** Specialized scholarships may attract a narrower applicant pool than programs open to nearly everyone.',
          '**Offer meaningful financial support:** Consider the award amount, whether it\'s renewable, and how it could affect your college costs.',
          '**Fit your schedule:** Make sure you have enough time to complete a strong application before the deadline.',
        ],
      },
      {
        kind: 'callout',
        title: 'Edvifi Tip: Make Your Work Go Further',
        text: 'Many scholarship applications ask similar questions about your goals, accomplishments, challenges, or community involvement. You can often reuse ideas or adapt essays from previous applications. Just make sure each response answers the specific prompt and reflects what that scholarship organization is looking for.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'How to Decide Which Scholarships to Prioritize' },
      {
        kind: 'paragraph',
        text: 'Not every scholarship deserves the same amount of your time.',
      },
      {
        kind: 'paragraph',
        text: 'When comparing opportunities, consider these four factors:',
      },
      {
        kind: 'table',
        head: ['Factor', 'Questions to Ask'],
        rows: [
          ['Eligibility', 'Do I meet all the requirements?'],
          ['Award Value', 'How much funding could I receive? Is it renewable?'],
          ['Application Effort', 'How much time will the essays, recommendations, and other requirements take?'],
          ['Competitiveness', 'How selective is the scholarship, and how well do I match its criteria?'],
        ],
      },
      {
        kind: 'paragraph',
        text: 'For example, imagine you\'re considering two scholarships:',
      },
      { kind: 'heading', level: 3, text: 'Scholarship A: National Leadership Scholarship' },
      {
        kind: 'list',
        items: [
          'Award: $10,000',
          'Open to students nationwide',
          'Requires three essays and two recommendation letters',
          'Highly competitive',
        ],
      },
      { kind: 'heading', level: 3, text: 'Scholarship B: Local Community Service Scholarship' },
      {
        kind: 'list',
        items: [
          'Award: $1,500',
          'Open to graduating seniors in your county',
          'Requires one short essay',
          'Prioritizes students with community service experience',
        ],
      },
      {
        kind: 'paragraph',
        text: 'If you\'ve volunteered regularly in your community, Scholarship B might be an especially good opportunity. You meet its focus, the application is manageable, and the applicant pool may be smaller.',
      },
      {
        kind: 'paragraph',
        text: 'That doesn\'t mean you should skip Scholarship A. It means you should think strategically about where to invest your time.',
      },
      { kind: 'heading', text: 'The Ideal Strategy: Build a Balanced Scholarship List' },
      {
        kind: 'paragraph',
        text: 'You don\'t have to choose between local and national scholarships. A strong scholarship list can include both.',
      },
      {
        kind: 'paragraph',
        text: 'Consider building your list around three categories:',
      },
      {
        kind: 'list',
        items: [
          '**Local scholarships:** Opportunities available through your school, community, or region. These may have smaller applicant pools and more specific eligibility requirements.',
          '**Specialized scholarships:** Opportunities that closely match your background, interests, achievements, or intended career.',
          '**National scholarships:** Larger or more competitive programs that offer meaningful funding and align with your qualifications.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'There\'s no perfect number of scholarships to apply for in each category. What matters most is finding opportunities you\'re eligible for and can realistically complete.',
      },
      {
        kind: 'callout',
        title: 'Remember: Quality Matters More Than Quantity',
        text: 'Applying to dozens of scholarships without checking eligibility or putting effort into your applications isn\'t necessarily better than submitting a smaller number of thoughtful, well-prepared applications. Start with opportunities that are a strong fit, then expand your list as time allows.',
        variant: 'info',
      },
      { kind: 'heading', text: 'Your Next Step: Build Your Scholarship Tracker' },
      {
        kind: 'paragraph',
        text: 'Now that you know how to balance local and national opportunities, it\'s time to organize your scholarship search.',
      },
      {
        kind: 'paragraph',
        text: 'Start by identifying a few scholarships that match your qualifications. Pay attention to their deadlines, award amounts, and application requirements.',
      },
      {
        kind: 'paragraph',
        text: 'Use Aid Tracker to save the opportunities you\'re interested in and keep track of your progress.',
      },
      {
        kind: 'callout',
        title: 'Up Next: Build Your Scholarship Tracker',
        text: 'You\'ll create an organized list of scholarships, track important deadlines, and start developing a plan for your applications.',
        variant: 'info',
      },
    ],
  },
  {
    id: 'sr-2',
    title: 'Build Your Scholarship Tracker',
    type: 'assignment',
    body: [
      { kind: 'heading', text: 'Assignment: Create Your Scholarship Tracking System' },
      {
        kind: 'paragraph',
        text: 'Finding scholarships is only the beginning. Between different deadlines, eligibility requirements, essays, and application materials, it\'s easy to lose track of opportunities.',
      },
      {
        kind: 'paragraph',
        text: 'That\'s why having a scholarship tracker is so important.',
      },
      {
        kind: 'paragraph',
        text: 'In this assignment, you\'ll start building your own scholarship list in Aid Tracker. By the end, you\'ll have an organized list of opportunities you qualify for and a clear idea of what to do next.',
      },
      {
        kind: 'callout',
        title: 'Good News: Edvifi Makes It Easy!',
        text: 'You don\'t need to create a spreadsheet or keep track of everything yourself. Head to the **Aid Tracker** tab to save scholarships from Edvifi\'s database or add opportunities you\'ve found elsewhere.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'Step 1: Find and Save 5 Scholarships' },
      {
        kind: 'paragraph',
        text: 'Using the strategies you\'ve learned in the previous articles, find at least **5 scholarships you qualify for**.',
      },
      {
        kind: 'paragraph',
        text: 'Try to include a mix of opportunities:',
      },
      {
        kind: 'list',
        items: [
          '**Local scholarships:** Offered by your school, community foundations, local businesses, or other organizations in your area.',
          '**Specialized scholarships:** Opportunities matching your background, interests, experiences, or intended major.',
          '**National scholarships:** Programs open to students across the country that match your qualifications.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'You don\'t need a specific number from each category. Focus on finding scholarships you\'re eligible for and genuinely interested in applying to.',
      },
      {
        kind: 'callout',
        title: 'Edvifi Tip: Start With What You Know',
        text: 'Check your school counselor\'s scholarship list, your prospective colleges\' websites, and Edvifi\'s Scholarship Engine tab. Don\'t worry about finding the perfect scholarships right away. You\'ll continue expanding and refining your list as you go.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'Step 2: Review and Organize Your Scholarships' },
      {
        kind: 'paragraph',
        text: 'Once you\'ve found five opportunities, make sure each one has the information you\'ll need to plan your applications.',
      },
      {
        kind: 'paragraph',
        text: 'For each scholarship, check that you\'ve recorded:',
      },
      {
        kind: 'list',
        items: [
          '**Scholarship name and organization:** Who is offering the award?',
          '**Award amount:** How much money could you receive? Is it renewable?',
          '**Application deadline:** When do you need to submit your application?',
          '**Eligibility requirements:** Do you meet the GPA, location, grade level, or other requirements?',
          '**Application materials:** Do you need essays, transcripts, recommendation letters, or other documents?',
          '**Application status:** Are you researching, preparing, or ready to submit?',
          '**Notes:** Any questions, essay ideas, or important details to remember.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'If you saved a scholarship directly from Edvifi\'s database, some of this information may already be filled in. Review it against the scholarship provider\'s official website to make sure it\'s accurate and up to date.',
      },
      { kind: 'heading', text: 'Step 3: Prioritize Your Opportunities' },
      {
        kind: 'paragraph',
        text: 'Now that you\'ve started your list, it\'s time to decide which scholarships deserve your attention first.',
      },
      {
        kind: 'paragraph',
        text: 'Review your five scholarships and ask yourself:',
      },
      {
        kind: 'list', ordered: true,
        items: [
          '**Which deadlines are coming up soon?** These may need your immediate attention.',
          '**Which scholarships are the strongest match for my qualifications?** Consider your eligibility, interests, and experiences.',
          '**Which applications will take the most time?** Scholarships requiring essays or recommendation letters may need more preparation.',
          '**Which scholarships offer the most value?** Consider both the award amount and whether funding is renewable.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Use your tracker to identify the scholarships you want to prioritize.',
      },
      {
        kind: 'callout',
        title: 'Edvifi Tip: Don\'t Wait Until the Deadline',
        text: 'Aim to complete applications several days before they\'re due. This gives you time to review your materials and resolve unexpected problems. For scholarships requiring recommendation letters, try to give your recommenders at least three to four weeks\' notice.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'Step 4: Keep Your Tracker Updated' },
      {
        kind: 'paragraph',
        text: 'Your scholarship tracker isn\'t something you complete once and forget about.',
      },
      {
        kind: 'paragraph',
        text: 'As you continue your scholarship search:',
      },
      {
        kind: 'list',
        items: [
          'Add new scholarships you discover.',
          'Update your application status as you make progress.',
          'Record important deadlines and requirements.',
          'Mark applications as submitted once you\'ve applied.',
          'Record scholarship awards when you receive decisions.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Keeping your tracker updated will help you stay organized throughout senior year.',
      },
      { kind: 'heading', text: 'Assignment Checklist' },
      {
        kind: 'checklist',
        title: 'Before marking this assignment complete, make sure you\'ve:',
        items: [
          'Added at least 5 scholarships to Aid Tracker.',
          'Confirmed that you meet the eligibility requirements for each.',
          'Reviewed the deadlines and application materials.',
          'Identified which scholarships you want to prioritize.',
        ],
      },
      {
        kind: 'callout',
        title: 'Your Deliverable',
        text: 'You should now have **at least five scholarships saved in Aid Tracker**, with their deadlines, award amounts, eligibility requirements, and application materials recorded. You\'ll build on this list in the next assignment, where you\'ll identify ten scholarships to target during senior year.',
        variant: 'info',
      },
    ],
  },
  {
    id: 'sr-6',
    title: 'How to Apply for Scholarships and Improve Your Chances',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Finding Scholarships Is Just the Beginning' },
      {
        kind: 'paragraph',
        text: 'You\'ve learned how to find scholarships, identify opportunities you qualify for, and organize them in Aid Tracker. Now it\'s time to turn those opportunities into actual applications.',
      },
      {
        kind: 'paragraph',
        text: 'Applying for scholarships can feel intimidating, especially when you\'re asked to write essays, request recommendation letters, or explain why you deserve an award.',
      },
      {
        kind: 'paragraph',
        text: 'But here\'s the good news: **You don\'t have to be the most accomplished student to submit a strong scholarship application.**',
      },
      {
        kind: 'paragraph',
        text: 'Scholarship committees are often looking for students who demonstrate qualities like determination, leadership, community involvement, or a commitment to their education. What matters is understanding what each scholarship is looking for and showing how your experiences align with its goals.',
      },
      { kind: 'heading', text: 'Understand What the Scholarship Is Looking For' },
      {
        kind: 'paragraph',
        text: 'Before starting an application, take a few minutes to learn about the organization offering the scholarship.',
      },
      {
        kind: 'paragraph',
        text: 'Ask yourself:',
      },
      {
        kind: 'list',
        items: [
          '**What is the scholarship\'s purpose?** Is it intended to support students with financial need, recognize academic achievement, or encourage students to pursue a particular career?',
          '**What qualities does the organization value?** Leadership, perseverance, community service, creativity, or academic dedication?',
          '**What makes me a good fit?** Which of my experiences, accomplishments, or goals connect to the scholarship\'s mission?',
        ],
      },
      {
        kind: 'paragraph',
        text: 'For example, if a scholarship focuses on community service, your volunteer experiences may be more relevant than your GPA. If it\'s designed for future healthcare professionals, explaining why you\'re interested in healthcare could strengthen your application.',
      },
      {
        kind: 'callout',
        title: 'Edvifi Tip: Read Beyond the Requirements',
        text: 'Eligibility requirements tell you whether you *can* apply. The scholarship\'s mission and selection criteria can help you understand what makes a *strong* applicant.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'Prepare Your Application Materials' },
      {
        kind: 'paragraph',
        text: 'Different scholarships require different documents, but many ask for similar materials.',
      },
      {
        kind: 'paragraph',
        text: 'Common requirements include:',
      },
      {
        kind: 'list',
        items: [
          '**Academic transcripts:** A record of your grades and courses, usually available through your high school.',
          '**Essays or personal statements:** Written responses about your experiences, goals, accomplishments, or challenges.',
          '**Recommendation letters:** Letters from teachers, counselors, employers, or community members who can speak to your character and abilities.',
          '**Activity lists or résumés:** Summaries of your extracurricular activities, jobs, volunteer work, and leadership experiences.',
          '**Financial information:** Some need-based scholarships request information about your household income or financial circumstances.',
          '**Proof of eligibility:** Certain scholarships may request documentation confirming residency, enrollment, or other requirements.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'You won\'t need all these materials for every application.',
      },
      {
        kind: 'callout',
        title: 'Edvifi Tip: Create a Scholarship Application Folder',
        text: 'Keep copies of your transcript, résumé, essays, and other frequently requested documents in one organized folder. This will save time when you\'re applying to multiple scholarships. Store sensitive financial and identification documents securely, and share them only through verified application channels.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'Write a Strong Scholarship Essay' },
      {
        kind: 'paragraph',
        text: 'Many scholarships require an essay, but you don\'t need to be an extraordinary writer to tell a compelling story.',
      },
      {
        kind: 'paragraph',
        text: 'A strong scholarship essay helps the reader understand who you are, what matters to you, and why you\'re a good fit for the award.',
      },
      {
        kind: 'paragraph',
        text: 'Here are some strategies:',
      },
      { kind: 'heading', level: 3, text: '1. Answer the Actual Question' },
      {
        kind: 'paragraph',
        text: 'Read the essay prompt carefully. If the scholarship asks about leadership, focus on an experience that demonstrates leadership rather than writing a general essay about your academic goals.',
      },
      { kind: 'heading', level: 3, text: '2. Be Specific' },
      {
        kind: 'paragraph',
        text: 'Instead of saying, "I\'m passionate about helping others," describe a time you helped someone, what you did, and what you learned.',
      },
      {
        kind: 'paragraph',
        text: 'Specific examples make your essay more personal and memorable.',
      },
      { kind: 'heading', level: 3, text: '3. Show Growth and Reflection' },
      {
        kind: 'paragraph',
        text: 'Scholarship committees often want to understand how your experiences have shaped you.',
      },
      {
        kind: 'paragraph',
        text: 'You can discuss challenges you\'ve overcome, lessons you\'ve learned, or goals you\'re working toward.',
      },
      {
        kind: 'paragraph',
        text: 'You don\'t need to share painful or deeply personal experiences to write a meaningful essay. Choose a story you\'re comfortable telling.',
      },
      { kind: 'heading', level: 3, text: '4. Connect Your Story to the Scholarship' },
      {
        kind: 'paragraph',
        text: 'Explain how your experiences, interests, or goals align with the scholarship\'s purpose.',
      },
      { kind: 'heading', level: 3, text: '5. Review and Revise' },
      {
        kind: 'paragraph',
        text: 'Before submitting, check your essay for clarity, grammar, word limits, and whether you\'ve fully answered the prompt.',
      },
      {
        kind: 'paragraph',
        text: 'If possible, ask a teacher, counselor, or trusted adult to review it.',
      },
      {
        kind: 'callout',
        title: 'Edvifi Tip: Reuse Your Work Strategically',
        text: 'Many scholarships ask similar questions about leadership, community involvement, career goals, or personal experiences. You can reuse ideas and adapt essays you\'ve already written, including college application essays. Just make sure every response addresses the specific scholarship prompt.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'Ask for Recommendation Letters Early' },
      {
        kind: 'paragraph',
        text: 'Some scholarships require recommendation letters from people who know you well.',
      },
      {
        kind: 'paragraph',
        text: 'Good recommenders might include:',
      },
      {
        kind: 'list',
        items: [
          'Teachers who know your academic abilities or work ethic.',
          'School counselors familiar with your goals and circumstances.',
          'Employers who can speak to your responsibility and dedication.',
          'Coaches, mentors, or community leaders who have worked closely with you.',
        ],
      },
      {
        kind: 'paragraph',
        text: '**Choose someone who knows you well, not simply someone with an impressive title.**',
      },
      {
        kind: 'paragraph',
        text: 'A thoughtful letter from a teacher who has seen your growth may be more valuable than a generic letter from someone who barely knows you.',
      },
      {
        kind: 'paragraph',
        text: 'When requesting a letter:',
      },
      {
        kind: 'list', ordered: true,
        items: [
          'Ask at least three to four weeks before the deadline whenever possible.',
          'Explain which scholarship you\'re applying for and why.',
          'Share your résumé, accomplishments, or goals to help the recommender write a detailed letter.',
          'Provide clear submission instructions and the deadline.',
          'Thank your recommender for their time.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Remember that teachers and counselors may be writing letters for many students, especially during senior year.',
      },
      { kind: 'heading', text: 'Avoid Common Application Mistakes' },
      {
        kind: 'paragraph',
        text: 'Even strong applicants can miss out on opportunities because of preventable mistakes.',
      },
      {
        kind: 'paragraph',
        text: 'Before submitting, make sure you:',
      },
      {
        kind: 'list',
        items: [
          '**Meet the eligibility requirements:** Double-check that you qualify before investing time in the application.',
          '**Follow all instructions:** Pay attention to word limits, document formats, and submission requirements.',
          '**Submit every required document:** Missing transcripts, essays, or recommendation letters can make an application incomplete.',
          '**Personalize your responses:** Avoid submitting the same generic essay to every scholarship.',
          '**Proofread carefully:** Review your application for errors, unclear responses, and missing information.',
          '**Submit before the deadline:** Don\'t wait until the final minutes, when technical problems could prevent submission.',
        ],
      },
      {
        kind: 'callout',
        title: 'Edvifi Tip: Set Your Own Deadline',
        text: 'If a scholarship application is due on March 15, aim to finish by March 12. Giving yourself a few extra days provides time to review your application, confirm recommendation letters have been submitted, and handle unexpected problems.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'What Happens After You Apply?' },
      {
        kind: 'paragraph',
        text: 'Submitting your application is an important milestone, but your work isn\'t necessarily finished.',
      },
      {
        kind: 'paragraph',
        text: 'After applying:',
      },
      {
        kind: 'list',
        items: [
          '**Update Aid Tracker:** Mark the application as submitted and record any confirmation number or email.',
          '**Check your email:** Scholarship organizations may contact you for interviews, additional documents, or award notifications.',
          '**Follow up when appropriate:** If the organization provides a decision timeline, wait until that period has passed before asking for an update.',
          '**Report scholarships to your college:** If you receive an award, contact your college\'s financial aid office to learn how it affects your financial aid package.',
          '**Review award conditions:** Check whether you need to maintain a particular GPA, enrollment status, or other requirements to keep the scholarship.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'And remember: **Not winning a scholarship doesn\'t mean your application wasn\'t strong.** Many scholarships are competitive, and selection decisions depend on factors outside your control.',
      },
      {
        kind: 'paragraph',
        text: 'Keep applying to opportunities that match your qualifications.',
      },
      { kind: 'heading', text: 'Your Next Step: Create Your Scholarship Application Plan' },
      {
        kind: 'paragraph',
        text: 'You now know how to prepare your materials, write stronger applications, and avoid common mistakes.',
      },
      {
        kind: 'paragraph',
        text: 'The next step is putting everything together into a realistic plan.',
      },
      {
        kind: 'paragraph',
        text: 'Return to Aid Tracker and review the opportunities you\'ve saved. Think about which scholarships you want to apply for first, what materials you\'ll need, and how much time each application will take.',
      },
      {
        kind: 'callout',
        title: 'Up Next: Identify 10 Scholarships to Apply to Senior Year',
        text: 'You\'ll expand your scholarship list, choose your highest-priority opportunities, and create a plan to start submitting applications.',
        variant: 'info',
      },
    ],
  },
  {
    id: 'sr-4',
    title: 'Identify 10 Scholarships to Apply to Senior Year',
    type: 'task',
    body: [
      { kind: 'heading', text: 'Task: Build Your Senior Year Scholarship Hit List' },
      {
        kind: 'paragraph',
        text: 'By the end of this task, you\'ll have a concrete list of 10 scholarships you\'re going to apply to during senior year. This isn\'t just a wish list — each scholarship should be one where you meet the eligibility requirements and are willing to invest time in the application.',
      },
      {
        kind: 'callout',
        title: 'Why 10?',
        text: 'Research shows that students who apply to at least 10 scholarships significantly increase their chances of winning at least one award. Think of it like college applications — you need a balanced list.',
        variant: 'info',
      },
      { kind: 'heading', text: 'Your 10-Scholarship Checklist' },
      {
        kind: 'checklist',
        title: 'Selection criteria for each scholarship',
        items: [
          'Identify 3-4 local scholarships (check counselor\'s office, community foundation, local orgs)',
          'Identify 3-4 niche scholarships matching your background, interests, or intended major',
          'Identify 2-3 national scholarships where you\'re a competitive applicant',
          'Verify you meet ALL eligibility requirements for each one (GPA, location, demographic, etc.)',
          'Note the deadline for each — make sure they don\'t all fall in the same week',
          'Check what materials each requires (essay topics, recommendation letters, transcripts)',
          'Add all 10 to your scholarship tracker with deadlines and status',
          'Request recommendation letters early (give recommenders at least 3-4 weeks)',
          'Draft a general scholarship essay that can be adapted across multiple applications',
          'Set calendar reminders 2 weeks before each deadline',
        ],
      },
      { kind: 'heading', text: 'Recommended Starting Points' },
      {
        kind: 'list',
        items: [
          'Check the Scholarship Engine tab in this module for scholarships from our database',
          'Visit your school counselor and ask for the current year\'s scholarship binder or list',
          'Search Fastweb.com and Scholarships.com with your profile information',
          'Ask your parent(s) if their employer offers scholarships for dependents',
          'Google "[your city/county] scholarships for high school seniors"',
        ],
      },
      {
        kind: 'callout',
        title: 'Start Now, Even in Junior Year',
        text: 'Many scholarships are open to juniors too, and some (like the National Merit Scholarship) start with the PSAT you take in October of 11th grade. Building your list now means you\'re ready to apply the moment each opens.',
        variant: 'tip',
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
     SECTION 4: Net Price Calculators
     ───────────────────────────────────────────────────────────── */
  {
    id: 'npc-1',
    title: 'What a Net Price Calculator Tells You',
    type: 'article',
    body: [
      { kind: 'heading', text: 'The Sticker Price vs. the Real Price' },
      {
        kind: 'paragraph',
        text: 'If you\'ve looked at college costs and felt a wave of panic, take a breath. The "sticker price" (the published cost of attendance) is not what most families actually pay. The real number that matters is the net price — the total cost of attendance minus grants and scholarships. For many students, the net price is dramatically lower than the sticker price.',
      },
      {
        kind: 'callout',
        title: 'Eye-Opening Example',
        text: 'A school with a $80,000 sticker price might offer $55,000 in grants, making your actual cost $25,000/year. Meanwhile, a school with a $35,000 sticker price might only offer $5,000 in grants, making your actual cost $30,000/year. The "cheaper" school is actually more expensive for your family.',
        variant: 'info',
      },
      { kind: 'heading', text: 'What is a Net Price Calculator (NPC)?' },
      {
        kind: 'paragraph',
        text: 'Every college that receives federal financial aid is legally required to have a Net Price Calculator on its website. An NPC takes your family\'s financial information (income, assets, family size) and gives you a personalized estimate of what that school would actually cost you after grants and scholarships. It\'s like a preview of your financial aid offer.',
      },
      { kind: 'heading', text: 'What You\'ll Learn From an NPC' },
      {
        kind: 'list',
        items: [
          'Estimated total cost of attendance (tuition, fees, room, board, books, personal expenses)',
          'Estimated grant and scholarship aid from the school',
          'Your estimated net price (what you\'d actually pay)',
          'How much you might need to borrow in loans',
          'Some NPCs also show estimated work-study eligibility',
        ],
      },
      { kind: 'heading', text: 'How Accurate Are NPCs?' },
      {
        kind: 'paragraph',
        text: 'NPC estimates are generally a good ballpark, especially at schools that meet a high percentage of demonstrated need. However, they\'re estimates, not guarantees. Your actual aid offer may differ based on factors the NPC can\'t capture (like merit scholarships that require a separate application). Schools with more generous aid programs tend to have more accurate calculators.',
      },
      {
        kind: 'callout',
        title: 'Expert Advice',
        text: 'Run the NPC for every school on your college list. It takes about 10-15 minutes per school and gives you the most realistic picture of what college will actually cost. This is one of the best uses of your time during the college planning process.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'Finding a School\'s NPC' },
      {
        kind: 'paragraph',
        text: 'Search "[school name] net price calculator" or look on the school\'s financial aid website. You can also use the U.S. Department of Education\'s College Scorecard, which links to each school\'s calculator and shows historical net price data.',
      },
      {
        kind: 'link',
        label: 'College Scorecard',
        url: 'https://collegescorecard.ed.gov/',
        description: 'Compare net prices, graduation rates, and outcomes across colleges',
      },
    ],
  },
  {
    id: 'npc-2',
    title: 'Run NPC for 3 Schools on Your List',
    type: 'task',
    body: [
      { kind: 'heading', text: 'Task: Run Net Price Calculators for 3 Schools' },
      {
        kind: 'paragraph',
        text: 'It\'s time to get real numbers. In this task, you\'ll run the Net Price Calculator for at least 3 schools on your college list. This will give you a concrete understanding of what each school would actually cost your family, and help you compare options beyond just sticker price.',
      },
      {
        kind: 'callout',
        title: 'What You\'ll Need',
        text: 'You\'ll need approximate financial information: your family\'s annual income, a rough estimate of savings/assets, family size, and the number of family members in college. Ask your parent or guardian to sit with you — it takes about 10-15 minutes per school.',
        variant: 'info',
      },
      { kind: 'heading', text: 'Step-by-Step' },
      {
        kind: 'checklist',
        title: 'For each of your 3 schools',
        items: [
          'Pick 3 schools from your college list (ideally one safety, one target, one reach)',
          'Search "[school name] net price calculator" to find each school\'s NPC',
          'Gather your family financial info (parent income, savings, family size)',
          'Complete the NPC for School 1 — save or screenshot the results',
          'Complete the NPC for School 2 — save or screenshot the results',
          'Complete the NPC for School 3 — save or screenshot the results',
          'Write down the estimated net price for each school, side by side',
          'Note any surprises — schools that are more or less affordable than expected',
        ],
      },
      { kind: 'heading', text: 'What to Pay Attention To' },
      {
        kind: 'list',
        items: [
          'Look at the net price (total cost minus grants/scholarships) — this is your real cost',
          'Check if the estimate includes loans — loans aren\'t free money and must be repaid',
          'Note the difference between in-state and out-of-state if applicable',
          'Compare the net price across schools, not just the sticker price',
          'Check if the school meets 100% of demonstrated need — this affects aid reliability',
        ],
      },
      {
        kind: 'callout',
        title: 'After You Finish',
        text: 'Put your NPC results side by side, with the cost of attendance next to the estimated aid for each school. Seeing them together makes it much easier to have an informed conversation with your family about college affordability.',
        variant: 'tip',
      },
    ],
  },
  {
    id: 'npc-3',
    title: 'Worksheet: Compare Estimated Costs Across Schools',
    type: 'assignment',
    body: [
      { kind: 'heading', text: 'Assignment: School Cost Comparison Worksheet' },
      {
        kind: 'paragraph',
        text: 'After running net price calculators, it\'s time to put everything side by side and make sense of the numbers. This worksheet guides you through a structured comparison that goes beyond just the bottom line — helping you understand the full financial picture for each school.',
      },
      { kind: 'heading', text: 'Part 1: Gather Your Numbers' },
      {
        kind: 'checklist',
        title: 'For each school, record these from your NPC results',
        items: [
          'Total Cost of Attendance (COA) — tuition + fees + room + board + books + personal',
          'Estimated grants and scholarships (free money)',
          'Estimated net price (COA minus grants/scholarships)',
          'Estimated loan amount included in the aid package',
          'Estimated work-study, if any',
          'True out-of-pocket cost (net price minus loans minus work-study)',
        ],
      },
      { kind: 'heading', text: 'Part 2: Calculate the Full Picture' },
      {
        kind: 'paragraph',
        text: 'For each school, answer these questions:',
      },
      {
        kind: 'checklist',
        title: 'Analysis questions',
        items: [
          'What is the 4-year total cost (net price x 4)? Remember, costs typically increase 3-5% annually.',
          'How much total debt would you graduate with if you took all offered loans?',
          'What percentage of the COA is covered by grants (free money)?',
          'Does the school meet 100% of demonstrated need? If not, how large is the gap?',
          'Are there additional merit scholarships you could apply for to lower the cost further?',
          'Is the financial aid renewable for all 4 years, or just the first year? What GPA is required to maintain it?',
        ],
      },
      { kind: 'heading', text: 'Part 3: Compare and Discuss' },
      {
        kind: 'paragraph',
        text: 'Rank your schools from least to most expensive (by net price, not sticker price). Then have a family conversation about these questions:',
      },
      {
        kind: 'list',
        items: [
          'Which schools are financially feasible without excessive borrowing?',
          'Is the most expensive option worth the difference? What\'s the return on investment?',
          'What is the maximum amount of loan debt your family is comfortable with over 4 years?',
          'Are there ways to reduce costs further (living at home, AP credits, starting at community college)?',
          'What is the "value gap" — the difference between your cheapest and most expensive options?',
        ],
      },
      {
        kind: 'callout',
        title: 'Rule of Thumb',
        text: 'Financial experts generally recommend that your total student loan debt at graduation should not exceed your expected first-year salary. If you\'re unsure about future earnings, the Bureau of Labor Statistics Occupational Outlook Handbook is a good resource.',
        variant: 'info',
      },
      {
        kind: 'link',
        label: 'Bureau of Labor Statistics — Occupational Outlook',
        url: 'https://www.bls.gov/ooh/',
        description: 'Research expected salaries for different career paths',
      },
    ],
  },
]

/** Lookup map for O(1) access by item ID */
export const CHECKLIST_CONTENT_MAP: Record<string, ChecklistContent> = Object.fromEntries(
  CHECKLIST_CONTENT.map((c) => [c.id, c]),
)
