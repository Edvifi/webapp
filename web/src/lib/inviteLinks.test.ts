import { describe, it, expect, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {} }))

import { byPlatform, inviteUrl, isValidSlug, NO_LINK, platformOf, rate, slugify, type InviteLinkStats } from './inviteLinks'

const row = (o: Partial<InviteLinkStats>): InviteLinkStats => ({
  slug: 'x', label: null, is_link: true, created_at: null, archived_at: null,
  visits: 0, signups: 0, invited: 0, joined: 0, onboarded: 0, last_signup_at: null, ...o,
})

describe('platformOf', () => {
  it('reads the platform from before the colon in a link’s name', () => {
    expect(platformOf({ slug: 'reddit-fafsa', label: 'Reddit: r/FAFSA' })).toBe('Reddit')
    expect(platformOf({ slug: 'nextdoor-cv', label: 'Nextdoor: Carmel Valley' })).toBe('Nextdoor')
  })

  it('puts a name with no platform, and a stray ref, under Other', () => {
    expect(platformOf({ slug: 'lincoln-high', label: 'Lincoln High — counselor email' })).toBe('Other')
    expect(platformOf({ slug: 'typo-link', label: null })).toBe('Other')
    expect(platformOf({ slug: null, label: null })).toBe(NO_LINK)
  })
})

describe('byPlatform', () => {
  it('sums each platform and sorts by signups, with No link last', () => {
    const groups = byPlatform([
      row({ slug: null, is_link: false, signups: 50 }),
      row({ slug: 'reddit-fafsa', label: 'Reddit: r/FAFSA', visits: 30, signups: 3, invited: 2 }),
      row({ slug: 'reddit-act', label: 'Reddit: r/ACT', visits: 10, signups: 1 }),
      row({ slug: 'nextdoor-cv', label: 'Nextdoor: Carmel Valley', visits: 5, signups: 2 }),
      row({ slug: 'typo-link', is_link: false, signups: 1 }),
    ])
    expect(groups.map((g) => g.platform)).toEqual(['Reddit', 'Nextdoor', 'Other', NO_LINK])
    expect(groups[0]).toMatchObject({ links: 2, visits: 40, signups: 4, invited: 2 })
    // A stray ref is counted for its signups but is not a link.
    expect(groups[2]).toMatchObject({ links: 0, signups: 1 })
  })
})

describe('slugify', () => {
  it('turns a human name into a slug the SQL check accepts', () => {
    expect(slugify('TikTok — Fall Push!')).toBe('tiktok-fall-push')
    expect(slugify('  Lincoln High School  ')).toBe('lincoln-high-school')
    expect(slugify('Café Ñandú')).toBe('cafe-nandu')
  })

  it('never leaves a leading or trailing dash, even after truncating', () => {
    const s = slugify('a'.repeat(47) + ' bcd')
    expect(s.length).toBeLessThanOrEqual(48)
    expect(s.endsWith('-')).toBe(false)
    expect(isValidSlug(s)).toBe(true)
    expect(slugify('--hi--')).toBe('hi')
  })

  it('is empty when nothing usable is left', () => {
    expect(slugify('!!!')).toBe('')
  })
})

describe('isValidSlug', () => {
  it('matches invite_links_slug_shape', () => {
    expect(isValidSlug('lincoln-high')).toBe(true)
    expect(isValidSlug('2027-seniors')).toBe(true)
    expect(isValidSlug('')).toBe(false)
    expect(isValidSlug('-leading')).toBe(false)
    expect(isValidSlug('Upper')).toBe(false)
    expect(isValidSlug('has space')).toBe(false)
    expect(isValidSlug('a'.repeat(48))).toBe(true)
    expect(isValidSlug('a'.repeat(49))).toBe(false)
  })
})

describe('inviteUrl', () => {
  it('points at the waitlist form with the ref the form reads', () => {
    const url = new URL(inviteUrl('lincoln-high'))
    // The root: the landing page is one static page, and /home is a 404.
    expect(url.origin + url.pathname).toBe('https://edvifi.ai/')
    expect(url.searchParams.get('ref')).toBe('lincoln-high')
    expect(url.hash).toBe('#waitlist')
  })
})

describe('rate', () => {
  it('rounds to a whole percent and has no answer for an empty base', () => {
    expect(rate(1, 3)).toBe(33)
    expect(rate(5, 5)).toBe(100)
    expect(rate(3, 0)).toBeNull()
  })
})
