-- Curated editorial fields move onto `colleges`.
--
-- Until now 46 hand-curated schools lived in web/src/data/collegeData.ts while
-- the other 6,273 lived here, which had two consequences. The Financial Aid
-- module searched only the static array, so a student outside those 46 could not
-- add their school to the aid comparison at all. And a school tracked both ways
-- carried two different ids with no crosswalk between them, so it could appear
-- twice in one list.
--
-- Dates stay `text`. They are display strings the client already parses, and one
-- of the legal values is 'Rolling', which no date type can hold.
--
-- `legacy_slug` is what makes the migration non-destructive: student lists
-- persisted ids like 'harvard', and this column is how those resolve to a row
-- without rewriting anyone's saved data.

alter table public.colleges
  add column if not exists legacy_slug        text,
  add column if not exists emoji              text,
  add column if not exists early_action       text,
  add column if not exists early_decision     text,
  add column if not exists regular_decision   text,
  add column if not exists fafsa_priority     text,
  add column if not exists css_profile        text,
  add column if not exists aid_notification   text,
  add column if not exists meets_full_need    boolean,
  add column if not exists no_loan_policy     boolean,
  add column if not exists curated_at         timestamptz;

comment on column public.colleges.legacy_slug is
  'Slug from the retired static list (e.g. ''harvard''). Resolves ids in student data saved before curation moved here.';
comment on column public.colleges.curated_at is
  'Set when a row carries hand-checked editorial fields. Null means the Scorecard ingest is the only source.';

-- One row per slug, so a stale slug cannot resolve to two schools.
create unique index if not exists colleges_legacy_slug_key
  on public.colleges (legacy_slug) where legacy_slug is not null;

