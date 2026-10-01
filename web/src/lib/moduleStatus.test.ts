import { describe, it, expect } from 'vitest'
import { moduleStatusLines } from './moduleStatus'

const lines = (over: Partial<Parameters<typeof moduleStatusLines>[0]> = {}) =>
  moduleStatusLines({ colleges: 0, submitted: 0, scholarships: 0, ...over })

describe('moduleStatusLines', () => {
  it('tells a new student there is nothing there yet, rather than showing a zero', () => {
    expect(lines()['Application Tracking']).toBe('No colleges on your list yet')
    expect(lines()['Financial Aid']).toBe('No scholarships tracked yet')
  })

  it('counts what is there, singular and plural', () => {
    expect(lines({ colleges: 1 })['Application Tracking']).toBe('1 college')
    expect(lines({ colleges: 6 })['Application Tracking']).toBe('6 colleges')
    expect(lines({ scholarships: 1 })['Financial Aid']).toBe('1 scholarship tracked')
    expect(lines({ scholarships: 4 })['Financial Aid']).toBe('4 scholarships tracked')
  })

  it('adds submitted only once something has been', () => {
    // Nothing submitted is the normal state for most of the year, and a
    // "0 submitted" against every school reads as a scoreboard.
    expect(lines({ colleges: 6 })['Application Tracking']).toBe('6 colleges')
    expect(lines({ colleges: 6, submitted: 2 })['Application Tracking']).toBe('6 colleges · 2 submitted')
  })
})
