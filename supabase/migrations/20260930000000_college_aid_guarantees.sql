-- Income guarantees from each school's own financial aid program.
--
-- A growing number of colleges promise free tuition (sometimes the full cost)
-- below a family income: Harvard under $200,000, Michigan's Go Blue Guarantee,
-- UC's Blue and Gold plan. Every one of them depends on the student finishing
-- that school's aid steps on time, so the app shows the guarantee next to the
-- school and turns it into a task on the school's application page.
--
-- No public dataset carries these. The College Scorecard has nothing on them
-- and neither does the Common Data Set, so each row below was read off the
-- school's own site and checked on 2026-09-30. Which schools need the CSS
-- Profile was checked against College Board's 2027–28 participating list.
-- Thresholds that change for students entering in fall 2027 carry the fall 2027
-- figure: that is this year's seniors.
--
-- One guarantee per school, so plain columns rather than a side table. All are
-- null for a school without one, and null means "none we know of", never "this
-- school offers nothing".
--
-- From here on this table is the only source: the app reads guarantees from it
-- (and copies the short form onto each saved school for its task list). To
-- change one, write a new migration with the corrected row and checked date.

alter table public.colleges
  add column if not exists aid_guarantee            text,
  add column if not exists aid_guarantee_residents  text,
  add column if not exists aid_guarantee_needs_css  boolean,
  add column if not exists aid_guarantee_detail     text,
  add column if not exists aid_guarantee_action     text,
  add column if not exists aid_guarantee_url        text,
  add column if not exists aid_guarantee_checked_on date;

comment on column public.colleges.aid_guarantee is
  'Name or one-line summary of the school''s income guarantee (e.g. ''Go Blue Guarantee''). Null means none we know of.';
comment on column public.colleges.aid_guarantee_residents is
  'Who the guarantee is limited to (e.g. ''Michigan residents''). Null when it is open to every U.S. student.';
comment on column public.colleges.aid_guarantee_needs_css is
  'True when getting the guarantee takes the CSS Profile. Drives the CSS task on public schools, which otherwise only private ones get.';
comment on column public.colleges.aid_guarantee_detail is
  'Who qualifies and what is covered, in plain language.';
comment on column public.colleges.aid_guarantee_action is
  'What the student must file, and by when, to get it.';
comment on column public.colleges.aid_guarantee_url is
  'The school''s own page for the guarantee. The source for the row.';
comment on column public.colleges.aid_guarantee_checked_on is
  'When the row was last checked against aid_guarantee_url. These change most years.';

