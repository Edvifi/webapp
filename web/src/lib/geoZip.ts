/**
 * Client-side US ZIP → coordinates lookup for proximity ranking (nearest
 * community colleges). Uses the keyless, CORS-friendly zippopotam.us service,
 * cached per ZIP. Returns null (graceful degrade to state-level scoping) on any
 * bad ZIP or network error.
 */
import type { GeoPoint } from './collegeMatch'

export interface ZipLocation extends GeoPoint {
  state: string
}

const cache = new Map<string, ZipLocation | null>()

export async function geocodeZip(zip: string | null | undefined): Promise<ZipLocation | null> {
  const z = (zip ?? '').trim().slice(0, 5)
  if (!/^\d{5}$/.test(z)) return null
  if (cache.has(z)) return cache.get(z) ?? null
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${z}`)
    if (!res.ok) { cache.set(z, null); return null }
    const j = await res.json()
    const p = j?.places?.[0]
    const lat = p ? parseFloat(p.latitude) : NaN
    const lng = p ? parseFloat(p.longitude) : NaN
    const out: ZipLocation | null =
      p && !isNaN(lat) && !isNaN(lng) ? { lat, lng, state: String(p['state abbreviation'] ?? '') } : null
    cache.set(z, out)
    return out
  } catch {
    cache.set(z, null)
    return null
  }
}
