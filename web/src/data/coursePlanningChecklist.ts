export type CpItemType = 'article' | 'task' | 'resource'

export interface CpChecklistItem {
  id: string
  label: string
  type: CpItemType
}

export interface CpChecklistSection {
  title: string
  items: CpChecklistItem[]
}

export const CP_CHECKLIST: CpChecklistSection[] = [
  {
    title: 'Course Rigor',
    items: [
      { id: 'cr-1', label: 'How colleges read your transcript', type: 'article' },
      { id: 'cr-2', label: 'Honors vs. AP vs. Dual Enrollment', type: 'article' },
      { id: 'cr-3', label: 'Weighted vs. unweighted GPA — what each one means', type: 'article' },
    ],
  },
  {
    title: 'AP Strategy',
    items: [
      { id: 'ap-1', label: 'How many APs is enough (or too many)', type: 'article' },
      { id: 'ap-2', label: 'Choosing AP courses by intended major', type: 'article' },
      { id: 'ap-3', label: 'Self-studying APs — when it works', type: 'article' },
    ],
  },
  {
    title: 'Building Your 4-Year Plan',
    items: [
      { id: 'bp-1', label: 'Core requirements all colleges expect', type: 'article' },
      { id: 'bp-2', label: 'Major-specific prerequisites', type: 'article' },
      { id: 'bp-3', label: 'Build out your 4-year plan', type: 'task' },
      { id: 'bp-4', label: 'When your school doesn\'t offer what you need', type: 'article' },
    ],
  },
  {
    title: 'Year-by-Year Adjustments',
    items: [
      { id: 'yy-1', label: 'When (and how) to drop a course', type: 'article' },
      { id: 'yy-2', label: 'Senior-year course load — don\'t coast', type: 'article' },
    ],
  },
]

export const CP_TOTAL_ITEMS = CP_CHECKLIST.reduce((a, s) => a + s.items.length, 0)
export const CP_ALL_IDS = CP_CHECKLIST.flatMap((s) => s.items.map((i) => i.id))

/* ─── 4-Year Plan ─── */

export type CourseLevel = 'Regular' | 'Honors' | 'AP' | 'IB' | 'Dual Enrollment'

export const COURSE_LEVELS: CourseLevel[] = [
  'Regular', 'Honors', 'AP', 'IB', 'Dual Enrollment',
]

export const LEVEL_WEIGHT: Record<CourseLevel, number> = {
  'Regular':         0,
  'Honors':          0.5,
  'AP':              1.0,
  'IB':              1.0,
  'Dual Enrollment': 1.0,
}

export type LetterGrade = '' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F'

export const LETTER_GRADES: LetterGrade[] = [
  '', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F',
]

export const GRADE_POINTS: Record<LetterGrade, number | null> = {
  '':   null,
  'A':  4.0,
  'A-': 3.7,
  'B+': 3.3,
  'B':  3.0,
  'B-': 2.7,
  'C+': 2.3,
  'C':  2.0,
  'C-': 1.7,
  'D':  1.0,
  'F':  0.0,
}

export type SchoolGrade = 9 | 10 | 11 | 12

export const SCHOOL_GRADES: SchoolGrade[] = [9, 10, 11, 12]

export interface CourseEntry {
  id: string
  grade: SchoolGrade
  name: string
  level: CourseLevel
  earnedGrade: LetterGrade
}

/* ─── seed plan with common slots ─── */

export const TEMPLATE_SUBJECTS: string[] = [
  'English',
  'Math',
  'Science',
  'Social Studies',
  'Foreign Language',
  'Elective',
]
