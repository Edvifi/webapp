import ModuleTour from './ModuleTour'
import { type TourStep } from './moduleTour.helpers'

export type ApplicationsTabId = 'overview' | 'discover' | 'status'

interface Props {
  onDismiss: () => void
  onStart?: () => void
  onSwitchTab?: (tabId: ApplicationsTabId) => void
}

const STEPS: TourStep<ApplicationsTabId>[] = [
  {
    selector: '[data-tour="sidebar"]',
    pad: 8,
    title: 'Module Navigation',
    desc: 'Three sections: the strategy checklist, Discover (get matched to best-fit colleges and build your list), and a status tracker for each application.',
    keepClear: ['sidebar'],
  },
  {
    selector: '[data-tour="tab-overview"]',
    pad: 6,
    title: 'Overview',
    desc: 'Articles and tasks covering list-building, ED vs. EA strategy, the submission workflow, and what happens after you submit.',
    switchTab: 'overview',
    keepClear: ['sidebar', 'content'],
  },
  {
    selector: '[data-tour="tab-discover"]',
    pad: 6,
    title: 'Discover',
    desc: 'Get matched across ~6,300 colleges — scored for how well each fits you on cost, major, size, and location, with a warm sense of your admission odds. Includes local community-college and transfer paths. Your list sits at the top, pinned on a map, and fills in as you add schools.',
    switchTab: 'discover',
    keepClear: ['sidebar', 'content'],
  },
  {
    selector: '[data-tour="tab-status"]',
    pad: 6,
    title: 'Application Status',
    desc: 'Track each application from "not started" through submission and into decisions. Open a school to set its round, work through its tasks, or take it off your list.',
    switchTab: 'status',
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

export default function ApplicationsModuleTour({ onDismiss, onStart, onSwitchTab }: Props) {
  return (
    <ModuleTour<ApplicationsTabId>
      steps={STEPS}
      introText="Your application HQ."
      introSub="Build your list, plan your strategy, and track every submission."
      onDismiss={onDismiss}
      onStart={onStart}
      onSwitchTab={onSwitchTab}
      resetTab="overview"
    />
  )
}
