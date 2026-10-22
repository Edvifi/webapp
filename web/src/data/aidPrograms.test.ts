import { describe, expect, it } from 'vitest'
import { grantStateFromZip, stateFromZip } from './aidPrograms'

describe('grantStateFromZip', () => {
  it('maps ZIPs in the five grant states', () => {
    expect(grantStateFromZip('94720')).toBe('CA')
    expect(grantStateFromZip('10027')).toBe('NY')
    expect(grantStateFromZip('00501')).toBe('NY')
    expect(grantStateFromZip('78712')).toBe('TX')
    expect(grantStateFromZip('73301')).toBe('TX')
    expect(grantStateFromZip('33101')).toBe('FL')
    expect(grantStateFromZip('30332')).toBe('GA')
    expect(grantStateFromZip('39901')).toBe('GA')
  })

  it('returns null for other states, military ZIPs and junk', () => {
    expect(grantStateFromZip('48109')).toBeNull() // Michigan
    expect(grantStateFromZip('34001')).toBeNull() // APO AA
    expect(grantStateFromZip('')).toBeNull()
    expect(grantStateFromZip(null)).toBeNull()
    expect(grantStateFromZip('ab123')).toBeNull()
    // A ZIP saved without its leading zero (07501, New Jersey) is not Texas.
    expect(grantStateFromZip('7501')).toBeNull()
  })
})

describe('stateFromZip', () => {
  it('maps a ZIP in every state and DC', () => {
    const zips: Record<string, string> = {
      '35203': 'AL', '99501': 'AK', '85001': 'AZ', '72201': 'AR', '94720': 'CA', '80202': 'CO',
      '06511': 'CT', '19901': 'DE', '20001': 'DC', '33101': 'FL', '30332': 'GA', '96813': 'HI',
      '83702': 'ID', '60601': 'IL', '46204': 'IN', '50309': 'IA', '66101': 'KS', '40202': 'KY',
      '70112': 'LA', '04101': 'ME', '21201': 'MD', '02139': 'MA', '48109': 'MI', '55401': 'MN',
      '39201': 'MS', '63101': 'MO', '59601': 'MT', '68102': 'NE', '89101': 'NV', '03101': 'NH',
      '08540': 'NJ', '87501': 'NM', '10027': 'NY', '27601': 'NC', '58501': 'ND', '43215': 'OH',
      '73102': 'OK', '97201': 'OR', '19104': 'PA', '02903': 'RI', '29201': 'SC', '57501': 'SD',
      '37203': 'TN', '78712': 'TX', '84101': 'UT', '05401': 'VT', '22201': 'VA', '98101': 'WA',
      '25301': 'WV', '53202': 'WI', '82001': 'WY',
    }
    for (const [zip, state] of Object.entries(zips)) expect([zip, stateFromZip(zip)]).toEqual([zip, state])
  })

  it('handles the prefixes that sit inside another state’s range', () => {
    expect(stateFromZip('05501')).toBe('MA') // Andover, among Vermont's
    expect(stateFromZip('20101')).toBe('VA') // Dulles, among DC's
    expect(stateFromZip('73301')).toBe('TX') // Austin IRS, among Oklahoma's
    expect(stateFromZip('88510')).toBe('TX') // El Paso, after New Mexico
  })

  it('reads military, territory and malformed ZIPs as no state', () => {
    for (const zip of ['34001', '09001', '96201', '00601', '00801', '96910', '7501', '', null]) {
      expect(stateFromZip(zip)).toBeNull()
    }
  })
})
