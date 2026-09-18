import { describe, it, expect } from 'vitest'
import { COLLEGES } from './collegeData'
import { domainOf } from '../lib/collegeLogo'

/**
 * `domain` feeds an image URL, so a typo degrades silently: logo.dev 404s and
 * the card quietly falls back to its emoji, which is exactly what the field was
 * added to stop. TypeScript proves the field exists; only these checks prove it
 * is shaped like a domain.
 */
describe('college domains', () => {
  it('every college has a bare registrable domain', () => {
    for (const c of COLLEGES) {
      expect(c.domain, c.id).toMatch(/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/)
      expect(c.domain, `${c.id} should not carry a scheme, path or www.`).toBe(
        domainOf(c.domain),
      )
    }
  })

  it('no two colleges share a domain', () => {
    const seen = new Map<string, string>()
    for (const c of COLLEGES) {
      const prior = seen.get(c.domain)
      expect(prior, `${c.id} duplicates ${prior}'s domain ${c.domain}`).toBeUndefined()
      seen.set(c.domain, c.id)
    }
  })

  it("the domain matches the school's own net-price-calculator host", () => {
    // npcUrl is independently maintained, so it is a genuine second source:
    // if someone edits one and not the other, this catches the drift.
    for (const c of COLLEGES) {
      expect(domainOf(c.npcUrl), c.id).toBe(c.domain)
    }
  })
})
