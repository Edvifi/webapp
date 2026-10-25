/**
 * How a school on the list is shown: name, logo (with emoji fallback) and a
 * "City, ST" location line. The entry's own snapshot wins; the static college
 * set fills in for an old entry that has none yet (Application Tracking saves
 * the official name onto those when it opens).
 */

import { getCollegeById } from '../data/collegeData'
import { logoUrlForDomain } from './collegeLogo'
import type { ApplicationEntry } from '../data/applicationsChecklist'

export interface SchoolDisplay { logoUrl?: string | null; emoji: string; name: string; sub: string }

export function schoolDisplay(app: ApplicationEntry): SchoolDisplay {
  const info = getCollegeById(app.collegeId)
  return {
    name: app.name ?? info?.name ?? 'College',
    emoji: info?.emoji ?? '🎓',
    logoUrl: logoUrlForDomain(info?.domain ?? app.website),
    sub: app.city && app.state ? `${app.city}, ${app.state}` : app.state ?? info?.state ?? '',
  }
}
