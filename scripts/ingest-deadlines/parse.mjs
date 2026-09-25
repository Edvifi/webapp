// Parsing the Common App requirements grid.
//
// Kept separate from the ingest so it can be tested without a network or a
// database. Everything fragile about this job lives here.
//
// The grid is a PDF laid out as a table. `pdftotext -layout` preserves the
// columns as whitespace, but not perfectly: values drift a few characters
// from the header above them, and long school names wrap onto the line
// before or after their own row. So a round is identified by where its date
// sits on the line, not by slicing at fixed offsets.

/** The rounds the grid publishes, in the order its columns appear. */
export const ROUNDS = ['ed', 'edii', 'ea', 'eaii', 'rea', 'rd']

/** Header label for each round; 'Rolling' heads the RD column. */
const HEADER_LABEL = { ed: 'ED', edii: 'EDII', ea: 'EA', eaii: 'EAII', rea: 'REA', rd: 'Rolling' }

/**
 * Column positions for one page, read off that page's own header.
 *
 * The grid repeats its header on every page and the columns are *not* in the
 * same place on each: across 55 pages ED alone sits anywhere from column 36
 * to 39, and the drift compounds to the right — far enough that on one page
 * Yale's restrictive-early date lands where another page keeps regular
 * decision. Fixed offsets silently mis-file those; the header is the only
 * thing that says where the columns actually are.
 */
export function columnsFrom(headerLine) {
  const cols = {}
  for (const round of ROUNDS) {
    // \b so ED does not match inside EDII, and EA not inside EAII.
    const m = new RegExp(`\\b${HEADER_LABEL[round]}\\b`).exec(headerLine)
    if (m) cols[round] = m.index
  }
  if (Object.keys(cols).length !== ROUNDS.length) return null
  // 'type' heads the school-type column. Names live to its left, so it tells
  // us whether a line's first field is a name at all.
  const type = /\btype\b/.exec(headerLine)
  return type ? { ...cols, typeAt: type.index } : null
}

/**
 * The school name: the line's first whitespace-delimited field.
 *
 * Names use single spaces; the gap to the school-type column is always
 * several. That holds whatever the page's column offsets are, which slicing
 * at a fixed or even header-derived position does not — the type column can
 * sit either side of its own header word, so a slice takes the 'C' off
 * 'Coordinate' and leaves it glued to the name.
 */
/** The closed set of school-type values; never a school name. */
const SCHOOL_TYPE = /^(Coed|Coordinate|Men|Women)[\d¹²³*]*$/

const nameOn = (line, cols) => {
  const text = line.slice(0, ROW_END)
  const start = text.search(/\S/)
  // When a name wraps, its own row carries no name and starts at the school
  // -type column instead. Taking the first field regardless yields 'Coed'.
  if (start < 0 || start >= cols.typeAt) return ''
  const first = text.trim().split(/\s{2,}/)[0].trim()
  // 'Coordinate' is long enough to begin left of its own header word, so the
  // column guard alone lets it through.
  return SCHOOL_TYPE.test(first) ? '' : first
}

/** True for a line that is one of the repeated column headers. */
export const isHeaderLine = (line) => line.includes('EDII') && line.includes('EAII')

/** The round whose column a date at `pos` belongs to: simply the nearest. */
export function roundFor(pos, cols) {
  let best = null, bestDist = Infinity
  for (const [round, at] of Object.entries(cols)) {
    const d = Math.abs(pos - at)
    if (d < bestDist) { bestDist = d; best = round }
  }
  // Beyond this the line is into the fees columns, not a deadline.
  return bestDist <= 12 ? best : null
}

const DATE = /\d{1,2}\/\d{1,2}\/\d{4}/g
/** Dates and 'Rolling' never appear beyond here; fees and flags follow. */
const ROW_END = 112
/** Header, footnote and title fragments that are not schools. */
const NOT_A_SCHOOL = [
  'common app', 'member', '2026-27', 'first-year', 'school', 'deadlines',
  'application fee', 'updated:', 'see bottom',
]

const isNoise = (s) => {
  const t = s.toLowerCase()
  return !t || t.startsWith('*') || t.startsWith('¹') || NOT_A_SCHOOL.some((p) => t.startsWith(p))
}

/** True for a line carrying only the tail of a school name. */
const isNameOnly = (line, cols) => {
  const fields = line.slice(0, ROW_END).trim().split(/\s{2,}/)
  return fields.length === 1 && !!nameOn(line, cols) && !isNoise(fields[0])
}

/**
 * Every school in the grid, with whichever rounds it publishes.
 *
 * `rd` may be the literal 'Rolling', which is not a date and is deliberately
 * kept: "no fixed deadline" is a true and useful answer, and the app already
 * understands Rolling as a round.
 */
export function parseGrid(text) {
  const lines = text.split('\n')
  const out = []
  let pending = []
  let cols = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) { pending = []; continue }

    if (isHeaderLine(line)) {
      const found = columnsFrom(line)
      if (found) cols = found
      pending = []
      continue
    }
    if (!cols) continue

    const head = line.slice(0, ROW_END)
    const dates = [...head.matchAll(DATE)].map((m) => [m.index, m[0]])
    const rollingAt = head.indexOf('Rolling')

    if (dates.length === 0 && rollingAt < 0) {
      const name = nameOn(line, cols)
      if (!isNoise(name)) pending.push(name)
      continue
    }

    // A long name spills onto the lines before *and* after its own row.
    const parts = [...pending, nameOn(line, cols)]
    pending = []
    for (let j = i + 1; j <= i + 2 && j < lines.length; j++) {
      if (!isNameOnly(lines[j], cols)) break
      parts.push(nameOn(lines[j], cols))
    }

    const name = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
    if (name.length < 3 || isNoise(name)) continue

    const row = { name }
    for (const [pos, value] of dates) {
      const round = roundFor(pos, cols)
      if (round && !row[round]) row[round] = value
    }
    if (rollingAt >= 0 && roundFor(rollingAt, cols) === 'rd' && !row.rd) row.rd = 'Rolling'
    if (ROUNDS.some((k) => row[k])) out.push(row)
  }
  return out
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * `11/01/2026` to `Nov 1, 2026`, the shape the app already parses and the
 * curated rows already use. Returns null for anything that is not a date, so
 * 'Rolling' passes through untouched by the caller.
 */
export function toDisplayDate(value) {
  if (!value || value === 'Rolling') return null
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim())
  if (!m) return null
  const month = Number(m[1]), day = Number(m[2]), year = Number(m[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${MONTHS[month - 1]} ${day}, ${year}`
}

/** Compare names loosely enough to survive "Univ." and "St." but no looser. */
export function normaliseName(name) {
  return name
    .toLowerCase()
    .replace(/\b(the|of|at|and)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '')
    .replace(/university/g, 'univ')
    .replace(/college/g, 'coll')
    .replace(/saint/g, 'st')
}
