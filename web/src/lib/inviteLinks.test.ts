import { describe, it, expect, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {} }))

import { inviteUrl, isValidSlug, rate, slugify } from './inviteLinks'

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
    expect(url.origin + url.pathname).toBe('https://edvifi.ai/home')
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