-- Backfill. Keyed on scorecard_id, resolved by exact website host; the two that
-- host under a different name than their aid office (MIT on web.mit.edu, WashU
-- on washu.edu while its aid office is wustl.edu) were matched by name.
with curated(scorecard_id, legacy_slug, emoji, early_action, early_decision,
             regular_decision, fafsa_priority, css_profile, aid_notification,
             meets_full_need, no_loan_policy) as (values
  (217156, 'brown', '🐻', null, 'Nov 1, 2026', 'Jan 5, 2027', 'Feb 1, 2027', 'Nov 1, 2026', 'Apr 2027', true, false),
  (110422, 'cal-poly-slo', '🌿', null, null, 'Dec 1, 2026', 'Mar 2, 2027', null, 'Apr 2027', false, false),
  (110592, 'cal-state-la', '🦅', null, null, 'Dec 1, 2026', 'Mar 2, 2027', null, 'Apr 2027', false, false),
  (110404, 'caltech', '🔬', 'Nov 1, 2026', null, 'Jan 3, 2027', 'Feb 15, 2027', 'Nov 1, 2026', 'Apr 2027', true, true),
  (190150, 'columbia', '🦁', null, 'Nov 1, 2026', 'Jan 1, 2027', 'Feb 15, 2027', 'Nov 1, 2026', 'Apr 2027', true, true),
  (190415, 'cornell', '🐻‍❄️', null, 'Nov 1, 2026', 'Jan 2, 2027', 'Feb 15, 2027', 'Nov 1, 2026', 'Apr 2027', true, false),
  (182670, 'dartmouth', '🌲', null, 'Nov 1, 2026', 'Jan 2, 2027', 'Feb 1, 2027', 'Nov 1, 2026', 'Apr 2027', true, true),
  (113333, 'de-anza', '🌊', null, null, 'Rolling', 'Mar 2, 2027', null, 'Rolling', false, false),
  (198419, 'duke', '😈', null, 'Nov 1, 2026', 'Jan 4, 2027', 'Feb 1, 2027', 'Nov 1, 2026', 'Apr 2027', true, false),
  (139658, 'emory', '🦅', null, 'Nov 1, 2026', 'Jan 1, 2027', 'Feb 15, 2027', 'Nov 15, 2026', 'Apr 2027', true, false),
  (131496, 'georgetown', '🐶', 'Nov 1, 2026', null, 'Jan 10, 2027', 'Feb 1, 2027', 'Feb 1, 2027', 'Apr 2027', true, false),
  (139755, 'georgia-tech', '🐝', 'Nov 1, 2026', null, 'Jan 4, 2027', 'Feb 15, 2027', null, 'Apr 2027', false, false),
  (166027, 'harvard', '🟥', 'Nov 1, 2026', null, 'Jan 1, 2027', 'Feb 1, 2027', 'Nov 1, 2026', 'Apr 2027', true, true),
  (135717, 'miami-dade', '🌴', null, null, 'Rolling', 'Mar 1, 2027', null, 'Rolling', false, false),
  (166683, 'mit', '🦫', 'Nov 1, 2026', null, 'Jan 1, 2027', 'Feb 15, 2027', 'Nov 1, 2026', 'Mar 2027', true, true),
  (147767, 'northwestern', '🟣', null, 'Nov 1, 2026', 'Jan 3, 2027', 'Feb 15, 2027', 'Nov 1, 2026', 'Apr 2027', true, false),
  (193900, 'nyu', '🗽', null, 'Nov 1, 2026', 'Jan 5, 2027', 'Feb 15, 2027', 'Feb 15, 2027', 'Apr 2027', false, false),
  (204796, 'ohio-state', '🌰', 'Nov 1, 2026', null, 'Feb 1, 2027', 'Feb 1, 2027', null, 'Apr 2027', false, false),
  (121044, 'pasadena-city', '🌹', null, null, 'Rolling', 'Mar 2, 2027', null, 'Rolling', false, false),
  (214777, 'penn-state', '🦁', null, null, 'Dec 1, 2026', 'Feb 15, 2027', null, 'Apr 2027', false, false),
  (186131, 'princeton', '🐯', 'Nov 1, 2026', null, 'Jan 1, 2027', 'Feb 1, 2027', 'Nov 1, 2026', 'Apr 2027', true, true),
  (243780, 'purdue', '🚂', 'Nov 1, 2026', null, 'Jan 15, 2027', 'Mar 1, 2027', null, 'Apr 2027', false, false),
  (227757, 'rice', '🦉', null, 'Nov 1, 2026', 'Jan 4, 2027', 'Feb 15, 2027', 'Nov 1, 2026', 'Apr 2027', true, true),
  (122409, 'sdsu', '🔴', null, null, 'Dec 1, 2026', 'Mar 2, 2027', null, 'Apr 2027', false, false),
  (122755, 'sjsu', '🟡', null, null, 'Dec 1, 2026', 'Mar 2, 2027', null, 'Apr 2027', false, false),
  (122977, 'smc', '🏄', null, null, 'Rolling', 'Mar 2, 2027', null, 'Rolling', false, false),
  (243744, 'stanford', '🌲', 'Nov 1, 2026', null, 'Jan 2, 2027', 'Feb 15, 2027', 'Nov 1, 2026', 'Apr 2027', true, true),
  (110635, 'uc-berkeley', '🔵', null, null, 'Nov 30, 2026', 'Mar 2, 2027', null, 'Mar 2027', true, false),
  (110644, 'uc-davis', '🐄', null, null, 'Nov 30, 2026', 'Mar 2, 2027', null, 'Mar 2027', false, false),
  (110705, 'uc-santa-barbara', '🏖️', null, null, 'Nov 30, 2026', 'Mar 2, 2027', null, 'Mar 2027', false, false),
  (110714, 'uc-santa-cruz', '🐌', null, null, 'Nov 30, 2026', 'Mar 2, 2027', null, 'Mar 2027', false, false),
  (144050, 'uchicago', '🐦', 'Nov 1, 2026', 'Nov 1, 2026', 'Jan 4, 2027', 'Feb 15, 2027', 'Nov 1, 2026', 'Apr 2027', true, true),
  (110653, 'uci', '🐜', null, null, 'Nov 30, 2026', 'Mar 2, 2027', null, 'Mar 2027', false, false),
  (110662, 'ucla', '🐻', null, null, 'Nov 30, 2026', 'Mar 2, 2027', null, 'Mar 2027', true, false),
  (110680, 'ucsd', '🔱', null, null, 'Nov 30, 2026', 'Mar 2, 2027', null, 'Mar 2027', false, false),
  (134130, 'uf', '🐊', null, null, 'Nov 1, 2026', 'Dec 15, 2026', null, 'Mar 2027', false, false),
  (170976, 'umich', '〽️', 'Nov 1, 2026', null, 'Feb 1, 2027', 'Feb 28, 2027', 'Feb 28, 2027', 'Apr 2027', true, false),
  (199120, 'unc', '🐏', 'Oct 15, 2026', null, 'Jan 15, 2027', 'Mar 1, 2027', 'Mar 1, 2027', 'Apr 2027', true, true),
  (215062, 'upenn', '🔴', null, 'Nov 1, 2026', 'Jan 5, 2027', 'Feb 15, 2027', 'Nov 1, 2026', 'Apr 2027', true, false),
  (123961, 'usc', '✌️', 'Nov 1, 2026', null, 'Jan 15, 2027', 'Feb 1, 2027', 'Nov 1, 2026', 'Apr 2027', true, false),
  (228778, 'ut-austin', '🤘', null, null, 'Dec 1, 2026', 'Jan 15, 2027', null, 'Apr 2027', false, false),
  (234076, 'uva', '⚔️', 'Nov 1, 2026', null, 'Jan 5, 2027', 'Mar 1, 2027', 'Mar 1, 2027', 'Apr 2027', true, false),
  (221999, 'vanderbilt', '⚓', null, 'Nov 1, 2026', 'Jan 1, 2027', 'Feb 1, 2027', 'Nov 1, 2026', 'Apr 2027', true, true),
  (179867, 'washu', '🐻', null, 'Nov 1, 2026', 'Jan 4, 2027', 'Feb 1, 2027', 'Nov 1, 2026', 'Apr 2027', true, false),
  (240444, 'wisconsin', '🦡', 'Nov 1, 2026', null, 'Feb 1, 2027', 'Mar 1, 2027', null, 'Apr 2027', false, false),
  (130794, 'yale', '🐶', 'Nov 1, 2026', null, 'Jan 2, 2027', 'Mar 1, 2027', 'Nov 1, 2026', 'Apr 2027', true, true)
)
update public.colleges c set
  legacy_slug      = v.legacy_slug,
  emoji            = v.emoji,
  early_action     = v.early_action,
  early_decision   = v.early_decision,
  regular_decision = v.regular_decision,
  fafsa_priority   = v.fafsa_priority,
  css_profile      = v.css_profile,
  aid_notification = v.aid_notification,
  meets_full_need  = v.meets_full_need,
  no_loan_policy   = v.no_loan_policy,
  curated_at       = now()
