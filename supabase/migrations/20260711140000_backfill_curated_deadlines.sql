-- Backfill real deadline dates on curated scholarships.
--
-- Only rows whose deadline_display is an unambiguous, single full date
-- ("Mon DD, YYYY") are set. Recurring ("May 1 annually"), month-only
-- ("Mar 2027"), multi-date ("Mar 31 / Jul 31"), and vague ("Check official
-- site") deadlines keep their display text but get no deadline date — the UI
-- shows the text as-is and treats them as "no fixed date".
--
-- Uses a strict anchored regex + make_date (NOT to_date, which silently
-- misparses). make_date validates the date and would error on an impossible
-- one; the source data contains only valid dates.

with parsed as (
  select id,
    regexp_match(deadline_display, '^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$') as m
  from public.fafsa_scholarships
  where source = 'curated' and deadline is null and deadline_display is not null
)
update public.fafsa_scholarships t
set deadline = make_date(
  (p.m[3])::int,
  case lower(left(p.m[1], 3))
    when 'jan' then 1 when 'feb' then 2 when 'mar' then 3 when 'apr' then 4
    when 'may' then 5 when 'jun' then 6 when 'jul' then 7 when 'aug' then 8
    when 'sep' then 9 when 'oct' then 10 when 'nov' then 11 when 'dec' then 12
  end,
  (p.m[2])::int)
from parsed p
where t.id = p.id
  and p.m is not null
  and case lower(left(p.m[1], 3))
    when 'jan' then 1 when 'feb' then 2 when 'mar' then 3 when 'apr' then 4
    when 'may' then 5 when 'jun' then 6 when 'jul' then 7 when 'aug' then 8
    when 'sep' then 9 when 'oct' then 10 when 'nov' then 11 when 'dec' then 12
  end is not null;
