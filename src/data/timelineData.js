// ─────────────────────────────────────────────────────────────────────────────
// College Application Journey — Freshman → Senior Year
// ─────────────────────────────────────────────────────────────────────────────

export const YEAR_GROUPS = [
  { label: 'Freshman',  grade: '9th',  color: '#10B981', startIndex: 0,  count: 3 },
  { label: 'Sophomore', grade: '10th', color: '#3B82F6', startIndex: 3,  count: 3 },
  { label: 'Junior',    grade: '11th', color: '#8B5CF6', startIndex: 6,  count: 4 },
  { label: 'Senior',    grade: '12th', color: '#F59E0B', startIndex: 10, count: 4 },
];

export const milestones = [
  // ── FRESHMAN YEAR ─────────────────────────────────────────────────────────
  {
    id: 'f1',
    yearLabel: 'Freshman Year',
    grade: '9th',
    phase: 'Fall Semester',
    title: 'Set the\nFoundation',
    description:
      'These grades travel with you all four years. Build the habits now that will carry you through — consistency beats intensity every time.',
    tasks: [
      'Aim for a 3.5+ unweighted GPA',
      'Join 2–3 clubs or a sport',
      'Introduce yourself to your teachers',
    ],
    accent: '#10B981',
    accentDim: 'rgba(16, 185, 129, 0.1)',
    gradientColors: ['#07100D', '#081A12'],
  },
  {
    id: 'f2',
    yearLabel: 'Freshman Year',
    grade: '9th',
    phase: 'Spring Semester',
    title: 'Find Your\nThing',
    description:
      'College admissions love students who go deep, not wide. Start exploring — what are you genuinely curious about outside the classroom?',
    tasks: [
      'Try at least one new activity or interest',
      'Volunteer or shadow a professional',
      'Reflect on what excites you most',
    ],
    accent: '#10B981',
    accentDim: 'rgba(16, 185, 129, 0.1)',
    gradientColors: ['#07100D', '#081A12'],
  },
  {
    id: 'f3',
    yearLabel: 'Freshman Year',
    grade: '9th',
    phase: 'End of Year',
    title: 'Build\nRelationships',
    description:
      "Two of the most important people in your application aren't you — they're the teachers who will write your recommendation letters.",
    tasks: [
      'Identify 2 teachers who know you well',
      'Visit office hours; engage in class',
      'Keep a list of your achievements so far',
    ],
    accent: '#10B981',
    accentDim: 'rgba(16, 185, 129, 0.1)',
    gradientColors: ['#07100D', '#081A12'],
  },

  // ── SOPHOMORE YEAR ────────────────────────────────────────────────────────
  {
    id: 's1',
    yearLabel: 'Sophomore Year',
    grade: '10th',
    phase: 'Fall Semester',
    title: 'Level Up\nYour Rigor',
    description:
      'Now is the time to challenge yourself. Take an AP or honors course in a subject you love. Colleges want to see you push past the minimum.',
    tasks: [
      'Enroll in 1–2 AP or honors classes',
      'Take the PSAT 10 in October',
      'Step into a leadership role in a club',
    ],
    accent: '#3B82F6',
    accentDim: 'rgba(59, 130, 246, 0.1)',
    gradientColors: ['#070A10', '#08101A'],
  },
  {
    id: 's2',
    yearLabel: 'Sophomore Year',
    grade: '10th',
    phase: 'Spring Semester',
    title: 'Start the\nVision',
    description:
      "You don't need a list yet — you need a direction. Start daydreaming about what kind of environment you want to spend the next four years in.",
    tasks: [
      'Sketch a loose list of 5–8 colleges you like',
      'Research 2–3 majors that interest you',
      'Attend a college info night if available',
    ],
    accent: '#3B82F6',
    accentDim: 'rgba(59, 130, 246, 0.1)',
    gradientColors: ['#070A10', '#08101A'],
  },
  {
    id: 's3',
    yearLabel: 'Sophomore Year',
    grade: '10th',
    phase: 'Summer',
    title: 'Make Summer\nCount',
    description:
      "Admissions officers love to see initiative. A summer job, research program, or self-directed project speaks louder than you'd expect.",
    tasks: [
      'Apply to a summer program or internship',
      'Read books in your area of interest',
      'Document activities for your future resume',
    ],
    accent: '#3B82F6',
    accentDim: 'rgba(59, 130, 246, 0.1)',
    gradientColors: ['#070A10', '#08101A'],
  },

  // ── JUNIOR YEAR ───────────────────────────────────────────────────────────
  {
    id: 'j1',
    yearLabel: 'Junior Year',
    grade: '11th',
    phase: 'Before School Starts',
    title: 'Enter\nPrep Mode',
    description:
      "Junior year is the most important year of high school for college admissions. Start it with a plan — especially around standardized testing.",
    tasks: [
      'Begin serious SAT/ACT prep',
      'Register for fall test dates',
      'Create an initial college list of 10–15 schools',
    ],
    accent: '#8B5CF6',
    accentDim: 'rgba(139, 92, 246, 0.1)',
    gradientColors: ['#0A0710', '#10081A'],
  },
  {
    id: 'j2',
    yearLabel: 'Junior Year',
    grade: '11th',
    phase: 'Fall Semester',
    title: 'Test\nSeason',
    description:
      'Your SAT/ACT score is one of the most flexible parts of your application — you can retake it. But your GPA is permanent. Protect both.',
    tasks: [
      'Take the SAT or ACT (plan to retake in spring)',
      'Ask 2 teachers for rec letters now',
      'Keep your GPA strong — this year matters most',
    ],
    accent: '#8B5CF6',
    accentDim: 'rgba(139, 92, 246, 0.1)',
    gradientColors: ['#0A0710', '#10081A'],
  },
  {
    id: 'j3',
    yearLabel: 'Junior Year',
    grade: '11th',
    phase: 'Winter',
    title: 'Build Your\nCollege List',
    description:
      "A well-balanced list has reach schools, match schools, and likely schools. Don't apply only to dreams — apply to places you'd actually love.",
    tasks: [
      'Finalize list: 3–4 reaches, 4–5 matches, 2–3 likelies',
      'Research financial aid and merit scholarships',
      'Attend virtual or in-person college fairs',
    ],
    accent: '#8B5CF6',
    accentDim: 'rgba(139, 92, 246, 0.1)',
    gradientColors: ['#0A0710', '#10081A'],
  },
  {
    id: 'j4',
    yearLabel: 'Junior Year',
    grade: '11th',
    phase: 'Spring Semester',
    title: 'Get on\nCampus',
    description:
      'A campus visit changes everything. You can feel within 20 minutes whether a school fits. Use spring break to make it happen.',
    tasks: [
      'Visit 3–5 schools during spring break',
      'Confirm rec letter writers and brief them',
      'Meet with your school counselor to review your plan',
    ],
    accent: '#8B5CF6',
    accentDim: 'rgba(139, 92, 246, 0.1)',
    gradientColors: ['#0A0710', '#10081A'],
  },

  // ── SENIOR YEAR ───────────────────────────────────────────────────────────
  {
    id: 'sr1',
    yearLabel: 'Senior Year',
    grade: '12th',
    phase: 'Summer Before Senior Year',
    title: 'Craft\nYour Story',
    description:
      "Your Common App essay is the one place no one else can compete with you — because it's yours. Start early. Write multiple drafts. Be honest.",
    tasks: [
      'Draft your Common App personal statement',
      'Complete your activities list',
      'Request official transcripts from your school',
    ],
    accent: '#F59E0B',
    accentDim: 'rgba(245, 158, 11, 0.1)',
    gradientColors: ['#100D07', '#1A1208'],
  },
  {
    id: 'sr2',
    yearLabel: 'Senior Year',
    grade: '12th',
    phase: 'Early Fall',
    title: 'Launch\nEarly Apps',
    description:
      "If a school is your top choice, Early Decision shows serious commitment — and often improves your odds. Don't miss these deadlines.",
    tasks: [
      'Submit ED/EA applications by Nov 1–15',
      'Complete FAFSA after it opens October 1st',
      'Send SAT/ACT scores to all schools',
    ],
    accent: '#F59E0B',
    accentDim: 'rgba(245, 158, 11, 0.1)',
    gradientColors: ['#100D07', '#1A1208'],
  },
  {
    id: 'sr3',
    yearLabel: 'Senior Year',
    grade: '12th',
    phase: 'Winter',
    title: 'Regular\nDecision Push',
    description:
      "January deadlines sneak up fast. Stay organized, keep your senior grades up, and apply for every scholarship you qualify for.",
    tasks: [
      'Submit RD applications by Jan 1–15',
      'Apply for 3+ scholarships per month',
      'Monitor portals — respond to any missing docs',
    ],
    accent: '#F59E0B',
    accentDim: 'rgba(245, 158, 11, 0.1)',
    gradientColors: ['#100D07', '#1A1208'],
  },
  {
    id: 'sr4',
    yearLabel: 'Senior Year',
    grade: '12th',
    phase: 'Spring',
    title: 'Your\nMoment',
    description:
      "Decisions are in. Now compare your options with clear eyes — prestige is real, but so are debt, fit, and where you'll actually thrive.",
    tasks: [
      'Compare financial aid award letters carefully',
      'Attend admitted students days at top choices',
      'Commit to your school by May 1',
    ],
    accent: '#F59E0B',
    accentDim: 'rgba(245, 158, 11, 0.1)',
    gradientColors: ['#100D07', '#1A1208'],
  },
];

export const TOTAL = milestones.length; // 14