from curated v
where c.scorecard_id = v.scorecard_id;


-- Out-of-state cost has no Scorecard equivalent, and the curated set carries it
-- for the 25 public schools where in-state and out-of-state differ. Dropping it
-- would have quietly made those schools look cheaper than they are to a student
-- applying from another state.
alter table public.colleges
  add column if not exists cost_out_of_state_cents bigint;

comment on column public.colleges.cost_out_of_state_cents is
  'Curated only. Null means either a private school (one price) or no curated figure.';

-- Cost and calculator URL already exist from the ingest but are sparse (50% and
-- 92%). The curated figures are hand-checked, so they fill the gaps — `coalesce`
-- rather than assignment, so an ingested value is never overwritten by one that
-- is now over a year old.
with curated(scorecard_id, coa_cents, oos_cents, npc) as (values
  (217156, 8300600, null, 'https://www.brown.edu/about/administration/financial-aid/net-price-calculator'),
  (110422, 3040200, 4228200, 'https://www.calpoly.edu/financial-aid/net-price-calculator'),
  (110592, 2436600, 3624600, 'https://www.calstatela.edu/financialaid/net-price-calculator'),
  (110404, 8276400, null, 'https://www.finaid.caltech.edu/net-price-calculator'),
  (190150, 8421600, null, 'https://cc-seas.financialaid.columbia.edu/net-price-calculator'),
  (190415, 8226000, null, 'https://finaid.cornell.edu/net-price-calculator'),
  (182670, 8330700, null, 'https://financialaid.dartmouth.edu/net-price-calculator'),
  (113333, 1069200, 1903800, 'https://www.deanza.edu/financialaid/net-price-calculator.html'),
  (198419, 8326300, null, 'https://financialaid.duke.edu/net-price-calculator/'),
  (139658, 7959400, null, 'https://www.emory.edu/admission/afford/net-price-calculator.html'),
  (131496, 8252600, null, 'https://finaid.georgetown.edu/net-price-calculator/'),
  (139755, 2948800, 5344800, 'https://finaid.gatech.edu/net-price-calculator/'),
  (166027, 8286600, null, 'https://college.harvard.edu/financial-aid/net-price-calculator'),
  (135717, 1106000, 1884000, 'https://www.mdc.edu/financial-aid/net-price-calculator/'),
  (166683, 8218000, null, 'https://sfs.mit.edu/undergraduate-students/the-cost-of-attendance/net-price-calculator/'),
  (147767, 8355600, null, 'https://undergradaid.northwestern.edu/net-price-calculator/'),
  (193900, 8325000, null, 'https://www.nyu.edu/admissions/financial-aid-and-scholarships/net-price-calculator.html'),
  (204796, 2969600, 5472000, 'https://sfa.osu.edu/incoming-students/net-price-calculator'),
  (121044, 1102400, 1863200, 'https://pasadena.edu/financial-aid/net-price-calculator.php'),
  (214777, 3676600, 5637800, 'https://admissions.psu.edu/costs-aid/net-price-calculator/'),
  (186131, 8271000, null, 'https://admission.princeton.edu/cost-aid/financial-aid-estimator'),
  (243780, 2409000, 4559400, 'https://www.purdue.edu/dfa/types/calculator.html'),
  (227757, 7424400, null, 'https://financialaid.rice.edu/net-price-calculator'),
  (122409, 2810000, 3998000, 'https://financialaid.sdsu.edu/net-price-calculator/'),
  (122755, 2642400, 3830400, 'https://www.sjsu.edu/faso/net-price-calculator/'),
  (122977, 1176600, 2052600, 'https://www.smc.edu/student-support/financial-aid-scholarships/net-price-calculator.php'),
  (243744, 8468300, null, 'https://financialaid.stanford.edu/undergrad/calculator/index.html'),
  (110635, 3806600, 6806600, 'https://financialaid.berkeley.edu/net-price-calculator/'),
  (110644, 3409800, 6409800, 'https://financialaid.ucdavis.edu/undergraduate/net-price-calculator'),
  (110705, 3565800, 6565800, 'https://www.finaid.ucsb.edu/net-price-calculator'),
  (110714, 3504300, 6504300, 'https://financialaid.ucsc.edu/cost-to-attend/net-price-calculator.html'),
  (144050, 8481600, null, 'https://financialaid.uchicago.edu/net-price-calculator'),
  (110653, 3426100, 6426100, 'https://www.ofas.uci.edu/content/costs.aspx?nav=2'),
  (110662, 3629700, 6629700, 'https://www.ucla.edu/admission/affordability'),
  (110680, 3543600, 6543600, 'https://fas.ucsd.edu/cost/net-price-calculator.html'),
  (134130, 2226000, 4472000, 'https://www.sfa.ufl.edu/net-price-calculator/'),
  (170976, 3300700, 6932600, 'https://finaid.umich.edu/net-price-calculator/'),
  (199120, 2609200, 5506000, 'https://studentaid.unc.edu/incoming/net-price-calculator/'),
  (215062, 8457000, null, 'https://srfs.upenn.edu/financial-aid/net-price-calculator'),
  (123961, 8788100, null, 'https://financialaid.usc.edu/net-price-calculator/'),
  (228778, 2842600, 5741200, 'https://onestop.utexas.edu/managing-costs/cost-tuition-rates/net-price-calculator/'),
  (234076, 3481000, 6810200, 'https://sfs.virginia.edu/net-price-calculator'),
  (221999, 8228200, null, 'https://www.vanderbilt.edu/financialaid/net-price-calculator/'),
  (179867, 8278000, null, 'https://financialaid.wustl.edu/net-price-calculator/'),
  (240444, 2840400, 5636400, 'https://financialaid.wisc.edu/net-price-calculator/'),
  (130794, 8388000, null, 'https://finaid.yale.edu/costs-affordability/net-price-calculator')
)
update public.colleges c set
  cost_of_attendance_cents = coalesce(c.cost_of_attendance_cents, v.coa_cents),
  cost_out_of_state_cents  = v.oos_cents,
  npc_url                  = coalesce(c.npc_url, v.npc)
from curated v
where c.scorecard_id = v.scorecard_id;
