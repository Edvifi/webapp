/**
 * Contrast of the text tokens against the surfaces they are used on.
 *
 * These are read out of index.css rather than duplicated here, so the test
 * fails when someone lightens a token rather than when someone forgets to
 * update a copy of it.
 *
 * It exists because the tokens had drifted a long way below legibility without
 * anything noticing: --text-faint measured 1.62:1 on the card background, and
 * a past day in the week strip compounded it to 1.28:1.
 */

/// <reference types="node" />
// Referenced here rather than added to tsconfig's `types`, which is limited to
// vite/client on purpose: app code has no business seeing node's globals.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'

// The stylesheet is the source of truth, so there is no second copy of these
// values to drift. Vitest runs from web/.
const raw = readFileSync(resolvePath(process.cwd(), 'src/index.css'), 'utf8')
// Comments mention token names — one of them says "between --card-bg and
// --surface" — and would otherwise be read as declarations.
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '')

/** The first value each custom property is given, per theme block. */
function tokens(block: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of block.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) {
    if (!(m[1] in out)) out[m[1]] = m[2].trim()
  }
  return out
}

const lightBlock = css.slice(css.indexOf(':root {'), css.indexOf('[data-theme="dark"]'))
const darkBlock = css.slice(css.indexOf('[data-theme="dark"]'), css.indexOf('[data-theme="dark"]') + 1400)

const srgb = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = ([r, g, b]: number[]) =>
  0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255)
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const hex = (h: string) => {
  const v = h.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16))
}
const over = (fg: number[], alpha: number, bg: number[]) =>
  fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)))

/** Resolve `rgba(var(--ink-rgb), 0.6)` or `#962929` against a background. */
function resolve(value: string, t: Record<string, string>, bg: number[]): number[] {
  const rgba = /rgba\(var\((--[a-z-]+)\),\s*([\d.]+)\)/.exec(value)
  if (!rgba) return hex(value)
  const channels = t[rgba[1]].split(',').map((n) => Number(n.trim()))
  return over(channels, Number(rgba[2]), bg)
}

describe.each([
  ['light', tokens(lightBlock), ['--card-bg', '--surface', '--bg']],
  ['dark', { ...tokens(lightBlock), ...tokens(darkBlock) }, ['--card-bg', '--surface', '--bg']],
])('%s theme', (_theme, t, surfaces) => {
  const backgrounds = surfaces.map((s) => hex(t[s]))
  const worst = (token: string) =>
    Math.min(...backgrounds.map((bg) => contrast(resolve(t[token], t, bg), bg)))

  // Text a student reads: day names, dates, bucket headings, meta lines.
  it('--text-muted clears 4.5:1 on every surface', () => {
    expect(worst('--text-muted')).toBeGreaterThanOrEqual(4.5)
  })

  // Chips and tags, a deliberate step quieter but still legible.
  it('--text-faint clears 3:1 on every surface', () => {
    expect(worst('--text-faint')).toBeGreaterThanOrEqual(3)
  })

  it.each(['--c-late', '--c-soon', '--c-go'])('%s clears 4.5:1 on every surface', (token) => {
    expect(worst(token)).toBeGreaterThanOrEqual(4.5)
  })

  // .wk-day--past dims the whole column, which multiplies into its text.
  it('a past day in the week strip stays above 3:1', () => {
    const dim = Number(/\.wk-day--past \{ opacity: ([\d.]+)/.exec(css)![1])
    const alpha = Number(/rgba\(var\(--ink-rgb\),\s*([\d.]+)\)/.exec(t['--text-muted'])![1])
    const channels = t['--ink-rgb'].split(',').map((n) => Number(n.trim()))
    const ratio = Math.min(
      ...backgrounds.map((bg) => contrast(over(channels, alpha * dim, bg), bg)),
    )
    expect(ratio).toBeGreaterThanOrEqual(3)
  })
})
