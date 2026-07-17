/**
 * Client-side US ZIP → coordinates lookup for proximity ranking (nearest
 * community colleges). Uses the keyless, CORS-friendly zippopotam.us service,
 * cached in memory + localStorage. Returns null (graceful degrade to state-level
 * scoping) on any bad ZIP or network error; transient failures aren't persisted,
 * so a reload retries. A bundled ZIP-centroid table would remove the dependency
 * entirely — a reasonable future hardening step.
 */
import type { GeoPoint } from './collegeMatch'

export interface ZipLocation extends GeoPoint {
  state: string
}

const LS_KEY = 'edvifi_zipgeo_v1'

function loadPersisted(): Record<string, ZipLocation> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}') as Record<string, ZipLocation>
  } catch {
    return {}
  }
}
function persist(zip: string, loc: ZipLocation) {
  try {
    const all = loadPersisted()
    all[zip] = loc
    localStorage.setItem(LS_KEY, JSON.stringify(all))
  } catch {
    /* localStorage unavailable — in-memory cache still applies */
  }
}

// Hydrate the in-memory cache from any previously-persisted successes.
const cache = new Map<string, ZipLocation | null>(Object.entries(loadPersisted()))

export async function geocodeZip(zip: string | null | undefined): Promise<ZipLocation | null> {
  const z = (zip ?? '').trim().slice(0, 5)
  if (!/^\d{5}$/.test(z)) return null
  if (cache.has(z)) return cache.get(z) ?? null
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${z}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) { cache.set(z, null); return null } // transient — not persisted
    const j = await res.json()
    const p = j?.places?.[0]
    const lat = p ? parseFloat(p.latitude) : NaN
    const lng = p ? parseFloat(p.longitude) : NaN
    if (!p || isNaN(lat) || isNaN(lng)) { cache.set(z, null); return null }
    const out: ZipLocation = { lat, lng, state: String(p['state abbreviation'] ?? '') }
    cache.set(z, out)
    persist(z, out)
    return out
  } catch {
    cache.set(z, null) // transient — not persisted, so a reload retries
    return null
  }
}
