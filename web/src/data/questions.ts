/**
 * Questions embedded in the timeline at year boundaries.
 * Each question maps to a dashboard module and has response options.
 * Inserted after the last milestone of each year.
 */

export interface TimelineQuestion {
  id: string
  /** Which milestone index this appears AFTER */
  afterIndex: number
  /** The module this maps to */
  module: string
  /** Question text */
  question: string
  /** Response options */
  options: { label: string; emoji: string; value: number }[]
  /** Accent color (matches the year) */
  accent: string
}

export const TIMELINE_QUESTIONS: TimelineQuestion[] = [
  // After Freshman year (index 2)
  {
    id: 'q-courses',
    afterIndex: 2,
    module: 'Course Planning',
    question: 'How confident are you about your course plan?',
    options: [
      { label: 'No idea', emoji: '😰', value: 0 },
      { label: 'Kinda lost', emoji: '😕', value: 1 },
      { label: 'Getting there', emoji: '🤔', value: 2 },
      { label: 'Feeling good', emoji: '😊', value: 3 },
    ],
    accent: '#2D9E72',
  },
  {
    id: 'q-extracurriculars',
    afterIndex: 2,
    module: 'Extracurriculars',
    question: 'Are you involved in activities outside of class?',
    options: [
      { label: 'Not yet', emoji: '🤷', value: 0 },
      { label: 'A little', emoji: '🌱', value: 1 },
      { label: 'Pretty active', emoji: '🏃', value: 2 },
      { label: 'Leading things', emoji: '🔥', value: 3 },
    ],
    accent: '#2D9E72',
  },

  // After Sophomore year (index 5)
  {
    id: 'q-testing',
    afterIndex: 5,
    module: 'Standardized Testing',
    question: 'Where are you with standardized test prep?',
    options: [
      { label: "Haven't started", emoji: '📭', value: 0 },
      { label: 'Thinking about it', emoji: '💭', value: 1 },
      { label: 'Studying now', emoji: '📖', value: 2 },
      { label: 'Already took it', emoji: '✅', value: 3 },
    ],
    accent: '#1D7FC4',
  },
  {
    id: 'q-financial',
    afterIndex: 5,
    module: 'Financial Aid',
    question: 'How much do you know about paying for college?',
    options: [
      { label: 'Nothing', emoji: '😶', value: 0 },
      { label: 'Heard of FAFSA', emoji: '👀', value: 1 },
      { label: 'Researching', emoji: '🔍', value: 2 },
      { label: 'Got a plan', emoji: '💰', value: 3 },
    ],
    accent: '#1D7FC4',
  },

  // After Junior year (index 9)
  {
    id: 'q-essays',
    afterIndex: 9,
    module: 'College Essays',
    question: "How's your college essay coming along?",
    options: [
      { label: "Haven't started", emoji: '📝', value: 0 },
      { label: 'Brainstorming', emoji: '💡', value: 1 },
      { label: 'Drafting', emoji: '✍️', value: 2 },
      { label: 'Almost done', emoji: '🎯', value: 3 },
    ],
    accent: '#7048C8',
  },
  {
    id: 'q-tracking',
    afterIndex: 9,
    module: 'Application Tracking',
    question: 'Do you have a system for tracking your applications?',
    options: [
      { label: 'Nope', emoji: '🫠', value: 0 },
      { label: 'Mental notes', emoji: '🧠', value: 1 },
      { label: 'Spreadsheet', emoji: '📊', value: 2 },
      { label: 'All organized', emoji: '✨', value: 3 },
    ],
    accent: '#7048C8',
  },
]
