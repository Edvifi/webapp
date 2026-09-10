import { describe, it, expect } from 'vitest'
import { parseFlag } from './featureFlags'

describe('parseFlag', () => {
  it('is off when unset or blank (features ship dark)', () => {
    expect(parseFlag(undefined)).toBe(false)
    expect(parseFlag('')).toBe(false)
    expect(parseFlag('   ')).toBe(false)
  })
  it('honours an explicit default only when the value is missing', () => {
    expect(parseFlag(undefined, true)).toBe(true)
    expect(parseFlag('false', true)).toBe(false)
  })
  it('accepts the usual truthy spellings, case-insensitively', () => {
    for (const v of ['1', 'true', 'TRUE', 'True ', 'yes', 'on']) expect(parseFlag(v)).toBe(true)
  })
  it('treats anything else as off', () => {
    for (const v of ['0', 'false', 'off', 'no', 'enabled', 'random']) expect(parseFlag(v)).toBe(false)
  })
})
