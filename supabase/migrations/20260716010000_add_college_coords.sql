-- ═══════════════════════════════════════════════════════════════════════════
-- colleges — geographic coordinates + baked map position
--
-- Adds each school's real latitude/longitude (from College Scorecard
-- location.lat / location.lon) plus a pre-projected (map_x, map_y) point for the
-- College List map. The map uses a baked geoAlbersUsa projection (viewBox
-- "192 9 1028 746", with custom Alaska/Hawaii insets); rather than ship a
-- projection library to the client, the ingest projects each school once and
-- stores the result, so rendering a pin is just <circle cx=map_x cy=map_y/>.
-- lat/lon is kept as the source of truth (re-projectable if the map changes).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.colleges
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists map_x double precision,
  add column if not exists map_y double precision;
