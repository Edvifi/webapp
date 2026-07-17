/**
 * scorecard — on-demand fetch of richer school detail (student body / diversity /
 * retention) from the U.S. Dept. of Education College Scorecard API, for the
 * Discover detail popup. These fields aren't stored in our colleges table, so we
 * fetch them live per-school (cached in the component). Degrades gracefully to
 * null when the key is missing or the request fails.
 */

const KEY = import.meta.env.VITE_SCORECARD_API_KEY as string | undefined
const BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools'

const RACE_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'white', label: 'White' },
  { key: 'black', label: 'Black' },
  { key: 'hispanic', label: 'Hispanic' },
  { key: 'asian', label: 'Asian' },
  { key: 'aian', label: 'Native American' },
  { key: 'nhpi', label: 'Pacific Islander' },
  { key: 'two_or_more', label: 'Two or more' },
  { key: 'non_resident_alien', label: 'International' },
  { key: 'unknown', label: 'Unknown' },
]

export interface SchoolDetail {
  women: number | null
  retention: number | null
  firstGen: number | null
  /** Race/ethnicity share, largest first, as fractions 0–1. */
  diversity: Array<{ label: string; pct: number }>
}

export async function fetchSchoolDetail(scorecardId: number): Promise<SchoolDetail | null> {
  if (!KEY) return null
  const P = 'latest.student.demographics'
  const fields = [
    'id',
    `${P}.women`,
    `${P}.first_generation`,
    'latest.student.retention_rate.four_year.full_time',
    'latest.student.retention_rate.lt_four_year.full_time',
    ...RACE_FIELDS.map((r) => `${P}.race_ethnicity.${r.key}`),
  ].join(',')
  try {
    const res = await fetch(`${BASE}?id=${scorecardId}&fields=${fields}&api_key=${KEY}`)
    if (!res.ok) return null
    const r = (await res.json())?.results?.[0]
    if (!r) return null
    const diversity = RACE_FIELDS
      .map((f) => ({ label: f.label, pct: r[`${P}.race_ethnicity.${f.key}`] as number | null }))
      .filter((d): d is { label: string; pct: number } => typeof d.pct === 'number' && d.pct > 0.001)
      .sort((a, b) => b.pct - a.pct)
    return {
      women: r[`${P}.women`] ?? null,
      firstGen: r[`${P}.first_generation`] ?? null,
      retention: r['latest.student.retention_rate.four_year.full_time'] ?? r['latest.student.retention_rate.lt_four_year.full_time'] ?? null,
      diversity,
    }
  } catch {
    return null
  }
}
