-- Two more inputs to the admission estimate (admissionBand() in
-- web/src/lib/collegeMatch.ts).
--
-- test_policy: whether a school reads SAT/ACT scores, from the College
-- Scorecard (admissions.test_requirements, IPEDS ADMCON7). Filled by
-- scripts/ingest-colleges: required, optional (read if sent) or
-- not_considered (test-blind).
--
-- admit_rate_in_state / admit_rate_out_of_state: Scorecard's admit_rate blends
-- residents and everyone else, which misleads at selective publics, where the
-- two can differ several times over. No public dataset splits them, so each
-- row below was read off the school's or its state system's own published
-- figures; residency_rates_url and residency_rates_cycle say where, and for
-- which entering class. The ingest never writes these. To change one, write a
-- new migration with the corrected row.
--
-- match_colleges is dropped and recreated because its return type gains
-- test_policy and the two rates. Its body is unchanged from 20261021000000.

alter table public.colleges
  add column if not exists test_policy text
    check (test_policy in ('required', 'optional', 'not_considered')),
  add column if not exists admit_rate_in_state numeric check (admit_rate_in_state between 0 and 1),
  add column if not exists admit_rate_out_of_state numeric check (admit_rate_out_of_state between 0 and 1),
  add column if not exists residency_rates_url text,
  add column if not exists residency_rates_cycle text;

-- Admitted / applied, first-time first-years. Most come from section C1 of
-- the school's own 2025-26 Common Data Set, which splits in-state,
-- out-of-state and international applicants by home address; the UC campuses
-- from the UC Information Center (domestic non-residents); Cal Poly from its
-- institutional research dashboard; Virginia and William & Mary from SCHEV,
-- Virginia's higher-education council. Where a source folds international
-- applicants into out-of-state, the row says so. Michigan and Auburn publish
-- no split and keep the blended rate.
update public.colleges c set
  admit_rate_in_state = v.in_state,
  admit_rate_out_of_state = v.out_of_state,
  residency_rates_cycle = v.cycle,
  residency_rates_url = v.url
