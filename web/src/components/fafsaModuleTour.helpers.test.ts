import { describe, it, expect } from 'vitest'
import { computeTooltipPos, type Rect } from './fafsaModuleTour.helpers'

const VW = 1440
const VH = 900

describe('computeTooltipPos', () => {
  it('places tooltip to the right when the spotlight is in the left third', () => {
    const rect: Rect = { x: 20, y: 200, w: 200, h: 80 }
    const pos = computeTooltipPos(rect, VW, VH)
    // To the right of the spotlight
    expect(pos.left).toBe(rect.x + rect.w + 16)
    expect(pos.top).toBe(rect.y)
  })

  it('places tooltip below when the spotlight is centered + in the top half', () => {
    const rect: Rect = { x: 600, y: 100, w: 200, h: 80 }
    const pos = computeTooltipPos(rect, VW, VH)
    expect(pos.top).toBe(rect.y + rect.h + 16)
  })

  it('places tooltip above when the spotlight is centered + in the bottom half', () => {
    const rect: Rect = { x: 600, y: 700, w: 200, h: 80 }
    const pos = computeTooltipPos(rect, VW, VH)
    expect(pos.top).toBe(rect.y - 200)
  })

  it('clamps the tooltip on-screen on the left edge', () => {
    const rect: Rect = { x: 600, y: 100, w: 100, h: 80 }
    const pos = computeTooltipPos(rect, VW, VH)
    expect(pos.left).toBeGreaterThanOrEqual(16)
  })

  it('clamps the tooltip on-screen on the right edge', () => {
    // Spotlight near the right edge
    const rect: Rect = { x: VW - 100, y: 100, w: 80, h: 80 }
    const pos = computeTooltipPos(rect, VW, VH)
    // Tooltip is 320 wide; right edge ≤ vw - 16
    expect(pos.left + 320).toBeLessThanOrEqual(VW - 16 + 0.001)
  })

  it('clamps the top so the tooltip never goes above the viewport', () => {
    // Bottom-half spotlight forces "above" branch — but rect.y - 200 could go negative
    const rect: Rect = { x: 600, y: 100, w: 200, h: 800 }
    const pos = computeTooltipPos(rect, VW, VH)
    // spotCy = 500, vh*0.5 = 450 → bottom-half branch → top = max(16, rect.y - 200) = max(16, -100) = 16
    expect(pos.top).toBe(16)
  })

  it('handles tiny viewports without crashing', () => {
    const rect: Rect = { x: 0, y: 0, w: 50, h: 50 }
    const pos = computeTooltipPos(rect, 320, 480)
    expect(Number.isFinite(pos.top)).toBe(true)
    expect(Number.isFinite(pos.left)).toBe(true)
  })
})
