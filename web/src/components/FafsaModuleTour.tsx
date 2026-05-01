/**
 * FafsaModuleTour — Financial Aid module's guided tour.
 *
 * Thin wrapper over <ModuleTour /> that supplies FAFSA-specific steps
 * and intro copy. The generic mechanics (spotlight, blur, tab switching)
 * live in ModuleTour.tsx.
 */

import ModuleTour from './ModuleTour'
import { type TourStep } from './moduleTour.helpers'

export type TourTabId =
  | 'overview'
  | 'scholarships'
  | 'scholarship-search'
  | 'deadlines'
  | 'aid-compare'

interface Props {
  onDismiss: () => void
  onStart?: () => void
  onSwitchTab?: (tabId: TourTabId) => void
}

const STEPS: TourStep<TourTabId>[] = [
  {
    selector: '[data-tour="sidebar"]',
    pad: 8,
    title: 'Module Navigation',
    desc: 'Switch between sections here. Your overall progress is tracked at the bottom.',
    keepClear: ['sidebar'],
  },

  {
    selector: '[data-tour="tab-overview"]',
    pad: 6,
    title: 'Overview',
    desc: 'Start here — articles, quizzes, and tasks that build your financial aid knowledge step by step.',
    switchTab: 'overview',
    keepClear: ['sidebar', 'content'],
  },
  {
    selector: '[data-tour="overview-progress"]',
    pad: 8,
    title: 'Your Progress',
    desc: 'Track how far along you are. Items update automatically as you complete them.',
    switchTab: 'overview',
    keepClear: ['content'],
  },
  {
    selector: '[data-tour="content"]',
    pad: 10,
    title: 'Checklist',
    desc: 'Click any item to open its content — articles, quizzes, and action items. Check them off as you go.',
    switchTab: 'overview',
    keepClear: ['content'],
  },

  {
    selector: '[data-tour="tab-scholarships"]',
    pad: 6,
    title: 'Scholarships',
    desc: 'Build and manage your personal scholarship tracker, or browse our database to discover new opportunities.',
    switchTab: 'scholarships',
    keepClear: ['sidebar', 'content'],
  },
  {
    selector: '[data-tour="scholarships-toggle"]',
    pad: 8,
    title: 'Tracker vs. Discover',
    desc: '"My Tracker" is your personal list. "Discover" lets you browse and add scholarships from our database.',
    switchTab: 'scholarships',
    keepClear: ['content'],
  },

  {
    selector: '[data-tour="tab-scholarship-search"]',
    pad: 6,
    title: 'Aid Engine',
    desc: 'Our matching engine scores scholarships against your profile. Higher match percentage = better fit for you.',
    switchTab: 'scholarship-search',
    keepClear: ['sidebar', 'content'],
  },
  {
    selector: '[data-tour="aid-engine-filters"]',
    pad: 8,
    title: 'Search & Filter',
    desc: 'Search by name, filter by match strength, type, or deadline, and sort to find the best opportunities fast.',
    switchTab: 'scholarship-search',
    keepClear: ['content'],
  },

  {
    selector: '[data-tour="tab-deadlines"]',
    pad: 6,
    title: 'Deadlines',
    desc: 'Track financial aid deadlines for your college list. Missing a priority deadline can cost thousands.',
    switchTab: 'deadlines',
    keepClear: ['sidebar', 'content'],
  },
  {
    selector: '[data-tour="deadlines-search"]',
    pad: 8,
    title: 'Add Colleges',
    desc: 'Search and add colleges to see their FAFSA, CSS Profile, and aid letter deadlines with urgency indicators.',
    switchTab: 'deadlines',
    keepClear: ['content'],
  },

  {
    selector: '[data-tour="tab-aid-compare"]',
    pad: 6,
    title: 'Aid Compare',
    desc: 'Compare cost of attendance and estimated aid across your college list side by side.',
    switchTab: 'aid-compare',
    keepClear: ['sidebar', 'content'],
  },
  {
    selector: '[data-tour="aid-compare-search"]',
    pad: 8,
    title: 'Compare Costs',
    desc: 'Add colleges, then enter estimated aid from each school\'s Net Price Calculator to see your real net cost.',
    switchTab: 'aid-compare',
    keepClear: ['content'],
  },

  {
    selector: '[data-tour="chat"]',
    pad: 8,
    title: 'AI Advisor',
    desc: "Have questions? Ask the AI advisor anything about FAFSA, scholarships, or aid packages. No question is too basic.",
    switchTab: 'overview',
    keepClear: ['chat'],
  },

  {
    selector: '[data-tour="breadcrumb"]',
    pad: 6,
    title: 'Navigation',
    desc: 'Get back to the dashboard anytime from here, or press Esc to close.',
    keepClear: ['breadcrumb'],
  },
]

export default function FafsaModuleTour({ onDismiss, onStart, onSwitchTab }: Props) {
  return (
    <ModuleTour<TourTabId>
      steps={STEPS}
      introText="Here's your financial aid hub."
      introSub="Let's take a quick look at everything you have access to."
      onDismiss={onDismiss}
      onStart={onStart}
      onSwitchTab={onSwitchTab}
      resetTab="overview"
    />
  )
}