from (values
  -- Georgia Tech: in state 3,691/12,527; out of state 4,513/44,596.
  (139755, 0.2946, 0.1012, 'Fall 2025', 'https://irp.gatech.edu/sites/default/files/CDS/CDS_2025-2026_FINAL_R4_03JUN2026.pdf'),
  -- University of Georgia: in state 8,893/21,110; out of state 7,044/25,261.
  (139959, 0.4213, 0.2788, 'Fall 2025', 'https://oir.uga.edu/wp-content/uploads/UGA_CDS_2025-2026.pdf'),
  -- UNC Chapel Hill: in state 6,605/17,846; out of state 4,685/48,645.
  (199120, 0.3701, 0.0963, 'Fall 2025', 'https://oira.unc.edu/wp-content/uploads/sites/297/2026/06/CDS_UNCCH_2025-26_20260615.pdf'),
  -- NC State: in state 11,159/24,140; out of state 7,509/21,853.
  (199193, 0.4623, 0.3436, 'Fall 2025', 'https://uda.ncsu.edu/institutional-analytics/common-data-set/'),
  -- University of Florida: in state 9,387/42,172; out of state 8,086/39,420.
  (134130, 0.2226, 0.2051, 'Fall 2025', 'https://data-apps.ir.aa.ufl.edu/public/cds/CDS%202025-26_v8_08.14.2026.pdf'),
  -- Florida State: in state 15,196/44,631; out of state 4,671/34,530.
  (134097, 0.3405, 0.1353, 'Fall 2025', 'https://ir.fsu.edu/CommonDataSet.aspx'),
  -- Clemson: in state 5,661/10,697; out of state 21,277/52,651.
  (217882, 0.5292, 0.4041, 'Fall 2025', 'https://open.clemson.edu/cds/18/'),
  -- Tennessee-Knoxville: in state 8,725/11,980; out of state 14,526/41,408.
  (221759, 0.7283, 0.3508, 'Fall 2025', 'https://irsa.utk.edu/wp-content/uploads/sites/5/2026/07/CDS_2025-26_All__-1.pdf'),
  -- UCLA: in state 8,589/89,350; out of state 3,544/31,573.
  (110662, 0.0961, 0.1122, 'Fall 2025', 'https://www.universityofcalifornia.edu/about-us/information-center/admissions-residency-and-ethnicity'),
  -- UC Berkeley: in state 9,852/72,685; out of state 3,117/30,172.
  (110635, 0.1355, 0.1033, 'Fall 2025', 'https://www.universityofcalifornia.edu/about-us/information-center/admissions-residency-and-ethnicity'),
  -- UC San Diego: in state 21,542/87,574; out of state 9,771/24,929.
  (110680, 0.2460, 0.3920, 'Fall 2025', 'https://www.universityofcalifornia.edu/about-us/information-center/admissions-residency-and-ethnicity'),
  -- UC Irvine: in state 18,873/86,250; out of state 7,764/16,386.
  (110653, 0.2188, 0.4738, 'Fall 2025', 'https://www.universityofcalifornia.edu/about-us/information-center/admissions-residency-and-ethnicity'),
  -- UC Santa Barbara: in state 23,972/74,659; out of state 9,237/16,870.
  (110705, 0.3211, 0.5475, 'Fall 2025', 'https://www.universityofcalifornia.edu/about-us/information-center/admissions-residency-and-ethnicity'),
  -- UC Davis: in state 25,641/68,959; out of state 8,332/13,185.
  (110644, 0.3718, 0.6319, 'Fall 2025', 'https://www.universityofcalifornia.edu/about-us/information-center/admissions-residency-and-ethnicity'),
  -- Cal Poly San Luis Obispo: in state 16,559/63,155; out of state 4,684/8,029, includes 887 international applicants.
  (110422, 0.2622, 0.5834, 'Fall 2025', 'https://ir.calpoly.edu/cal-poly-data-dashboards'),
  -- University of Virginia: in state 4,202/16,963; out of state 6,068/42,560, includes international.
  (234076, 0.2477, 0.1426, 'Fall 2025', 'https://research.schev.edu/rdPage.aspx?rdReport=Projections.FTIC_AdmissionsHistory&lbUNITID=234076'),
  -- Virginia Tech: in state 9,893/20,900; out of state 18,311/31,104.
  (233921, 0.4733, 0.5887, 'Fall 2025', 'https://aie.vt.edu/content/dam/aie_vt_edu/common-data-set/25-26/2025-2026-CDS.xlsx'),
  -- William & Mary: in state 2,922/7,820; out of state 3,325/9,077, includes international.
  (231624, 0.3737, 0.3663, 'Fall 2025', 'https://research.schev.edu/rdPage.aspx?rdReport=Projections.FTIC_AdmissionsHistory&lbUNITID=231624'),
  -- Maryland-College Park: in state 8,075/18,487; out of state 22,143/48,614, includes international.
  (163286, 0.4368, 0.4555, 'Fall 2025', 'https://irpa.umd.edu/InstitutionalData/CommonDataSet/CDS_2025-2026.xlsx'),
  -- Illinois Urbana-Champaign: in state 14,509/29,419; out of state 9,495/32,702.
  (145637, 0.4932, 0.2903, 'Fall 2025', 'https://dair.illinois.edu/access-data/common-data-set/'),
  -- Wisconsin-Madison: in state 5,672/10,058; out of state 19,948/49,463.
  (240444, 0.5639, 0.4033, 'Fall 2025', 'https://data.wisc.edu/common-data-set-and-rankings/'),
  -- Purdue: in state 8,559/12,040; out of state 25,650/58,853; Purdue's CDS combines West Lafayette, Indianapolis and Polytechnic Statewide.
  (243780, 0.7109, 0.4358, 'Fall 2025', 'https://www.purdue.edu/idata/wp-content/uploads/2026/04/CDS-2025-2026.xlsx'),
  -- UT Austin: in state 16,828/46,879, includes top-percent automatic admits; out of state 2,653/35,268.
  (228778, 0.3590, 0.0752, 'Fall 2025', 'https://reports.utexas.edu/common-data-set/pdf'),
  -- Washington-Seattle: in state 6,980/15,260; out of state 18,813/44,619.
  (236948, 0.4574, 0.4216, 'Fall 2025', 'https://finance.uw.edu/iads/files/docs/ipeds/common_data_set/cds_2025-2026_seattle.pdf')
) v(scorecard_id, in_state, out_of_state, cycle, url)
where c.scorecard_id = v.scorecard_id;

drop function if exists public.match_colleges(jsonb, int);