-- Backfill. Keyed on scorecard_id. Rows were found by website domain and then
-- checked by hand: satellite campuses a program covers are in (all six Ohio
-- State campuses, Emory's Oxford College), while graduate schools and online
-- divisions that share a parent's domain are out (Teachers College, Weill
-- Cornell, Texas A&M Health Science Center, UF Online, Notre Dame's second
-- non-degree row).
with guarantees(scorecard_id, aid_guarantee, aid_guarantee_residents, aid_guarantee_needs_css,
                aid_guarantee_detail, aid_guarantee_action, aid_guarantee_url) as (values
  (166027, 'Free tuition under $200K', null, true,
    'Tuition is covered for families earning $200,000 or less. Under $100,000, families pay nothing at all.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://college.harvard.edu/financial-aid'),
  (166683, 'Free tuition under $200K', null, true,
    'Tuition is covered for families earning under $200,000. Under $100,000, families pay nothing at all.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://news.mit.edu/2024/mit-tuition-undergraduates-family-income-1120'),
  (186131, 'Free tuition under $250K', null, false,
    'Most families earning up to $250,000 pay no tuition. Up to $150,000, most pay nothing at all.',
    'File the FAFSA and Princeton’s own financial aid application.',
    'https://www.princeton.edu/news/2025/08/07/princeton-enhances-financial-aid-again-it-welcomes-class-2029-which-includes'),
  (130794, 'Free tuition under $200K', null, true,
    'From 2026–27, tuition is covered for families earning under $200,000. Under $100,000, families pay nothing at all.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://news.yale.edu/2026/01/27/yale-offer-free-tuition-families-incomes-below-200000'),
  (215062, 'Quaker Commitment', null, true,
    'Full tuition for most families earning up to $200,000. Under $75,000, most get the full cost covered.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://www.upenn.edu/pennforward/penn-quaker-commitment'),
  (190150, 'Free tuition under $150K', null, true,
    'Columbia College and Columbia Engineering are tuition-free for families earning under $150,000. Under $66,000, parents pay nothing.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://cc-seas.financialaid.columbia.edu/how/aid/works'),
  (217156, 'Free tuition under $125K', null, true,
    'Full tuition is covered for families earning $125,000 or less. Under $60,000, all direct costs are covered.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://www.brown.edu/news/2026-02-09/fy27-tuition-fees-salaries'),
  (182670, 'Free tuition under $175K', null, true,
    'Families earning under $125,000 pay no parent contribution. From $125,000 to $175,000, tuition is covered.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://financialaid.dartmouth.edu/how-aid-works/how-much-help-will-i-get'),
  (190415, 'Free tuition under $125K', null, true,
    'Tuition is covered for families earning up to $125,000. Up to $75,000, the full cost is covered.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://news.cornell.edu/stories/2026/03/board-trustees-approves-2026-27-budget-parameters'),
  (243744, 'Free tuition under $150K', null, true,
    'Tuition is free for families earning under $150,000. Under $100,000, tuition, housing and food are free.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://admission.stanford.edu/afford/'),
  (110404, 'Free tuition under $200K', null, true,
    'Tuition is covered for families earning under $200,000. Under $100,000, the full cost is covered.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://www.finaid.caltech.edu/'),
  (162928, 'Free tuition under $200K', null, true,
    'From 2026–27, tuition is free for families earning up to $200,000. Up to $100,000, families pay nothing.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://sfs.jhu.edu/tuition-promise/'),
  (147767, 'Pay nothing under $70K', null, true,
    'Most families earning under $70,000 attend at no cost. Northwestern is fundraising to make it tuition-free under $150,000, but that is a goal, not yet a promise.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://undergradaid.northwestern.edu/'),
  (144050, 'Free tuition under $250K', null, false,
    'For students starting in fall 2027, tuition is free for families earning up to $250,000. Up to $125,000, tuition, housing, meals and fees are covered.',
    'File the FAFSA and the school’s required aid forms by its deadline. Its aid page lists them.',
    'https://www.uchicago.edu/admissions/affordability'),
  (221999, 'Free tuition under $200K', null, true,
    'Opportunity Vanderbilt covers full tuition for families earning $200,000 or less, starting with students who enter in fall 2027.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://admissions.vanderbilt.edu/affordability/opportunity-vanderbilt/'),
  (227757, 'Free tuition under $200K', null, true,
    'For students entering in fall 2027, tuition is free for families earning up to $200,000. Under $100,000, tuition, fees, housing and food are covered.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://financialaid.rice.edu/rice-investment'),
  (487092, 'Free tuition under $200K', null, true,
    'From fall 2026, Emory Advantage Plus makes Emory tuition-free for U.S. students from families earning $200,000 or less.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://studentaid.emory.edu/undergraduate/types/grants-scholarships/emory-grants/emory-advantage.html'),
  (139658, 'Free tuition under $200K', null, true,
    'From fall 2026, Emory Advantage Plus makes Emory tuition-free for U.S. students from families earning $200,000 or less.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://studentaid.emory.edu/undergraduate/types/grants-scholarships/emory-grants/emory-advantage.html'),
  (168148, 'Free tuition under $150K', null, true,
    'From fall 2026, the Tufts Tuition Pact makes Tufts tuition-free for U.S. families earning less than $150,000.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://now.tufts.edu/2025/09/09/tufts-will-be-tuition-free-us-families-earning-less-150000'),
  (152080, 'Free tuition under $150K', null, true,
    'From 2026–27, tuition is covered for families earning under $150,000, and half of tuition under $200,000.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://financialaid.nd.edu/costs-and-affordability/'),
  (164988, 'BU Promise', null, true,
    'From 2026–27, full tuition is covered for families earning under $200,000, with the parent share capped at $20,000 a year. Families earning $75,000 or less pay nothing.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://www.bu.edu/articles/2026/new-financial-aid-program-covers-tuition-for-certain-families/'),
  (123961, 'Free tuition under $80K', null, true,
    'Tuition is free for students who start as first-years from families earning $80,000 or less.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://affordability.usc.edu/'),
  (190099, 'Free tuition under $175K', null, true,
    'From fall 2026, the Colgate Commitment makes tuition free for families earning up to $175,000, with no loans up to $200,000.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://www.colgate.edu/admission-aid/financial-aid/colgate-commitment'),
  (234207, 'Free tuition under $200K', null, true,
    'The W&L Promise makes tuition free for families earning under $200,000, starting with students who enter in fall 2027. Under $75,000, housing and food are covered too.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://www.wlu.edu/admissions/financial-aid/the-w-l-promise'),
  (164465, 'Free tuition under $141K', null, true,
    'Most students from families earning under $141,000 receive a scholarship covering tuition. Under $67,500, most get tuition, housing and meals covered.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://www.amherst.edu/admission/financial_aid'),
  (198419, 'Free tuition under $150K', 'North and South Carolina residents', true,
    'Full tuition for North and South Carolina residents from families earning $150,000 or less. Up to $65,000, housing and meals are covered too.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://financialaid.duke.edu/initiative-students-carolinas/'),
  (199847, 'Free tuition under $200K', 'North Carolina residents', true,
    'From fall 2026, North Carolina students from families earning $200,000 or less attend tuition-free. At $100,000 or less, housing and food are covered too. From $200,001 to $300,000, half of tuition is covered.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://financialaid.wfu.edu/types-of-aid/ncgateway-to-wfu/'),
  (179867, 'WashU Pledge', 'Missouri and southern Illinois students', true,
    'Tuition, fees, housing and food for first-year students from Missouri and southern Illinois whose families earn $75,000 or less.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://financialaid.washu.edu/how-washu-helps/washu-pledge/'),
  (170976, 'Go Blue Guarantee', 'Michigan residents', true,
    'Free tuition for Michigan residents with family income and assets of $125,000 or less.',
    'No separate application, but file the FAFSA and the CSS Profile by March 31.',
    'https://finaid.umich.edu/apply-aid/new-undergraduates/michigan-residents/go-blue-guarantee-eligibility'),
  (110635, 'Blue and Gold Opportunity Plan', 'California residents', false,
    'Most California families earning up to $100,000 get UC tuition covered.',
    'No separate application. File the FAFSA or the California Dream Act Application by March 2.',
    'https://admission.universityofcalifornia.edu/tuition-financial-aid/types-of-aid/blue-and-gold-opportunity-plan.html'),
  (110662, 'Blue and Gold Opportunity Plan', 'California residents', false,
    'Most California families earning up to $100,000 get UC tuition covered.',
    'No separate application. File the FAFSA or the California Dream Act Application by March 2.',
    'https://admission.universityofcalifornia.edu/tuition-financial-aid/types-of-aid/blue-and-gold-opportunity-plan.html'),
  (110680, 'Blue and Gold Opportunity Plan', 'California residents', false,
    'Most California families earning up to $100,000 get UC tuition covered.',
    'No separate application. File the FAFSA or the California Dream Act Application by March 2.',
    'https://admission.universityofcalifornia.edu/tuition-financial-aid/types-of-aid/blue-and-gold-opportunity-plan.html'),
  (110653, 'Blue and Gold Opportunity Plan', 'California residents', false,
    'Most California families earning up to $100,000 get UC tuition covered.',
    'No separate application. File the FAFSA or the California Dream Act Application by March 2.',
    'https://admission.universityofcalifornia.edu/tuition-financial-aid/types-of-aid/blue-and-gold-opportunity-plan.html'),
  (110644, 'Blue and Gold Opportunity Plan', 'California residents', false,
    'Most California families earning up to $100,000 get UC tuition covered.',
    'No separate application. File the FAFSA or the California Dream Act Application by March 2.',
    'https://admission.universityofcalifornia.edu/tuition-financial-aid/types-of-aid/blue-and-gold-opportunity-plan.html'),
  (110705, 'Blue and Gold Opportunity Plan', 'California residents', false,
    'Most California families earning up to $100,000 get UC tuition covered.',
    'No separate application. File the FAFSA or the California Dream Act Application by March 2.',
    'https://admission.universityofcalifornia.edu/tuition-financial-aid/types-of-aid/blue-and-gold-opportunity-plan.html'),
  (110714, 'Blue and Gold Opportunity Plan', 'California residents', false,
    'Most California families earning up to $100,000 get UC tuition covered.',
    'No separate application. File the FAFSA or the California Dream Act Application by March 2.',
    'https://admission.universityofcalifornia.edu/tuition-financial-aid/types-of-aid/blue-and-gold-opportunity-plan.html'),
  (110671, 'Blue and Gold Opportunity Plan', 'California residents', false,
    'Most California families earning up to $100,000 get UC tuition covered.',
    'No separate application. File the FAFSA or the California Dream Act Application by March 2.',
    'https://admission.universityofcalifornia.edu/tuition-financial-aid/types-of-aid/blue-and-gold-opportunity-plan.html'),
  (445188, 'Blue and Gold Opportunity Plan', 'California residents', false,
    'Most California families earning up to $100,000 get UC tuition covered.',
    'No separate application. File the FAFSA or the California Dream Act Application by March 2.',
    'https://admission.universityofcalifornia.edu/tuition-financial-aid/types-of-aid/blue-and-gold-opportunity-plan.html'),
  (228778, 'Texas Advance Commitment', 'Texas residents', false,
    'Full tuition for Texas residents with family income up to $100,000, and help with tuition up to $125,000.',
    'File the FAFSA or TASFA by UT’s priority deadline.',
    'https://admissions.utexas.edu/cost-aid/financial-aid/texas-advance-commitment/'),
  (228723, 'Aggie Assurance', 'Texas residents', false,
    'From fall 2026, free tuition and fees for Texas residents with family income and assets under $100,000.',
    'File the FAFSA or TASFA by the state priority deadline.',
    'https://stories.tamu.edu/news/2026/02/20/texas-am-university-reinforces-commitment-to-affordable-education-with-expanded-aid/'),
  (234076, 'AccessUVA', 'Virginia residents', true,
    'Grants cover at least tuition and fees for Virginia families earning $100,000 or less. At $50,000 or less, housing and dining are covered too.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://news.virginia.edu/content/uva-expands-financial-aid-program-virginia-families'),
  (199120, 'Free tuition under $80K', 'North Carolina residents', true,
    'Tuition and mandatory fees are covered for in-state students from families earning less than $80,000.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://studentaid.unc.edu/tar-heel-guarantee/'),
  (145637, 'Illinois Commitment', 'Illinois residents', false,
    'Free tuition and campus fees for Illinois residents with family income and assets of $75,000 or less each.',
    'File the FAFSA before March 15.',
    'https://www.osfa.illinois.edu/illinois-commitment/'),
  (240444, 'Bucky’s Tuition Promise', 'Wisconsin residents', false,
    'Free tuition and fees for Wisconsin residents with a household income (AGI) of $65,000 or less. Assets are not counted.',
    'No separate application. File the FAFSA by the December 1 priority deadline.',
    'https://financialaid.wisc.edu/types-of-aid/tuition-promise/'),
  (204680, 'Buckeye Opportunity Program', 'Ohio residents', false,
    'Tuition and mandatory fees are covered for Ohio residents who qualify for a Pell Grant.',
    'File the FAFSA by Ohio State’s Feb 1 priority date, every year.',
    'https://news.osu.edu/buckeye-opportunity-program-helps-keep-college-affordable-at-ohio-state/'),
  (204796, 'Buckeye Opportunity Program', 'Ohio residents', false,
    'Tuition and mandatory fees are covered for Ohio residents who qualify for a Pell Grant.',
    'File the FAFSA by Ohio State’s Feb 1 priority date, every year.',
    'https://news.osu.edu/buckeye-opportunity-program-helps-keep-college-affordable-at-ohio-state/'),
  (204662, 'Buckeye Opportunity Program', 'Ohio residents', false,
    'Tuition and mandatory fees are covered for Ohio residents who qualify for a Pell Grant.',
    'File the FAFSA by Ohio State’s Feb 1 priority date, every year.',
    'https://news.osu.edu/buckeye-opportunity-program-helps-keep-college-affordable-at-ohio-state/'),
  (204671, 'Buckeye Opportunity Program', 'Ohio residents', false,
    'Tuition and mandatory fees are covered for Ohio residents who qualify for a Pell Grant.',
    'File the FAFSA by Ohio State’s Feb 1 priority date, every year.',
    'https://news.osu.edu/buckeye-opportunity-program-helps-keep-college-affordable-at-ohio-state/'),
  (204699, 'Buckeye Opportunity Program', 'Ohio residents', false,
    'Tuition and mandatory fees are covered for Ohio residents who qualify for a Pell Grant.',
    'File the FAFSA by Ohio State’s Feb 1 priority date, every year.',
    'https://news.osu.edu/buckeye-opportunity-program-helps-keep-college-affordable-at-ohio-state/'),
  (204705, 'Buckeye Opportunity Program', 'Ohio residents', false,
    'Tuition and mandatory fees are covered for Ohio residents who qualify for a Pell Grant.',
    'File the FAFSA by Ohio State’s Feb 1 priority date, every year.',
    'https://news.osu.edu/buckeye-opportunity-program-helps-keep-college-affordable-at-ohio-state/'),
  (163286, 'Terrapin Commitment', 'Maryland residents', false,
    'Tuition and fees are covered for Maryland residents who are Pell-eligible or from families earning $75,000 or less.',
    'File the FAFSA by March 1, every year.',
    'https://financialaid.umd.edu/terrapin-commitment'),
  (139755, 'Tech Promise', 'Georgia residents', true,
    'A debt-free degree for Georgia residents from families earning under $55,500.',
    'File the FAFSA and the CSS Profile by the school’s financial aid deadline.',
    'https://www.techpromise.em.gatech.edu/'),
  (236948, 'Husky Promise', 'Washington residents', false,
    'Full tuition and standard fees for Washington residents who qualify for a Pell Grant.',
    'File the FAFSA or WASFA by UW’s priority date.',
    'https://www.washington.edu/huskypromise/'),
  (134130, 'Machen Florida Opportunity Scholars', null, false,
    'Full need met with grants and scholarships for first-generation students with family income under $55,000 and assets under $35,000.',
    'File the FAFSA by UF’s priority deadline.',
    'https://www.sfa.ufl.edu/mfos')
)
update public.colleges c set
  aid_guarantee            = v.aid_guarantee,
  aid_guarantee_residents  = v.aid_guarantee_residents,
  aid_guarantee_needs_css  = v.aid_guarantee_needs_css,
  aid_guarantee_detail     = v.aid_guarantee_detail,
  aid_guarantee_action     = v.aid_guarantee_action,
  aid_guarantee_url        = v.aid_guarantee_url,
  aid_guarantee_checked_on = date '2026-09-30'
from guarantees v
where c.scorecard_id = v.scorecard_id;

-- A guarantee is the four text fields together or none of them. A partial row
-- would show a guarantee with no steps to get it, so it is refused at the
-- database rather than hidden in the app. Residents may be null on its own.
alter table public.colleges drop constraint if exists colleges_aid_guarantee_complete;
alter table public.colleges add constraint colleges_aid_guarantee_complete check (
  num_nulls(aid_guarantee, aid_guarantee_detail, aid_guarantee_action, aid_guarantee_url) in (0, 4)
);
