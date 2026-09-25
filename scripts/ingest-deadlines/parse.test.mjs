// Run: node --test scripts/ingest-deadlines/
//
// Fixtures are verbatim lines from the real PDF. The two headers below have
// genuinely different column offsets — that is the whole point: the grid
// repeats its header on every page and moves the columns each time.

import test from 'node:test'
import assert from 'node:assert/strict'
import { parseGrid, toDisplayDate, normaliseName } from './parse.mjs'

const HDR_NARROW =
  "     member              type ¹   ED   EDII      EA        EAII   REA    Rolling      US          Int'l"
const HDR_WIDE =
  "     member                type ¹         ED         EDII         EA          EAII        REA        Rolling      US"

const grid = (...lines) => parseGrid(lines.join('\n'))
const find = (rows, name) => rows.find((r) => r.name === name)

test('a round is read from its own page’s header, not a fixed offset', () => {
  // Yale publishes REA and RD. On the wide page its REA date sits where the
  // narrow page keeps regular decision; fixed bands called this RD = Nov 1.
  const rows = grid(
    HDR_WIDE,
    '    Yale University         Coed                                                        11/1/2026   01/02/2027    $85',
  )
  assert.deepEqual(find(rows, 'Yale University'), {
    name: 'Yale University', rea: '11/1/2026', rd: '01/02/2027',
  })
})

test('the same column position means different rounds on different pages', () => {
  // Column 66 is REA on the narrow page and EA on the wide one; the two
  // headers here sit 28 characters apart by the time they reach RD.
  const head = '    A College            Coed'
  const row = head + ' '.repeat(66 - head.length) + '11/1/2026'
  const roundOn = (hdr) => Object.keys(find(grid(hdr, row), 'A College'))[1]
  assert.equal(roundOn(HDR_NARROW), 'rea')
  assert.equal(roundOn(HDR_WIDE), 'ea')
})

test('a name wrapped across three lines is rejoined', () => {
  const rows = grid(
    "     member                type \u00b9      ED          EDII         EA          EAII       REA    Rolling      US",
    '  Georgia Institute of',
    '                           Coed                              10/15/2026   11/2/2026          01/06/2027    $75',
    '     Technology',
  )
  assert.deepEqual(find(rows, 'Georgia Institute of Technology'), {
    name: 'Georgia Institute of Technology', ea: '10/15/2026', eaii: '11/2/2026', rd: '01/06/2027',
  })
})

test('the school-type value is never mistaken for a name', () => {
  // 'Coordinate' is long enough to start left of its own header word.
  const rows = grid(
    "      member                  type \u00b9         ED          EDII         EA          EAII      REA    Rolling      US",
    '    College of Saint',
    '                             Coordinate                            11/1/2026    12/1/2026         01/15/2027',
    '        Benedict',
  )
  assert.equal(rows.length, 1)
  assert.equal(rows[0].name, 'College of Saint Benedict')
})

test('Rolling is kept, but only in the RD column', () => {
  const rows = grid(HDR_NARROW, '     SUNY Delhi          Coed                                            Rolling      $50         $50')
  assert.equal(find(rows, 'SUNY Delhi').rd, 'Rolling')
})

test('rows before the first header are skipped rather than guessed at', () => {
  assert.deepEqual(grid('  Some College      Coed    11/1/2026'), [])
})

test('toDisplayDate matches the shape the app already stores', () => {
  assert.equal(toDisplayDate('11/01/2026'), 'Nov 1, 2026')
  assert.equal(toDisplayDate('1/4/2027'), 'Jan 4, 2027')
  assert.equal(toDisplayDate('Rolling'), null)
  assert.equal(toDisplayDate('13/1/2027'), null)
})

test('normaliseName survives the abbreviations the two sources disagree on', () => {
  assert.equal(normaliseName('The University of Texas at Austin'), normaliseName('University of Texas-Austin'))
  assert.equal(normaliseName('Saint Johns University'), normaliseName('St. Johns University'))
  assert.notEqual(normaliseName('Miami University'), normaliseName('University of Miami'))
})
