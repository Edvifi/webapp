-- Give tracked scholarships a real deadline date.
--
-- `fafsa_tracker_items` only ever stored `deadline_display` (free text such as
-- "May 1 (annual)" or "Varies - check official site"). The catalogue row it was
-- added from usually knows better: `fafsa_scholarships.deadline` is a real date
-- wherever the source text was an unambiguous single date. That date was being
-- discarded at insert time, so nothing downstream could place a scholarship on
-- the calendar or the timeline.
--
-- The display text stays authoritative for what the student reads; this column
-- only exists so a date-based view has something to pin.

alter table public.fafsa_tracker_items
  add column if not exists deadline date;

comment on column public.fafsa_tracker_items.deadline is
  'Real deadline date when one is known. NULL means "no fixed date" — read deadline_display instead. Copied from fafsa_scholarships.deadline at add time.';

-- Backfill what is recoverable: rows added from the catalogue can get their
-- date back through scholarship_id. Custom hand-entered items have no source
-- row and keep a NULL date, which is correct — we never invent one here.
update public.fafsa_tracker_items t
set deadline = s.deadline
from public.fafsa_scholarships s
where t.scholarship_id = s.id
  and t.deadline is null
  and s.deadline is not null;
