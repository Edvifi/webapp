import ModuleTour from './ModuleTour'
import { type TourStep } from './moduleTour.helpers'

export type EcTabId = 'overview' | 'activities'

interface Props {
  onDismiss: () => void
  onStart?: () => void
  onSwitchTab?: (tabId: EcTabId) => void
}

const STEPS: TourStep<EcTabId>[] = [
  {
    selector: '[data-tour="sidebar"]',
    pad: 8,
    title: 'Module Navigation',
    desc: 'Two sections: the strategy checklist and your activities list. Progress sticks at the bottom.',
    keepClear: ['sidebar'],
  },
  {
    selector: '[data-tour="tab-overview"]',
    pad: 6,
    title: 'Overview',
    desc: 'Articles on depth vs. breadth, leadership, summer planning, and how to write strong activity descriptions.',
    switchTab: 'overview',
    keepClear: ['sidebar', 'content'],
  },
  {
    selector: '[data-tour="tab-activities"]',
    pad: 6,
    title: 'Activities',
    desc: 'Build your Common App activity list — 10 slots, ranked by importance. Each slot mirrors the Common App\'s actual fields.',
    switchTab: 'activities',
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

export default function ExtracurricularsModuleTour({ onDismiss, onStart, onSwitchTab }: Props) {
  return (
    <ModuleTour<EcTabId>
      steps={STEPS}
      introText="Your activities, sharpened."
      introSub="Depth beats breadth. Lead with what you actually do."
      onDismiss={onDismiss}
      onStart={onStart}
      onSwitchTab={onSwitchTab}
      resetTab="overview"
    />
  )
}
