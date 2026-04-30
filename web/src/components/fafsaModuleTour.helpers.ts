/**
 * Pure helpers for FafsaModuleTour — extracted so they can be unit tested
 * without a DOM environment.
 */

export interface Rect { x: number; y: number; w: number; h: number }

const TOOLTIP_WIDTH = 320

/**
 * Position the tooltip relative to the spotlight rect, keeping it on-screen.
 *
 *  - If the spotlight is on the left third → put tooltip to its right.
 *  - Else if the spotlight is in the top half → put tooltip below it.
 *  - Otherwise → put tooltip above it.
 */
export function computeTooltipPos(
  rect: Rect,
  vw: number,
  vh: number,
): { top: number; left: number } {
  const spotCx = rect.x + rect.w / 2
  const spotCy = rect.y + rect.h / 2

  if (spotCx < vw * 0.35) {
    return {
      top: Math.max(16, Math.min(rect.y, vh - 220)),
      left: Math.min(rect.x + rect.w + 16, vw - TOOLTIP_WIDTH - 16),
    }
  }
  if (spotCy < vh * 0.5) {
    return {
      top: Math.min(rect.y + rect.h + 16, vh - 200),
      left: Math.max(16, Math.min(spotCx - TOOLTIP_WIDTH / 2, vw - TOOLTIP_WIDTH - 16)),
    }
  }
  return {
    top: Math.max(16, rect.y - 200),
    left: Math.max(16, Math.min(spotCx - TOOLTIP_WIDTH / 2, vw - TOOLTIP_WIDTH - 16)),
  }
}
