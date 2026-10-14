import { describe, it, expect } from 'vitest'
import { googleClientId } from './auth'

const REAL = '669501234567-abc123def456ghi789jkl012mno345pq.apps.googleusercontent.com'

describe('googleClientId', () => {
  it('accepts a Google web client id', () => {
    expect(googleClientId(REAL)).toBe(REAL)
  })

  it('rejects the id with a scheme pasted on the front', () => {
    // What production actually held. Any non-empty string used to be enough,
    // so this reached Google and came back "Error 401: invalid_client" with no
    // fallback — worse than having no id at all.
    expect(googleClientId(`http://${REAL}`)).toBeUndefined()
    expect(googleClientId(`https://${REAL}`)).toBeUndefined()
  })

  it('treats absent, blank and malformed the same way', () => {
    // All of these must fall back to the redirect flow, which works.
    expect(googleClientId(undefined)).toBeUndefined()
    expect(googleClientId('')).toBeUndefined()
    expect(googleClientId('   ')).toBeUndefined()
    expect(googleClientId('not-a-client-id')).toBeUndefined()
    expect(googleClientId(REAL.replace('.apps.googleusercontent.com', ''))).toBeUndefined()
  })

  it('tolerates whitespace around a good value', () => {
    // A trailing newline from a paste should not cost anyone sign-in.
    expect(googleClientId(`  ${REAL}\n`)).toBe(REAL)
  })
})
