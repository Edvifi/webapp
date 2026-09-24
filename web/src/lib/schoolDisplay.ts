/**
 * How a school on the list is shown: name, logo (with emoji fallback) and a
 * "City, ST" location line. Legacy entries resolve through the static
 * college set; everything else uses the snapshot saved on the entry.
 */

import { getCollegeById } from '../data/collegeData'
import { logoUrlForDomain } from './collegeLogo'
import type { ApplicationEntry } from '../data/applicationsChecklist'

export interface SchoolDisplay { logoUrl?: string | null; emoji: string; name: string; sub: string }

export function schoolDisplay(app: ApplicationEntry): SchoolDisplay {
  const info = getCollegeById(app.collegeId)
  return {
    name: info?.name ?? app.name ?? 'College',
    emoji: info?.emoji ?? '🎓',
    logoUrl: logoUrlForDomain(info?.domain ?? app.website),
    sub: app.city && app.state ? `${app.city}, ${app.state}` : app.state ?? info?.state ?? '',
  }
}
