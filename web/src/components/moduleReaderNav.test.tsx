/**
 * Leaving a checklist article.
 *
 * The reader used to be the Overview tab's own state, so nothing outside it
 * could close it: clicking the tab you were already on changes no tab id, so
 * nothing re-rendered and the article stayed up while the sidebar and the
 * breadcrumb both looked live and did nothing. The in-page Back was the only
 * way out.
 *
 * Every module wires this the same way — useRoutedTab owns the open page and
 * ModuleOverviewTab is told what to show — so this exercises that pattern
 * rather than any one module, which would need the whole provider stack.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ModuleOverviewTab from './ModuleOverviewTab'
import ModuleTabNav from './ModuleTabNav'
import { MODULE_ICONS } from './moduleIcons'
import { useRoutedTab } from '../lib/hashRoute'
import type { ChecklistContent } from '../data/checklistContent'

type TabId = 'overview' | 'other'
const TABS = [
  { id: 'overview' as const, label: 'Overview', icon: MODULE_ICONS.overview },
  { id: 'other' as const, label: 'Other', icon: MODULE_ICONS.article },
]
const CHECKLIST = [{ title: 'Section', items: [{ id: 'a-1', label: 'How to read this', type: 'article' as const }] }]
const CONTENT: Record<string, ChecklistContent> = {
  'a-1': { id: 'a-1', title: 'How to read this', type: 'article', body: [{ kind: 'paragraph', text: 'Body text.' }] },
}

/** The wiring every module uses: the open page lives in the route, under its tab. */
const Harness = () => {
  const [tab, setTab, routedPage, setPage] = useRoutedTab<TabId>('Application Tracking', true, ['overview', 'other'], 'overview')
  const article = tab === 'overview' ? routedPage : null
  return (
    <div>
      <div data-testid="sidebar"><ModuleTabNav active={tab} onTab={setTab} progress={{}} totalItems={1} accent="#333" title="M" subtitle="S" tabs={TABS} /></div>
      {tab === 'overview'
        ? <ModuleOverviewTab
            progress={{}} onToggle={vi.fn()} onMarkComplete={vi.fn()}
            checklist={CHECKLIST} contentMap={CONTENT} allIds={['a-1']} totalItems={1}
            accent="#333" title="Overview" subtitle="sub"
            itemTypeIcon={{ article: null }}
            activeContentId={article} onOpenContent={setPage}
          />
        : <div>Other tab</div>}
    </div>
  )
}

const openArticle = async () => {
  render(<Harness />)
  await userEvent.click(screen.getByText('How to read this'))
  expect(screen.getByText('Body text.')).toBeInTheDocument()
}

describe('leaving a checklist article', () => {
  beforeEach(() => { window.location.hash = '#/dashboard/application-tracking' })

  it('closes it from the sidebar tab it is already on', async () => {
    await openArticle()
    await userEvent.click(within(screen.getByTestId('sidebar')).getByRole('button', { name: /Overview/ }))
    expect(screen.queryByText('Body text.')).not.toBeInTheDocument()
    expect(screen.getByText('How to read this')).toBeInTheDocument()
  })

  it('closes it from a different sidebar tab', async () => {
    await openArticle()
    await userEvent.click(within(screen.getByTestId('sidebar')).getByRole('button', { name: /Other/ }))
    expect(screen.queryByText('Body text.')).not.toBeInTheDocument()
    expect(screen.getByText('Other tab')).toBeInTheDocument()
  })

  it('puts the article in the URL, so Back leaves it too', async () => {
    await openArticle()
    expect(window.location.hash).toBe('#/dashboard/application-tracking/overview/a-1')
    act(() => {
      window.location.hash = '#/dashboard/application-tracking/overview'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.queryByText('Body text.')).not.toBeInTheDocument()
    expect(screen.getByText('How to read this')).toBeInTheDocument()
  })
})
