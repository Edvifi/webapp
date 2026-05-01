export type TestingItemType = 'article' | 'quiz' | 'task' | 'resource'

export interface TestingChecklistItem {
  id: string
  label: string
  type: TestingItemType
}

export interface TestingChecklistSection {
  title: string
  items: TestingChecklistItem[]
}

export const TESTING_CHECKLIST: TestingChecklistSection[] = [
  {
    title: 'Choosing Your Test',
    items: [
      { id: 'ct-1', label: 'SAT vs. ACT — which is better for you?', type: 'article' },
      { id: 'ct-2', label: 'Quiz: SAT or ACT diagnostic', type: 'quiz' },
      { id: 'ct-3', label: 'Take a free practice SAT (Khan Academy)', type: 'task' },
      { id: 'ct-4', label: 'Take a free practice ACT', type: 'task' },
    ],
  },
  {
    title: 'Registration & Prep',
    items: [
      { id: 'rp-1', label: 'Register for your first official test', type: 'task' },
      { id: 'rp-2', label: '3-month prep timeline', type: 'resource' },
      { id: 'rp-3', label: 'Free vs. paid prep — what works', type: 'article' },
      { id: 'rp-4', label: 'Should you hire a tutor?', type: 'article' },
    ],
  },
  {
    title: 'Score Strategy',
    items: [
      { id: 'ss-1', label: 'How to interpret your score report', type: 'article' },
      { id: 'ss-2', label: 'Should you retake? (decision guide)', type: 'article' },
      { id: 'ss-3', label: 'When and how to send scores to colleges', type: 'article' },
      { id: 'ss-4', label: 'Superscoring explained', type: 'article' },
    ],
  },
  {
    title: 'AP & Subject Tests',
    items: [
      { id: 'ap-1', label: 'Plan your AP exam schedule', type: 'task' },
      { id: 'ap-2', label: 'AP score requirements at top schools', type: 'article' },
      { id: 'ap-3', label: 'Are SAT Subject Tests still relevant?', type: 'article' },
    ],
  },
]

export const TESTING_TOTAL_ITEMS = TESTING_CHECKLIST.reduce(
  (a, s) => a + s.items.length,
  0,
)

export interface TestDate {
  test: string
  date: string
  registration_deadline: string
  late_registration?: string
}

export const UPCOMING_TEST_DATES: TestDate[] = [
  { test: 'SAT', date: 'Aug 23, 2026', registration_deadline: 'Aug 8, 2026', late_registration: 'Aug 12, 2026' },
  { test: 'ACT', date: 'Sep 13, 2026', registration_deadline: 'Aug 8, 2026', late_registration: 'Aug 22, 2026' },
  { test: 'SAT', date: 'Oct 4, 2026', registration_deadline: 'Sep 19, 2026' },
  { test: 'PSAT/NMSQT', date: 'Oct 15, 2026', registration_deadline: 'School-administered' },
  { test: 'SAT', date: 'Nov 8, 2026', registration_deadline: 'Oct 24, 2026' },
  { test: 'ACT', date: 'Dec 13, 2026', registration_deadline: 'Nov 7, 2026' },
  { test: 'SAT', date: 'Dec 6, 2026', registration_deadline: 'Nov 21, 2026' },
]

export interface PrepResource {
  title: string
  provider: string
  cost: 'Free' | 'Paid' | 'Mixed'
  type: 'Practice tests' | 'Video lessons' | 'Books' | 'Tutoring' | 'App'
  url: string
  blurb: string
}

export const PREP_RESOURCES: PrepResource[] = [
  {
    title: 'Khan Academy SAT Prep',
    provider: 'Khan Academy',
    cost: 'Free',
    type: 'Video lessons',
    url: 'https://www.khanacademy.org/sat',
    blurb: 'Official College Board partner. Personalized practice based on your PSAT score.',
  },
  {
    title: 'ACT Academy',
    provider: 'ACT.org',
    cost: 'Free',
    type: 'Practice tests',
    url: 'https://academy.act.org/',
    blurb: 'Free official ACT prep with diagnostic tests and personalized study paths.',
  },
  {
    title: 'College Panda SAT Math',
    provider: 'Nielson Phu',
    cost: 'Paid',
    type: 'Books',
    url: 'https://thecollegepanda.com/',
    blurb: 'Highly recommended SAT math prep book for advanced learners.',
  },
  {
    title: 'UWorld SAT Prep',
    provider: 'UWorld',
    cost: 'Paid',
    type: 'App',
    url: 'https://www.uworld.com/sat',
    blurb: 'Interactive question bank with detailed explanations. Strong for math.',
  },
  {
    title: 'PrepScholar',
    provider: 'PrepScholar',
    cost: 'Mixed',
    type: 'Video lessons',
    url: 'https://www.prepscholar.com/',
    blurb: 'Free articles + paid online prep program with score guarantee.',
  },
  {
    title: 'AP Classroom',
    provider: 'College Board',
    cost: 'Free',
    type: 'Practice tests',
    url: 'https://apclassroom.collegeboard.org/',
    blurb: 'Official AP practice questions and progress checks. Requires teacher access code.',
  },
]
