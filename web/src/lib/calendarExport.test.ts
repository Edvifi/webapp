import { describe, it, expect } from 'vitest'
import { toIcs } from './calendarExport'
import type { DeadlineEvent } from '../data/applicationDeadlines'

const event = (over: Partial<DeadlineEvent> = {}): DeadlineEvent => ({
  id: 'app-harvard-EA', collegeId: 'harvard', collegeName: 'Harvard',
  typeLabel: 'Early Action', title: 'Harvard — Early Action', shortTitle: 'Harvard EA',
  emoji: '🎓', module: 'Application Tracking', category: 'application', deadlineType: 'EA',
  date: new Date(2026, 10, 1),
  dateDisplay: 'Nov 1, 2026', color: '#C47A12', estimated: false, ...over,
})

const lines = (ics: string) => ics.split('\r\n')

describe('toIcs', () => {
  it('writes an all-day event ending the following day', () => {
    const out = lines(toIcs([event()]))
    expect(out).toContain('DTSTART;VALUE=DATE:20261101')
    // DTEND is exclusive; without the +1 day importers drop the event entirely.
    expect(out).toContain('DTEND;VALUE=DATE:20261102')
  })

  it('keeps a New Year deadline on its own local day', () => {
    // Jan 1 local midnight is Dec 31 in UTC — toISOString() would move it.
    expect(lines(toIcs([event({ date: new Date(2027, 0, 1) })]))).toContain(
      'DTSTART;VALUE=DATE:20270101',
    )
  })

  it('escapes the characters iCalendar treats as separators', () => {
    const out = toIcs([event({ title: 'Smith, Jones & Co; Award' })])
    expect(out).toContain(String.raw`SUMMARY:🎓 Smith\, Jones & Co\; Award`)
  })

  it('folds a long line and flags an estimated date', () => {
    const out = lines(
      toIcs([event({ estimated: true, dateDisplay: 'May 1 (annual)' })]),
    )
    // Every content line stays inside the 75-octet cap, continuations included.
    for (const l of out) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75)
    expect(out.some((l) => l.startsWith(' '))).toBe(true)
    // Unfold (drop each CRLF + continuation space) and the text is intact.
    expect(out.join('\r\n').replace(/\r\n /g, '')).toContain('Estimated from "May 1 (annual)"')
  })

  it('emits a valid empty calendar when nothing is tracked', () => {
    const out = lines(toIcs([]))
    expect(out[0]).toBe('BEGIN:VCALENDAR')
    expect(out).not.toContain('BEGIN:VEVENT')
    expect(out.at(-2)).toBe('END:VCALENDAR')
  })
})
