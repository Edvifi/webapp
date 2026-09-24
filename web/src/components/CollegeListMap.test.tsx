import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CollegeListMap from './CollegeListMap'
import { US_STATES } from '../data/usStatesGeo'
import type { ApplicationEntry } from '../data/applicationsChecklist'

const entry = (collegeId: string, name: string, state: string): ApplicationEntry => ({
  collegeId, name, state, category: 'match', deadlineType: 'RD', status: 'not-started', mapX: 300, mapY: 300,
})

/** Outlines of states with schools: the only ones that take the pointer. */
const listedPaths = (container: HTMLElement) =>
  [...container.querySelectorAll('path')].filter((p) => p.style.pointerEvents === 'auto')
const tinted = (container: HTMLElement, strength: '12%' | '30%') =>
  [...container.querySelectorAll('path')].filter((p) => (p.getAttribute('fill') ?? '').includes(strength))

describe('CollegeListMap', () => {
  it('tints states with schools faintly, and deepens and lists one on hover', () => {
    const { container } = render(
      <CollegeListMap apps={[entry('sc-1', 'Stanford University', 'CA'), entry('sc-2', 'UC Santa Cruz', 'CA')]} />,
    )
    expect(tinted(container, '12%')).toHaveLength(1)
    const listed = listedPaths(container)
    expect(listed).toHaveLength(1)
    fireEvent.mouseEnter(listed[0], { clientX: 50, clientY: 50 })
    expect(tinted(container, '30%')).toHaveLength(1)
    expect(screen.getByText('California')).toBeInTheDocument()
    expect(screen.getByText('· 2 schools')).toBeInTheDocument()
    expect(screen.getByText('UC Santa Cruz')).toBeInTheDocument()
    fireEvent.mouseLeave(listed[0])
    expect(screen.queryByText('California')).not.toBeInTheDocument()
  })

  it("tints every state with schools for highlightState 'all'", () => {
    const { container } = render(
      <CollegeListMap apps={[entry('sc-1', 'A', 'CA'), entry('sc-2', 'B', 'TX'), entry('sc-3', 'C', 'NY')]} highlightState="all" />,
    )
    expect(tinted(container, '30%')).toHaveLength(3)
  })

  it('uses the caller’s resolved states when an entry has none', () => {
    const noState = { ...entry('sc-1', 'Legacy School', ''), state: undefined }
    const { container } = render(<CollegeListMap apps={[noState]} schoolStates={new Map([['sc-1', 'TX']])} />)
    expect(listedPaths(container)).toHaveLength(1)
  })

  it('does not re-render the state outlines as the mouse moves', () => {
    const { container } = render(<CollegeListMap apps={[entry('sc-1', 'Stanford University', 'CA')]} />)
    const [ca] = listedPaths(container)
    fireEvent.mouseEnter(ca, { clientX: 50, clientY: 50 }) // hover starts: one re-render to tint it
    // The outline layer renders by mapping US_STATES; count that from here on.
    const renders = vi.spyOn(US_STATES, 'map')
    for (let i = 0; i < 20; i++) fireEvent.mouseMove(ca, { clientX: 60 + i, clientY: 60 + i })
    expect(renders).not.toHaveBeenCalled()
    renders.mockRestore()
  })

  // jsdom has no layout: give the map a 600×400 box at the page origin.
  const withMapBox = () => vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
    { left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400, x: 0, y: 0, toJSON: () => ({}) } as DOMRect,
  )

  it('positions the tooltip beside the cursor as soon as it appears', () => {
    const box = withMapBox()
    const { container } = render(<CollegeListMap apps={[entry('sc-1', 'Stanford University', 'CA')]} />)
    fireEvent.mouseEnter(listedPaths(container)[0], { clientX: 50, clientY: 70 })
    const tip = screen.getByText('California').parentElement as HTMLElement
    expect(tip.style.left).toBe('64px')
    expect(tip.style.top).toBe('84px')
    expect(tip.style.transform).toBe('translate(0, 0)')
    box.mockRestore()
  })

  it('flips the tooltip left near the map’s right edge', () => {
    const box = withMapBox()
    const width = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(180)
    const { container } = render(<CollegeListMap apps={[entry('sc-1', 'Stanford University', 'CA')]} />)
    fireEvent.mouseEnter(listedPaths(container)[0], { clientX: 520, clientY: 70 })
    const tip = screen.getByText('California').parentElement as HTMLElement
    expect(tip.style.left).toBe('506px')
    expect(tip.style.transform).toBe('translate(-100%, 0)')
    width.mockRestore()
    box.mockRestore()
  })

  it('drops a pin hover when that school leaves the list', () => {
    const apps = [entry('sc-1', 'Stanford University', 'CA'), { ...entry('sc-2', 'MIT', 'MA'), mapX: 900, mapY: 200 }]
    const { container, rerender } = render(<CollegeListMap apps={apps} />)
    const pins = container.querySelectorAll('circle')
    fireEvent.mouseEnter(pins[1], { clientX: 10, clientY: 10 })
    expect(screen.getByText('MIT')).toBeInTheDocument()
    rerender(<CollegeListMap apps={[apps[0]]} />)
    expect(screen.queryByText('MIT')).not.toBeInTheDocument()
    expect(screen.queryByText('Stanford University')).not.toBeInTheDocument() // not shifted onto another school
  })
})
