-- Coordinates for proximity ranking (nearest community colleges by ZIP radius).
alter table public.colleges add column if not exists latitude numeric;
alter table public.colleges add column if not exists longitude numeric;
