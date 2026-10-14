import { describe, it, expect } from 'vitest'
import { identityGaps } from './profiles'
import type { UserProfile } from '../types/user'

const profile = (over: Partial<UserProfile> = {}) =>
  ({ display_name: null, avatar_url: null, ...over }) as UserProfile

const google = {
  name: 'Danial Beg',
  full_name: 'Danial Beg',
  avatar_url: 'https://lh3.googleusercontent.com/a/abc123',
  picture: 'https://lh3.googleusercontent.com/a/abc123',
}

describe('identityGaps', () => {
  it('takes a first name and a picture when the profile has neither', () => {
    // Google sends one full name and no given_name, and the app greets people
    // by first name.
    expect(identityGaps(profile(), google)).toEqual({
      display_name: 'Danial',
      avatar_url: 'https://lh3.googleusercontent.com/a/abc123',
    })
  })

  it('never overwrites the name the student chose', () => {
    // display_name is the first name from the intro survey. Google's idea of
    // their name does not get to replace it.
    expect(identityGaps(profile({ display_name: 'Dani' }), google))
      .toEqual({ avatar_url: 'https://lh3.googleusercontent.com/a/abc123' })
  })

  it('does nothing when there is nothing to fill', () => {
    expect(identityGaps(profile({ display_name: 'Dani', avatar_url: 'https://x/y' }), google)).toBeNull()
    expect(identityGaps(profile(), {})).toBeNull()
    expect(identityGaps(profile(), undefined)).toBeNull()
  })

  it('falls back to the claims an email signup actually has', () => {
    // An email account carries neither, so nothing is invented for it.
    expect(identityGaps(profile(), { email: 'a@b.c', email_verified: true })).toBeNull()
  })

  it('refuses a picture that is not somewhere a browser would fetch from', () => {
    expect(identityGaps(profile(), { ...google, avatar_url: 'javascript:alert(1)', picture: '' }))
      .toEqual({ display_name: 'Danial' })
    expect(identityGaps(profile(), { ...google, avatar_url: 'http://insecure/x', picture: '' }))
      .toEqual({ display_name: 'Danial' })
  })

  it('ignores a blank or whitespace-only name', () => {
    expect(identityGaps(profile(), { name: '   ', avatar_url: '' })).toBeNull()
  })
})
