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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ModuleOverviewTab from './ModuleOverviewTab'
import ModuleTabNav from './ModuleTabNav'
import { MODULE_ICONS } from './moduleIcons'
import { useState } from 'react'
import { routedItem, routedTab, useRoutedTab } from '../lib/hashRoute'
import type { ChecklistContent } from '../data/checklistContent'

type TabId = 'overview' | 'other'
const TABS = [
  { id: 'overview' as const, label: 'Overview', icon: MODULE_ICONS.overview },
  { id: 'other' as const, label: 'Other', icon: MODULE_ICONS.article },
]
const VALID = ['overview', 'other'] as const
const CHECKLIST = [{ title: 'Section', items: [
  { id: 'a-1', label: 'How to read this', type: 'article' as const },
  { id: 'a-2', label: 'And then this', type: 'article' as const },
] }]
const CONTENT: Record<string, ChecklistContent> = {
  'a-1': { id: 'a-1', title: 'How to read this', type: 'article', body: [{ kind: 'paragraph', text: 'Body text.' }] },
  'a-2': { id: 'a-2', title: 'And then this', type: 'article', body: [{ kind: 'paragraph', text: 'Second body.' }] },
}

/** The wiring every module uses: the open page lives in the route under its
 *  tab, and the open transition re-reads it. The modules stay mounted while
 *  closed, so leaving that transition out is what let an article survive a
 *  close and reopen — the harness carries it so the gap is visible here. */
const Harness = ({ open = true }: { open?: boolean }) => {
  const [tab, setTab, routedPage, setPage] = useRoutedTab<TabId>('Application Tracking', open, VALID, 'overview')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setTab(routedTab('Application Tracking', VALID) ?? 'overview'); setPage(routedItem('Application Tracking', VALID)) }
  }
  const article = tab === 'overview' && routedPage && ['a-1', 'a-2'].includes(routedPage) ? routedPage : null
  if (!open) return <div>closed</div>
  return (
    <div>
      <div data-testid="sidebar"><ModuleTabNav active={tab} onTab={setTab} progress={{}} totalItems={2} accent="#333" title="M" subtitle="S" tabs={TABS} /></div>
      {tab === 'overview'
        ? <ModuleOverviewTab
            progress={{}} onToggle={vi.fn()} onMarkComplete={vi.fn()}
            checklist={CHECKLIST} contentMap={CONTENT} allIds={['a-1', 'a-2']} totalItems={2}
            accent="#333" title="Overview" subtitle="sub"
            itemTypeIcon={{ article: null }}
            activeContentId={article} onOpenContent={setPage}
          />
        : <div>Other tab</div>}
    </div>
  )
}

const openArticle = async (ui = <Harness />) => {
  const r = render(ui)
  await userEvent.click(screen.getByText('How to read this'))
  expect(screen.getByText('Body text.')).toBeInTheDocument()
  return r
}

describe('leaving a checklist article', () => {
  beforeEach(() => { window.location.hash = '#/dashboard/application-tracking' })
  // Left set, the next file sharing this environment starts mid-module.
  afterEach(() => { window.location.hash = '' })

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

  it('does not reopen inside the article after the module is closed and reopened', async () => {
    // The module stays mounted while closed, so the open article is still in
    // this component's state. Without the open-transition re-read it reopens
    // on the article the student left — and rewrites the URL back to it.
    const { rerender } = await openArticle(<Harness open />)
    rerender(<Harness open={false} />)
    window.location.hash = '#/dashboard'
    rerender(<Harness open />)
    expect(screen.queryByText('Body text.')).not.toBeInTheDocument()
    expect(screen.getByText('How to read this')).toBeInTheDocument()
  })

  it('ignores an id the tab does not own, rather than reading it', async () => {
    // The item slot is shared across tabs, so a stale or hand-edited URL can
    // put anything in it; the reader must not try to render it.
    window.location.hash = '#/dashboard/application-tracking/overview/not-a-real-id'
    render(<Harness />)
    expect(screen.getByText('How to read this')).toBeInTheDocument()
    expect(screen.queryByText('Body text.')).not.toBeInTheDocument()
  })

  it('pages on with next without burying the way out in history', async () => {
    const user = userEvent.setup()
    await openArticle()
    const afterOpen = window.history.length
    await user.click(screen.getByRole('button', { name: /And then this/ }))
    expect(screen.getByText('Second body.')).toBeInTheDocument()
    // Reading on is a step inside the reader, not a new place to come back to.
    expect(window.history.length).toBe(afterOpen)
    expect(window.location.hash).toBe('#/dashboard/application-tracking/overview/a-2')
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
