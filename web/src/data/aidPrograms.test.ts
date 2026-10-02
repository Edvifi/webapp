import { describe, expect, it } from 'vitest'
import { grantStateFromZip } from './aidPrograms'

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
