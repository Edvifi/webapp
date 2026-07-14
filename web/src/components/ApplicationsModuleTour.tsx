import ModuleTour from './ModuleTour'
import { type TourStep } from './moduleTour.helpers'

export type ApplicationsTabId = 'overview' | 'discover' | 'list' | 'status'

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
    desc: 'Three sections: the strategy checklist, your college list, and a status tracker for each application.',
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
    selector: '[data-tour="tab-list"]',
    pad: 6,
    title: 'College List',
    desc: 'Build your balanced list — reaches, matches, and safeties. Add colleges and tag each with its deadline type.',
    switchTab: 'list',
    keepClear: ['sidebar', 'content'],
  },
  {
    selector: '[data-tour="tab-status"]',
    pad: 6,
    title: 'Application Status',
    desc: 'Track each application from "not started" through submission and into decisions. One source of truth for where you stand.',
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
