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

export type ContentBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: string[] }
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
    title: 'How Expected Family Contribution (EFC) is Calculated',
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
     SECTION 3: Scholarship Research
     ───────────────────────────────────────────────────────────── */
  {
    id: 'sr-1',
    title: 'How to Find Scholarships You Actually Qualify For',
    type: 'article',
    body: [
      { kind: 'heading', text: 'Cutting Through the Noise' },
      {
        kind: 'paragraph',
        text: 'There are literally millions of scholarships out there, which sounds great — until you realize that most of them have very specific eligibility requirements. The key isn\'t to apply to hundreds of scholarships blindly. It\'s to find the ones that align with who you are, what you do, and where you live. A targeted approach saves time and dramatically improves your odds.',
      },
      { kind: 'heading', text: 'Start With What Makes You Unique' },
      {
        kind: 'paragraph',
        text: 'Scholarships exist for almost every background, interest, and circumstance. Before searching, make a list of your characteristics that scholarship committees look for:',
      },
      {
        kind: 'list',
        items: [
          'Your demographic background (ethnicity, gender, first-generation college student)',
          'Where you live (state, county, city — local scholarships have less competition)',
          'Your parents\' employers (many companies offer dependent scholarships)',
          'Your intended major or career field',
          'Your extracurricular activities, community service, or leadership roles',
          'Religious affiliation, if any',
          'Health conditions or disabilities',
          'Military connection (veterans, active duty family members)',
        ],
      },
      { kind: 'heading', text: 'Where to Search' },
      {
        kind: 'list',
        items: [
          'Your school counselor — they often maintain a local scholarship list that gets updated throughout the year',
          'Scholarship search engines — Fastweb, Scholarships.com, Bold.org, College Board Scholarship Search',
          'Your state\'s higher education agency — many states offer merit and need-based scholarships',
          'Community organizations — Rotary Club, Lions Club, Elks Lodge, local businesses',
          'Professional associations related to your intended career',
          'Your parents\' workplaces, unions, or professional organizations',
          'Your community foundation (search "[your county] community foundation scholarships")',
        ],
      },
      {
        kind: 'callout',
        title: 'The Sweet Spot',
        text: 'Local and niche scholarships typically have fewer applicants, making your odds much better. A $1,000 local scholarship with 50 applicants is far more attainable than a $10,000 national scholarship with 50,000 applicants. Apply to both, but don\'t ignore the smaller ones.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'Red Flags to Watch For' },
      {
        kind: 'list',
        items: [
          'Never pay an application fee for a scholarship — legitimate scholarships don\'t charge you to apply',
          'Be wary of "guaranteed" scholarships or prizes — real scholarships are competitive',
          'Don\'t give out bank account or credit card information',
          'Legitimate scholarships won\'t ask you to pay taxes upfront on winnings',
        ],
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
        text: 'Applying to scholarships is a lot like applying to colleges — you need a system to stay organized. In this assignment, you\'ll set up a tracker to manage your scholarship search and applications throughout junior and senior year.',
      },
      {
        kind: 'callout',
        title: 'Good News',
        text: 'You can use the Scholarship Tracker built into this module! Head to the Scholarships tab to start adding scholarships from our database or manually. This assignment walks you through the strategy behind building your list.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'Step 1: Set Up Your Categories' },
      {
        kind: 'paragraph',
        text: 'Organize scholarships into groups that help you prioritize your time and effort.',
      },
      {
        kind: 'checklist',
        title: 'For each scholarship, track these details',
        items: [
          'Scholarship name and organization',
          'Award amount (or range)',
          'Deadline (note if it\'s annual/recurring)',
          'Eligibility requirements (GPA, location, demographic, etc.)',
          'Application materials needed (essay, transcript, recommendation letters)',
          'Application status (Researching, Planning, Ready, Submitted, Awarded)',
          'Your notes (essay ideas, contact info, questions)',
        ],
      },
      { kind: 'heading', text: 'Step 2: Research and Add at Least 15 Scholarships' },
      {
        kind: 'paragraph',
        text: 'Using the strategies from the "How to Find Scholarships" article, research and add at least 15 scholarships to your tracker. Aim for a mix:',
      },
      {
        kind: 'list',
        items: [
          '5+ local scholarships (community organizations, local businesses, school counselor list)',
          '5+ scholarships matching your unique background or interests',
          '5+ national scholarships you meet the eligibility for',
        ],
      },
      { kind: 'heading', text: 'Step 3: Prioritize by Deadline and Fit' },
      {
        kind: 'paragraph',
        text: 'Sort your list by deadline so you never miss one. Then, star the scholarships where you feel you\'re the strongest fit — these are where you should invest the most effort in your application essays and materials.',
      },
      {
        kind: 'callout',
        title: 'Deliverable',
        text: 'Your tracker should have at least 15 scholarships added with deadlines, amounts, and application requirements noted. You\'ll use this list as the foundation for the "Identify 10 Scholarships" task later.',
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
        text: 'When most people think of scholarships, they picture the big national ones — Gates Scholarship, Coca-Cola Scholars, QuestBridge. These are prestigious and valuable, but they\'re also extraordinarily competitive. The Gates Scholarship, for example, receives over 50,000 applications for about 300 awards. Your odds? Roughly 0.6%.',
      },
      {
        kind: 'paragraph',
        text: 'Local scholarships tell a very different story. Your town\'s Rotary Club scholarship might get 30 applications for 3 awards. That\'s a 10% chance — roughly 17 times better odds. And here\'s the thing: those $500-$2,000 local scholarships add up. Five local scholarships at $1,000 each equals one $5,000 national scholarship, with a fraction of the effort.',
      },
      {
        kind: 'callout',
        title: 'Math That Matters',
        text: 'Students who apply to 10 local scholarships typically win more total money than students who apply to 10 national scholarships. Volume plus better odds equals better results.',
        variant: 'tip',
      },
      { kind: 'heading', text: 'Where to Find Local Scholarships' },
      {
        kind: 'list',
        items: [
          'Your high school counseling office — they maintain a running list, often posted on a bulletin board or website',
          'Your local community foundation — search "[your county] community foundation"',
          'Civic organizations in your area — Rotary, Kiwanis, Lions Club, Elks Lodge, VFW',
          'Local businesses — banks, law firms, medical practices, and retailers sometimes sponsor scholarships',
          'Your parents\' employers — many offer scholarships for employees\' children',
          'Religious organizations — churches, mosques, synagogues, and temples',
          'Your school district or PTA',
          'Local newspaper or media companies',
        ],
      },
      { kind: 'heading', text: 'When National Makes Sense' },
      {
        kind: 'paragraph',
        text: 'National scholarships are absolutely worth applying to — especially if you have a strong profile match. The key is to be strategic about which ones you target.',
      },
      {
        kind: 'list',
        items: [
          'Apply to national scholarships where your background or story gives you a genuine edge',
          'Focus on scholarships in your specific field of interest (e.g., STEM, arts, public service)',
          'Look for "niche" national scholarships with fewer applicants (e.g., for students interested in a specific career)',
          'Many national scholarship essays can be repurposed for multiple applications — write one strong essay and adapt it',
        ],
      },
      { kind: 'heading', text: 'The Ideal Strategy' },
      {
        kind: 'paragraph',
        text: 'Build a balanced portfolio: a foundation of local scholarships (high odds, less competition), a selection of niche national scholarships (moderate odds, good fit), and a few "reach" prestigious scholarships (low odds, high reward). Treat it like a college list — you want safeties, targets, and reaches.',
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
          'Check the Discover tab in this module for scholarships from our database',
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
          'Record the estimated net price for each school in the Aid Compare tab',
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
        text: 'Head to the Aid Compare tab to enter your NPC results and see a side-by-side comparison of estimated costs across schools. This visualization makes it much easier to have an informed conversation with your family about college affordability.',
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
      {
        kind: 'callout',
        title: 'Use Aid Compare',
        text: 'The Aid Compare tab in this module lets you enter and compare NPC results visually. Use it alongside this worksheet to organize your findings.',
        variant: 'tip',
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
