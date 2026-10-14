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

  it('accepts shapes it has not seen before', () => {
    // The guard rejects what is obviously wrong; it does not try to match
    // Google's format exactly. An id turned away for being unfamiliar fails
    // silently — the button is just missing — which is harder to trace than
    // the error page this exists to prevent.
    expect(googleClientId('123456789012.apps.googleusercontent.com'))
      .toBe('123456789012.apps.googleusercontent.com')
    expect(googleClientId('123-AbC_xyz.apps.googleusercontent.com'))
      .toBe('123-AbC_xyz.apps.googleusercontent.com')
  })

  it('still rejects anything with a scheme or a path in it', () => {
    expect(googleClientId(`//${REAL}`)).toBeUndefined()
    expect(googleClientId(`${REAL}/extra`)).toBeUndefined()
    expect(googleClientId(`a b.apps.googleusercontent.com`)).toBeUndefined()
  })
})
