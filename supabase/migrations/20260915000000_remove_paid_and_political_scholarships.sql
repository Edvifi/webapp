-- Retire two kinds of curated scholarship that should never have been listed:
--
--   1. Pay-to-apply -- the student must hand over money before they can be
--      considered. Students in this app are looking for aid because money is
--      the constraint; an upfront fee inverts that, and it is the single
--      strongest shared trait of scholarship scams. The ingestion quality gate
--      already rejects fee language (`pay_to_apply`), but the curated rows
--      predate that gate and were loaded by hand, so they bypassed it.
--
--   2. Political / ideological advocacy -- contests whose purpose is to get
--      students to argue for a particular political philosophy. Awarding money
--      for adopting a viewpoint is not something this app should route
--      students toward.
--
-- Scope note: this targets ideological *advocacy*, not civics. Presidential
-- foundations (Reagan, Coolidge, Obama, JFK), patriotic essay contests (VFW,
-- DAR, American Legion), government-run programs (Congressional Award,
-- C-SPAN), and civil-rights organizations (NAACP, MALDEF, OCA) all stay.
--
-- We archive rather than delete. `status='archived'` is already the lifecycle
-- value for "was live once, now retired", and the read path filters on
-- `status='published'` (RLS policy + an explicit filter in fafsaData.ts), so
-- archiving takes these out of every student-facing list. Deleting would fire
-- `fafsa_tracker_items.scholarship_id`'s `on delete set null` and silently cut
-- the link on any tracker item a student had already saved; archiving leaves
-- that row intact and keeps the decision reversible if a provider drops its fee.

update public.fafsa_scholarships
set status = 'archived',
    updated_at = now()
where status <> 'archived'
  and slug in (
    -- 1. Pay-to-apply: each of these lists a fee in application_requirements.
    'kosciuszko_foundation_tuition_scholarships',            -- "Application fee"
    'military_order_of_the_purple_heart_scholarship_program',-- "Essay and $50 processing fee"
    'quill_and_scroll',                                      -- "Entry fee"
    'scholastic_art_writing',                                -- "Entry fee or waiver"
    'sons_of_italy_foundation_national_leadership_grants',   -- "Application fee (includes OSDIA membership)"
    'youngarts',                                             -- "Application fee"

    -- 2. Political / ideological advocacy essay contests.
    'ari_atlas_shrugged_essay',                              -- Ayn Rand Institute
    'ari_fountainhead_essay',                                -- Ayn Rand Institute
    'stossel_in_the_classroom_student_contests'              -- Stossel in the Classroom
  );
