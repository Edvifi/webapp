import ModuleTour from './ModuleTour'
import { type TourStep } from './moduleTour.helpers'

export type EssaysTabId = 'overview' | 'drafts'

interface Props {
  onDismiss: () => void
  onStart?: () => void
  onSwitchTab?: (tabId: EssaysTabId) => void
}

const STEPS: TourStep<EssaysTabId>[] = [
  {
    selector: '[data-tour="sidebar"]',
    pad: 8,
    title: 'Module Navigation',
    desc: 'Two sections: writing strategy articles and your essay drafting workspace.',
    keepClear: ['sidebar'],
  },
  {
    selector: '[data-tour="tab-overview"]',
    pad: 6,
    title: 'Overview',
    desc: 'Articles on personal statement structure, brainstorming, supplemental essays, "Why us" strategy, and the revising-vs-polishing distinction.',
    switchTab: 'overview',
    keepClear: ['sidebar', 'content'],
  },
  {
    selector: '[data-tour="tab-drafts"]',
    pad: 6,
    title: 'Drafts',
    desc: 'Write and track each essay. Set a word target, write in a focused editor, see live word count, and mark drafts as Revising or Final when ready.',
    switchTab: 'drafts',
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

export default function EssaysModuleTour({ onDismiss, onStart, onSwitchTab }: Props) {
  return (
    <ModuleTour<EssaysTabId>
      steps={STEPS}
      introText="Your essays, drafted."
      introSub="Write the personal statement. Tackle every supplement. Track every draft."
      onDismiss={onDismiss}
      onStart={onStart}
      onSwitchTab={onSwitchTab}
      resetTab="overview"
    />
  )
}
