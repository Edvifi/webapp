/**
 * mapProjection — project a school's lon/lat onto the list map SVG (Discover's "Your list" strip).
 *
 * The map (web/src/data/usStatesGeo.ts, viewBox "192 9 1028 746") is a baked
 * d3 geoAlbersUsa. We recovered the affine that maps the default geoAlbersUsa
 * output onto that SVG for the lower 48, plus separate affines for the Alaska /
 * Hawaii insets (which @svg-maps/usa places differently than d3's defaults).
 * Fit residual: lower-48 mean ~1.6px / max ~5px on a 1028px-wide map.
 *
 * Colleges are added from the DB (with latitude/longitude), so we project at
 * add-time and store the result on the list entry — the map then renders pins
 * with no runtime lookup.
 */

import { geoAlbersUsa } from 'd3-geo'

const albers = geoAlbersUsa()
const L48 = { k: 1.203316, tx: 178.04, ty: -1.653 }
const AK = { sx: 1.890629, sy: 2.364976, tx: 78.986, ty: -419.42 }
const HI = { sx: 0.432297, sy: 1.223981, tx: 465.63, ty: 54.497 }

/** Returns [x, y] in the map SVG's coordinate space, or null when unmappable (territories). */
export function projectToMap(
  lon: number | null | undefined,
  lat: number | null | undefined,
  state: string | null | undefined,
): [number, number] | null {
  if (lon == null || lat == null) return null
  const xy = albers([lon, lat])
  if (!xy) return null // outside albersUsa (e.g. PR, GU)
  const s = (state ?? '').toUpperCase()
  if (s === 'AK') return [round2(AK.sx * xy[0] + AK.tx), round2(AK.sy * xy[1] + AK.ty)]
  if (s === 'HI') return [round2(HI.sx * xy[0] + HI.tx), round2(HI.sy * xy[1] + HI.ty)]
  return [round2(L48.k * xy[0] + L48.tx), round2(L48.k * xy[1] + L48.ty)]
}

const round2 = (n: number) => Math.round(n * 100) / 100
