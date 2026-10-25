import { describe, it, expect } from 'vitest'
import { defaultScholarshipTasks, scholarshipTasks, ownTasks, sharedScholarshipSummary, needsEssay } from './scholarshipTasks'
import type { TrackerItem } from '../lib/fafsaData'

const item = (over: Partial<TrackerItem> = {}): TrackerItem => ({
  id: 't1', scholarshipId: 's1', name: 'Test Award', amount: '$1K', deadline: 'TBD', deadlineDate: null,
  status: 'researching', type: null, source: null, provider: null, url: null,
  requirements: [], requiresFafsa: false, requiresCss: false, tasks: null, ...over,
})

describe('defaultScholarshipTasks', () => {
  it('turns requirements into tasks and leaves eligibility lines out', () => {
    const tasks = defaultScholarshipTasks(item({
      requirements: ['Transcript', 'Two letters of recommendation', 'Personal statement', 'Minimum 3.0 GPA', 'U.S. citizen or permanent resident'],
    }))
    expect(tasks.map((t) => t.id)).toEqual(['transcript', 'recs', 'essay', 'submit'])
  })

  it('adds FAFSA and CSS from the flags, once each', () => {
    const ids = defaultScholarshipTasks(item({ requirements: ['FAFSA'], requiresFafsa: true, requiresCss: true })).map((t) => t.id)
    expect(ids).toEqual(['fafsa', 'css', 'submit'])
  })

  it("starts a student's own entry by finding out what it asks for", () => {
    expect(defaultScholarshipTasks(item({ scholarshipId: null })).map((t) => t.id)).toEqual(['check', 'submit'])
  })
})

describe('scholarshipTasks', () => {
  it('reads shared tasks from the one set and keeps saved own tasks', () => {
    const saved = [{ id: 'essay', label: 'Write the essay', done: true, phase: 'before' as const }, { id: 'c-1', label: 'Call Ms. Lee', done: false, phase: 'after' as const, custom: true }]
    const tasks = scholarshipTasks(item({ requirements: ['Transcript', 'Essay'], tasks: saved }), new Set(['transcript']))
    expect(tasks.map((t) => [t.id, t.done])).toEqual([['transcript', true], ['essay', true], ['c-1', false]])
    expect(ownTasks(tasks).map((t) => t.id)).toEqual(['essay', 'c-1'])
  })
})

describe('sharedScholarshipSummary', () => {
  it('counts only open scholarships', () => {
    const summary = sharedScholarshipSummary([
      item({ id: 'a', requirements: ['Transcript', 'Resume'] }),
      item({ id: 'b', requirements: ['Academic transcript'] }),
      item({ id: 'c', requirements: ['Transcript'], status: 'submitted' }),
    ], new Set(['resume']))
    expect(summary).toEqual([
      { id: 'transcript', label: 'Get a copy of your transcript', done: false, itemIds: ['a', 'b'] },
      { id: 'resume', label: 'Update your resume', done: true, itemIds: ['a'] },
    ])
  })
})

it('needsEssay', () => {
  expect(needsEssay(['Essays'])).toBe(true)
  expect(needsEssay(['Transcript', 'Online application'])).toBe(false)
})
