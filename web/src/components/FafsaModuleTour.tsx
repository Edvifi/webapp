/**
 * FafsaModuleTour — Financial Aid module's guided tour.
 *
 * Thin wrapper over <ModuleTour /> that supplies FAFSA-specific steps
 * and intro copy. The generic mechanics (spotlight, blur, tab switching)
 * live in ModuleTour.tsx.
 */

import ModuleTour from './ModuleTour'
import { type TourStep } from './moduleTour.helpers'
import { MODULE_COLORS } from '../lib/designTokens'

export type TourTabId =
  | 'overview'
  | 'scholarships-101'
  | 'scholarships'
  | 'scholarship-search'

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
    desc: 'Switch between sections here. Your overall progress shows under them.',
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
    selector: '[data-tour="tab-scholarships-101"]',
    pad: 6,
    title: 'Scholarships 101',
    desc: 'How scholarships work, where to find ones you qualify for, and how to apply, in six short steps.',
    switchTab: 'scholarships-101',
    keepClear: ['sidebar', 'content'],
  },

  {
    selector: '[data-tour="tab-scholarship-search"]',
    pad: 6,
    title: 'Scholarship Engine',
    // Points at the tab, not into it: on a first visit the tab is the
    // preferences form, so its filters aren't there to point at yet.
    desc: 'Answer a few questions and we score every scholarship for how well it fits you, with a few picked to start on. Track the ones worth applying to.',
    switchTab: 'scholarship-search',
    keepClear: ['sidebar', 'content'],
  },

  {
    selector: '[data-tour="tab-scholarships"]',
    pad: 6,
    title: 'Aid Tracker',
    desc: 'When the FAFSA and CSS Profile are due at each of your schools, then every scholarship you track, with its deadline, its status and a checklist of what to send.',
    switchTab: 'scholarships',
    keepClear: ['sidebar', 'content'],
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
      accent={MODULE_COLORS.financialAid}
    />
  )
}
