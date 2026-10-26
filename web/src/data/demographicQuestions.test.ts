import { describe, it, expect } from 'vitest'
import { DEMO_FIELDS, demoFieldError } from './demographicQuestions'

describe('demoFieldError', () => {
  const zip = DEMO_FIELDS.zipcode
  const gpa = DEMO_FIELDS.gpa

  it('requires a required field and lets an optional one stay empty', () => {
    expect(demoFieldError(zip, '  ')).toMatch(/required/)
    expect(demoFieldError(gpa, '')).toBeNull()
  })

  it('takes a 5-digit or ZIP+4 code and nothing else', () => {
    expect(demoFieldError(zip, '48104')).toBeNull()
    expect(demoFieldError(zip, '48104-1234')).toBeNull()
    expect(demoFieldError(zip, '4810')).not.toBeNull()
    expect(demoFieldError(zip, 'abcde')).not.toBeNull()
  })

  it('refuses a weighted GPA in the unweighted box', () => {
    expect(demoFieldError(gpa, '3.7')).toBeNull()
    expect(demoFieldError(gpa, '4')).toBeNull()
    expect(demoFieldError(gpa, '4.3')).toBeNull()
    expect(demoFieldError(gpa, '5.7')).not.toBeNull()
    expect(demoFieldError(gpa, '4.5')).not.toBeNull()
    expect(demoFieldError(gpa, 'A-')).not.toBeNull()
  })
})
