import { describe, it, expect } from 'vitest'
import { currentGradeStartIdx, schoolYearsBetween } from './currentGrade'

// YEAR_GROUPS start indices: freshman 0, sophomore 3, junior 6, senior 10.
const SOPHOMORE = 3
const JUNIOR = 6
const SENIOR = 10

describe('schoolYearsBetween', () => {
  it('counts August boundaries, not calendar years', () => {
    // Sep 2026 and May 2027 are the same school year.
    expect(schoolYearsBetween(new Date(2026, 8, 1), new Date(2027, 4, 1))).toBe(0)
    // Crossing August moves a student up.
    expect(schoolYearsBetween(new Date(2026, 8, 1), new Date(2027, 8, 1))).toBe(1)
    expect(schoolYearsBetween(new Date(2026, 8, 1), new Date(2029, 8, 1))).toBe(3)
  })

  it('never runs backwards', () => {
    expect(schoolYearsBetween(new Date(2028, 8, 1), new Date(2026, 8, 1))).toBe(0)
  })
})

describe('currentGradeStartIdx', () => {
  const setAt = new Date(2026, 8, 1).toISOString() // Sept 2026

  it('leaves the grade alone within the same school year', () => {
    expect(currentGradeStartIdx(SOPHOMORE, setAt, new Date(2027, 4, 1))).toBe(SOPHOMORE)
  })

  it('advances a year when the school year turns over', () => {
    // The bug: this student stayed a sophomore, so every deadline was dated to
    // the cycle after the one they were living.
    expect(currentGradeStartIdx(SOPHOMORE, setAt, new Date(2027, 8, 1))).toBe(JUNIOR)
    expect(currentGradeStartIdx(SOPHOMORE, setAt, new Date(2028, 8, 1))).toBe(SENIOR)
  })

  it('stops at senior rather than running off the end', () => {
    // There is no grade after 12th, and an index past the end would date
    // deadlines to a cycle that does not exist.
    expect(currentGradeStartIdx(SOPHOMORE, setAt, new Date(2031, 8, 1))).toBe(SENIOR)
    expect(currentGradeStartIdx(SENIOR, setAt, new Date(2030, 8, 1))).toBe(SENIOR)
  })

  it('leaves the stored value alone when the reading has no date', () => {
    // Every account created before this column existed. Same behaviour as
    // before rather than a guess.
    expect(currentGradeStartIdx(JUNIOR, null, new Date(2030, 8, 1))).toBe(JUNIOR)
    expect(currentGradeStartIdx(JUNIOR, 'not-a-date', new Date(2030, 8, 1))).toBe(JUNIOR)
  })

  it('handles a missing grade', () => {
    expect(currentGradeStartIdx(null, setAt, new Date(2027, 8, 1))).toBe(0)
  })
})