create function public.match_colleges(p jsonb, p_limit int default 300)
returns table (
  id uuid, scorecard_id int, name text, slug text, institution_type text, city text, state text,
  region text, ownership text, locale text, size int, latitude numeric, longitude numeric,
  admit_rate numeric, sat_reading_25 int, sat_reading_75 int, sat_math_25 int, sat_math_75 int,
  act_25 int, act_75 int, avg_net_price_cents int, net_price_by_income jsonb,
  cost_of_attendance_cents int, programs jsonb, grad_rate numeric, transfer_rate numeric,
  median_earnings_10yr_cents int, pell_pct numeric, npc_url text, url text, carnegie_basic smallint,
  single_sex text, tuition_in_state_cents int, tuition_out_of_state_cents int,
  test_policy text, admit_rate_in_state numeric, admit_rate_out_of_state numeric
)
language sql stable parallel safe set search_path = '' as $$
  with pr as (
    select
      nullif(p->>'income_bracket','')                                            as bracket,
      -- What this family can carry per year, in dollars: the Affordable
      -- filter's caps. Mirrors AFFORDABLE_CAP_CENTS in collegeMatch.ts.
      case nullif(p->>'income_bracket','')
        when '0_30k' then 7500 when '30k_48k' then 10000 when '48k_75k' then 15000
        when '75k_110k' then 20000 when '110k_plus' then 25000 else 15000
      end                                                                        as afford_cap,
      coalesce((select array_agg(x) from jsonb_array_elements_text(p->'intended_fields') x), array[]::text[]) as fields,
      nullif(p->>'home_state','')                                                as home_state,
      nullif(p->>'region','')                                                    as region,
      coalesce(nullif(p->>'pref_distance',''),'anywhere')                        as pref_distance,
      coalesce(nullif(p->>'pref_ownership',''),'either')                         as pref_ownership,
      (p#>>'{origin,lat}')::numeric                                              as olat,
      (p#>>'{origin,lng}')::numeric                                              as olng,
      coalesce((p->>'open_to_trade')::boolean, false)                           as open_to_trade
  ),
  filtered as (
    select c.*, pr.*
    from public.colleges c cross join pr
    where c.status = 'published'
      -- Special-mission schools: the federal service academies (nomination and
      -- service commitment) and the colleges for deaf students. Mirrors
      -- SPECIAL_MISSION in collegeMatch.ts; name search still finds them.
      and c.scorecard_id not in (128328, 130624, 197027, 197036, 164155, 131450, 382911)
      and (
        (c.institution_type = '2yr' and c.ownership = 'public'
           and pr.home_state is not null and c.state = pr.home_state)
        or (c.institution_type = 'trade' and pr.open_to_trade
           and (coalesce(c.region, '') <> 'Territories' or pr.region = 'Territories')
           and (pr.pref_distance = 'anywhere'
                or (pr.pref_distance = 'in_state' and c.state = pr.home_state)
                or (pr.pref_distance = 'in_region' and c.region = pr.region)))
        or (c.institution_type = '4yr'
           -- Undergraduate floor. 250 removes 377 of 1,947 published four-years,
           -- almost all yeshivas, seminaries, single-campus nursing schools and
           -- shell satellite campuses. Deliberately not 500, which would also
           -- delete Olin (377), Juilliard (468) and Soka (484). Name search is
           -- unfiltered, so anything excluded here is still reachable by typing it.
           and coalesce(c.size, 0) >= 250
           -- Territory schools only for a student who lives in one, no
           -- for-profit four-years, and none graduating under 25% unless
           -- transfer-out makes up the difference. Mirrors leftOutOfFeed() in
           -- web/src/lib/collegeMatch.ts.
           and (coalesce(c.region, '') <> 'Territories' or pr.region = 'Territories')
           and c.ownership is distinct from 'private_forprofit'
           and not (c.grad_rate is not null and c.grad_rate < 0.25
                    and c.grad_rate + coalesce(c.transfer_rate, 0) < 0.4)
           and (pr.pref_distance = 'anywhere'
                or (pr.pref_distance = 'in_state' and c.state = pr.home_state)
                or (pr.pref_distance = 'in_region' and c.region = pr.region))
           and (pr.pref_ownership = 'either'
                or (pr.pref_ownership = 'public' and c.ownership = 'public')
                or (pr.pref_ownership = 'private' and c.ownership in ('private_nonprofit','private_forprofit'))))
      )
  ),
  scored as (
    select f.id, f.institution_type,
      0.22 * (case
        -- A public school's net price is computed on its in-state cost base, so
        -- an out-of-state student pays the tuition gap on top. With no tuition
        -- on file, it scores as expensive rather than cheap. Mirrors
        -- residencyGapCents() in web/src/lib/collegeMatch.ts -- change both.
        when f.ownership = 'public' and f.home_state is not null
             and f.state is not null and f.state <> f.home_state
             and (f.tuition_in_state_cents is null or f.tuition_out_of_state_cents is null
                  or coalesce(public.college_bracket_net_price(f.net_price_by_income, f.bracket, f.avg_net_price_cents), f.avg_net_price_cents) is null) then 0.15
        when coalesce(public.college_bracket_net_price(f.net_price_by_income, f.bracket, f.avg_net_price_cents), f.avg_net_price_cents) is null then 0.5
        -- Full credit up to a third of the cap, none past 7/3 of it.
        -- Mirrors affordabilityFit() in collegeMatch.ts.
        else greatest(0, least(1, 1 - (((coalesce(public.college_bracket_net_price(f.net_price_by_income, f.bracket, f.avg_net_price_cents), f.avg_net_price_cents)
               + case when f.ownership = 'public' and f.home_state is not null and f.state is not null and f.state <> f.home_state
                      then greatest(0, f.tuition_out_of_state_cents - f.tuition_in_state_cents) else 0 end)/100.0
               - f.afford_cap / 3.0) / (2.0 * f.afford_cap))))
      end)
      + 0.16 * (case
        when array_length(f.fields,1) is null then 0.7
        when f.programs is null then 0.4
        else (
          with best as (select coalesce(max((e.value)::numeric),0) v
                        from jsonb_each_text(f.programs) e where e.key = any(f.fields))
          select case when v = 0 then 0.15 else greatest(0.5, least(1, 0.5 + 3.5 * v)) end from best)
      end)
      -- A missing figure is unknown, not excellent. Dividing by only the parts
      -- present let a 100% graduation rate with no earnings data score 1.000.
      -- Mirrors outcomesFit() in web/src/lib/collegeMatch.ts -- change both.
      + 0.20 * ((coalesce(least(1,greatest(0,f.grad_rate)), 0.5)
                 + coalesce(least(1,greatest(0,(f.median_earnings_10yr_cents/100.0-25000)/50000.0)), 0.5))
                / 2.0)
      -- Academic standing: the mean of what's known of Carnegie class,
      -- selectivity and typical SAT/ACT; 0.5 with nothing known. Mirrors
      -- standingFit() / CARNEGIE_STANDING in collegeMatch.ts.
      + 0.18 * (select coalesce(avg(v), 0.5) from (values
          ((case f.carnegie_basic
              when 15 then 1 when 16 then 0.8 when 21 then 0.8 when 17 then 0.55
              when 28 then 0.5 when 30 then 0.5 when 18 then 0.45 when 19 then 0.4
              when 20 then 0.35 when 22 then 0.3 when 26 then 0.3 when 29 then 0.3
              when 32 then 0.3 when 23 then 0.2 when 24 then 0.2
              when 1 then 0.2 when 2 then 0.2 when 3 then 0.2 when 4 then 0.2 when 5 then 0.2 when 6 then 0.2 when 7 then 0.2
              when 8 then 0.2 when 9 then 0.2 when 10 then 0.2 when 11 then 0.2 when 12 then 0.2 when 13 then 0.2 when 14 then 0.2
            end)::numeric),
          (case when f.admit_rate is not null then greatest(0, least(1, (0.9 - f.admit_rate) / 0.8)) end),
          (case
             when f.sat_reading_25 is not null and f.sat_math_25 is not null
                  and f.sat_reading_75 is not null and f.sat_math_75 is not null
               then greatest(0, least(1, ((f.sat_reading_25 + f.sat_math_25 + f.sat_reading_75 + f.sat_math_75) / 2.0 - 1000) / 500.0))
             when f.act_25 is not null and f.act_75 is not null
               then greatest(0, least(1, ((f.act_25 + f.act_75) / 2.0 - 20) / 13.0))
           end)
        ) t(v))
      + 0.10 * (case
        -- No distance preference: home state still counts for a little.
        -- Mirrors the home-state term in feedRank().
        when f.pref_distance = 'anywhere' or f.pref_distance is null then
          case when f.home_state is not null and f.state = f.home_state then 0.9 else 0.6 end
        when f.olat is not null and f.latitude is not null then
          greatest(0.2, least(1, 1 - ((public.college_distance_mi(f.olat,f.olng,f.latitude,f.longitude) - 30)
                                       / (case when f.pref_distance='in_state' then 220.0 else 570.0 end))))
        when f.home_state is not null and f.state = f.home_state then 1.0
        else 0.4
      end)
      -- A four-year reporting no admissions is almost always an online or
      -- adult-degree program. Mirrors feedRank() in collegeMatch.ts.
      - (case when f.institution_type = '4yr' and f.admit_rate is null then 0.10 else 0 end) as score
    from filtered f
  ),
  keep as (
    (select id from scored order by score desc nulls last limit greatest(1, least(p_limit, 600)))
    union
    (select id from scored where institution_type = '2yr')
  )
  select c.id, c.scorecard_id, c.name, c.slug, c.institution_type, c.city, c.state, c.region,
         c.ownership, c.locale, c.size, c.latitude, c.longitude, c.admit_rate,
         c.sat_reading_25, c.sat_reading_75, c.sat_math_25, c.sat_math_75, c.act_25, c.act_75,
         c.avg_net_price_cents, c.net_price_by_income, c.cost_of_attendance_cents, c.programs,
         c.grad_rate, c.transfer_rate, c.median_earnings_10yr_cents, c.pell_pct, c.npc_url, c.url,
         c.carnegie_basic, c.single_sex, c.tuition_in_state_cents, c.tuition_out_of_state_cents,
         c.test_policy, c.admit_rate_in_state, c.admit_rate_out_of_state
  from keep k join public.colleges c on c.id = k.id
$$;

grant execute on function public.match_colleges(jsonb, int) to anon, authenticated;
