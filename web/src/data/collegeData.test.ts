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

  it("appears in the school's own net-price-calculator URL", () => {
    // npcUrl is maintained separately, so it corroborates `domain`: a typo like
    // "harvrad.edu" is shaped like a domain and unique, so only cross-checking a
    // second field catches it.
    //
    // Some colleges outsource the calculator, and for those the school's own
    // domain legitimately does not appear. None of the current 46 do. Listing
    // the known providers keeps that case from failing on correct data, rather
    // than weakening the check for the other 46.
    const OUTSOURCED = /collegeboard\.org|ruffalonl\.com|mycollegecosts\.|tuitionfit\./
    for (const c of COLLEGES) {
      if (OUTSOURCED.test(c.npcUrl)) continue
      expect(c.npcUrl, `${c.id}: domain "${c.domain}" is absent from its npcUrl — typo, or a calculator host to add to OUTSOURCED`).toContain(c.domain)
    }
  })
})
