export type EcItemType = 'article' | 'task' | 'resource'

export interface EcChecklistItem {
  id: string
  label: string
  type: EcItemType
}

export interface EcChecklistSection {
  title: string
  items: EcChecklistItem[]
}

export const EC_CHECKLIST: EcChecklistSection[] = [
  {
    title: 'Building Your Activity List',
    items: [
      { id: 'al-1', label: 'Depth vs. breadth — what colleges actually value', type: 'article' },
      { id: 'al-2', label: 'The "spike" vs. well-rounded debate', type: 'article' },
      { id: 'al-3', label: 'How to fill the Common App\'s 10 slots', type: 'article' },
    ],
  },
  {
    title: 'Leadership & Impact',
    items: [
      { id: 'li-1', label: 'What "leadership" really means on applications', type: 'article' },
      { id: 'li-2', label: 'Starting your own initiative — when it works', type: 'article' },
      { id: 'li-3', label: 'How to write strong activity descriptions', type: 'article' },
    ],
  },
  {
    title: 'Summer Strategy',
    items: [
      { id: 'su-1', label: 'Summer programs: which ones are worth it', type: 'article' },
      { id: 'su-2', label: 'Internships, research, jobs — by year', type: 'article' },
      { id: 'su-3', label: 'Plan next summer', type: 'task' },
    ],
  },
  {
    title: 'Awards & Honors',
    items: [
      { id: 'aw-1', label: 'Listing awards on the Common App (5 slots)', type: 'article' },
      { id: 'aw-2', label: 'Competitions worth pursuing', type: 'resource' },
    ],
  },
]

export const EC_TOTAL_ITEMS = EC_CHECKLIST.reduce((a, s) => a + s.items.length, 0)
export const EC_ALL_IDS = EC_CHECKLIST.flatMap((s) => s.items.map((i) => i.id))

/* ─── Activity entry (Common App-shaped) ─── */

export type EcCategory =
  | 'Academic'
  | 'Athletics'
  | 'Arts'
  | 'Community Service'
  | 'Cultural'
  | 'Family Responsibilities'
  | 'Internship'
  | 'Job (Paid)'
  | 'Leadership'
  | 'Music'
  | 'Religious'
  | 'Research'
  | 'Robotics'
  | 'Student Government'
  | 'Theater/Drama'
  | 'Other Club/Activity'

export const EC_CATEGORIES: EcCategory[] = [
  'Academic', 'Athletics', 'Arts', 'Community Service', 'Cultural',
  'Family Responsibilities', 'Internship', 'Job (Paid)', 'Leadership',
  'Music', 'Religious', 'Research', 'Robotics', 'Student Government',
  'Theater/Drama', 'Other Club/Activity',
]

export type EcGrade = 9 | 10 | 11 | 12

export interface ActivityEntry {
  id: string
  category: EcCategory
  position: string
  organization: string
  description: string
  hoursPerWeek: number
  weeksPerYear: number
  grades: EcGrade[]
  continuing: boolean
}

export const COMMON_APP_DESCRIPTION_LIMIT = 150
export const COMMON_APP_POSITION_LIMIT = 50
export const COMMON_APP_ORG_LIMIT = 100
export const MAX_ACTIVITIES = 10
