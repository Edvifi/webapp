import ModuleTour from './ModuleTour'
import { type TourStep } from './moduleTour.helpers'

export type CpTabId = 'overview' | 'plan'

interface Props {
  onDismiss: () => void
  onStart?: () => void
  onSwitchTab?: (tabId: CpTabId) => void
}

const STEPS: TourStep<CpTabId>[] = [
  {
    selector: '[data-tour="sidebar"]',
    pad: 8,
    title: 'Module Navigation',
    desc: 'Two sections: rigor & AP strategy articles, plus your year-by-year course plan.',
    keepClear: ['sidebar'],
  },
  {
    selector: '[data-tour="tab-overview"]',
    pad: 6,
    title: 'Overview',
    desc: 'Articles on transcript rigor, the Honors-AP-DE choice, GPA mechanics, AP strategy by major, and senior-year mistakes to avoid.',
    switchTab: 'overview',
    keepClear: ['sidebar', 'content'],
  },
  {
    selector: '[data-tour="tab-plan"]',
    pad: 6,
    title: '4-Year Plan',
    desc: 'A grid for all four years × six course slots. Add courses, set level (Honors/AP/etc.), record grades — GPA estimates update live.',
    switchTab: 'plan',
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

export default function CoursePlanningModuleTour({ onDismiss, onStart, onSwitchTab }: Props) {
  return (
    <ModuleTour<CpTabId>
      steps={STEPS}
      introText="Your transcript, planned."
      introSub="Map every year. Know what to take, when, and why."
      onDismiss={onDismiss}
      onStart={onStart}
      onSwitchTab={onSwitchTab}
      resetTab="overview"
    />
  )
}
