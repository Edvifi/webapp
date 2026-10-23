import { describe, it, expect } from 'vitest'
import { stateAidDeadline } from './stateAidDeadlines'

const STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ')

describe('stateAidDeadline', () => {
  it('holds a real calendar day for every fixed date', () => {
    for (const st of STATES) {
      const d = stateAidDeadline(st)
      if (d?.kind !== 'fixed') continue
      const date = new Date(2027, d.month, d.day)
      // A typo like month 1, day 30 rolls into March; this catches it.
      expect([st, date.getMonth(), date.getDate()]).toEqual([st, d.month, d.day])
      expect(d.url).toMatch(/^https:\/\//)
    }
  })

  it('covers the dates the research confirmed', () => {
    const fixed = STATES.filter((st) => stateAidDeadline(st)?.kind === 'fixed')
    const asap = STATES.filter((st) => stateAidDeadline(st)?.kind === 'asap')
    expect(fixed).toHaveLength(25)
    expect(asap).toHaveLength(10)
  })

  it('accepts lower case and returns null for an unknown state', () => {
    expect(stateAidDeadline('ca')?.state).toBe('CA')
    expect(stateAidDeadline('ZZ')).toBeNull()
  })
})
