import ModuleTour from './ModuleTour'
import { type TourStep } from './moduleTour.helpers'

export type TestingTabId = 'overview' | 'calendar' | 'resources'

interface Props {
  onDismiss: () => void
  onStart?: () => void
  onSwitchTab?: (tabId: TestingTabId) => void
}

const STEPS: TourStep<TestingTabId>[] = [
  {
    selector: '[data-tour="sidebar"]',
    pad: 8,
    title: 'Module Navigation',
    desc: 'Three sections: Overview, Test Calendar, and Prep Resources. Your progress sticks to the bottom.',
    keepClear: ['sidebar'],
  },
  {
    selector: '[data-tour="tab-overview"]',
    pad: 6,
    title: 'Overview',
    desc: 'Your test prep checklist. Articles to read, quizzes to take, and tasks to complete — covering test choice, prep, scoring, and APs.',
    switchTab: 'overview',
    keepClear: ['sidebar', 'content'],
  },
  {
    selector: '[data-tour="tab-calendar"]',
    pad: 6,
    title: 'Test Calendar',
    desc: 'Upcoming SAT, ACT, and PSAT dates with registration deadlines. Plan around your school year.',
    switchTab: 'calendar',
    keepClear: ['sidebar', 'content'],
  },
  {
    selector: '[data-tour="tab-resources"]',
    pad: 6,
    title: 'Prep Resources',
    desc: 'Curated free and paid prep — Khan Academy, ACT Academy, UWorld, and more. Filtered by cost and format.',
    switchTab: 'resources',
    keepClear: ['sidebar', 'content'],
  },
  {
    selector: '[data-tour="breadcrumb"]',
    pad: 6,
    title: 'Navigation',
    desc: 'Get back to the dashboard from here, or press Esc to close the tour.',
    keepClear: ['breadcrumb'],
  },
]

export default function TestingModuleTour({ onDismiss, onStart, onSwitchTab }: Props) {
  return (
    <ModuleTour<TestingTabId>
      steps={STEPS}
      introText="Welcome to test prep."
      introSub="SAT, ACT, APs, and the strategy to navigate them all."
      onDismiss={onDismiss}
      onStart={onStart}
      onSwitchTab={onSwitchTab}
      resetTab="overview"
    />
  )
}
