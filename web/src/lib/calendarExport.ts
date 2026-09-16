/**
 * calendarExport — the student's deadlines as an .ics file they can import
 * into Google Calendar, Apple Calendar or Outlook.
 *
 * Deadlines are dates, not appointments, so every VEVENT is all-day: a timed
 * event would need a timezone we don't know, and would land on the wrong day
 * for anyone who travels.
 *
 * UIDs are the DeadlineEvent ids, which are stable across renders. Re-importing
 * after a college is added or a deadline shifts therefore *updates* the
 * existing entries rather than duplicating the whole calendar.
 */

import type { DeadlineEvent } from '../data/applicationDeadlines'

const pad = (n: number): string => String(n).padStart(2, '0')

/** Local calendar date as YYYYMMDD. Deliberately local: a DeadlineEvent's Date
 *  is built at local midnight, and toISOString() would shift it to the previous
 *  day for every timezone west of UTC. */
const icsDate = (d: Date): string => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`

/** DTEND on an all-day event is exclusive, so a one-day event ends tomorrow. */
const nextDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)

const dtstampOf = (d: Date): string =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
  `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`

/** RFC 5545 escaping for TEXT values. Backslash first, or it doubles the
 *  escapes it just added. */
const esc = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/([;,])/g, '\\$1').replace(/\r?\n/g, '\\n')

const encoder = new TextEncoder()

/**
 * RFC 5545 caps a content line at 75 octets; longer lines continue on the next
 * line with a leading space. Importers that meet an unfolded line commonly
 * truncate it, which quietly loses the tail of a long college name — and the
 * emoji in every SUMMARY means character count isn't octet count.
 */
function fold(line: string): string {
  if (encoder.encode(line).length <= 75) return line
  const out: string[] = []
  let current = ''
  let bytes = 0
  // Iterating the string yields whole code points, so a multi-byte character
  // is never split across the fold.
  for (const ch of line) {
    const size = encoder.encode(ch).length
    if (bytes + size > 75) {
      out.push(current)
      current = ' ' // the continuation marker, and it counts toward the 75
      bytes = 1
    }
    current += ch
    bytes += size
  }
  out.push(current)
  return out.join('\r\n')
}

export interface IcsOptions {
  /** Name the calendar app shows on import — carries the chosen grouping
   *  through, so "Edvifi — FAFSA only" doesn't land as another "Edvifi". */
  calendarName?: string
  /** Injectable clock, for tests. */
  now?: Date
}

/** The events as iCalendar text. */
export function toIcs(
  events: DeadlineEvent[],
  { calendarName = 'Edvifi deadlines', now = new Date() }: IcsOptions = {},
): string {
  const dtstamp = dtstampOf(now)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Edvifi//Deadlines//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calendarName)}`,
  ]

  for (const e of events) {
    // An estimated date is a guess we made, not something the student should
    // rely on once it has left our UI and lost the "· est." marker.
    const notes = [
      e.typeLabel,
      e.module,
      e.estimated
        ? `Estimated from "${e.dateDisplay}" — confirm the exact date with the official source.`
        : null,
    ]
      .filter(Boolean)
      .join('\n')

    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@edvifi.app`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${icsDate(e.date)}`,
      `DTEND;VALUE=DATE:${icsDate(nextDay(e.date))}`,
      `SUMMARY:${esc(`${e.emoji} ${e.title}`)}`,
      `DESCRIPTION:${esc(notes)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return `${lines.map(fold).join('\r\n')}\r\n`
}

/** Hand the .ics to the browser as a download. */
export function downloadIcs(
  events: DeadlineEvent[],
  filename = 'edvifi-deadlines.ics',
  options: IcsOptions = {},
): void {
  const url = URL.createObjectURL(
    new Blob([toIcs(events, options)], { type: 'text/calendar;charset=utf-8' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  // Firefox only acts on a click when the anchor is in the document.
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking synchronously can cancel the download before it starts.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
