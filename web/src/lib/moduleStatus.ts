/**
 * Where a module stands, for its row on the dashboard.
 *
 * Both counts are already loaded for the deadline panel, so this costs no
 * extra query. It exists to answer "is there anything in here yet" before the
 * module is opened — an empty tracker and a full one otherwise look the same
 * from outside.
 */

export interface ModuleCounts {
  colleges: number
  submitted: number
  scholarships: number
}

export function moduleStatusLines({ colleges, submitted, scholarships }: ModuleCounts): Record<string, string> {
  return {
    // "No colleges yet" rather than "0 colleges": a student with an empty list
    // needs to be told to start one, not handed a zero.
    'Application Tracking': colleges === 0
      ? 'No colleges on your list yet'
      : `${plural(colleges, 'college')}${submitted > 0 ? ` · ${submitted} submitted` : ''}`,
    'Financial Aid': scholarships === 0
      ? 'No scholarships tracked yet'
      : `${plural(scholarships, 'scholarship')} tracked`,
  }
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
