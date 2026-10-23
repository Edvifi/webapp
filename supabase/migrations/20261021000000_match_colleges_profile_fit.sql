-- Rank by how useful a school is for THIS student, not by how cheap it is.
--
-- Run against live data, a $130k Californian studying business got
-- Caribbean University-Ponce, Wilberforce and Universidad Central de Bayamon
-- in their top ten: cheap, business-heavy, and graduating under a fifth of
-- their students. Thirteen changes, each mirrored in web/src/lib/collegeMatch.ts:
--
--   1. Weights: affordability 0.28 -> 0.25, major 0.22 -> 0.18,
--      outcomes 0.15 -> 0.22. Location stays 0.10.
--   2. Major is scored against the field's national share of degrees, so 20%
--      business (ordinary) no longer outscores 12% CS (a standout).
--   3. An out-of-state public with no usable price scores 0.15, not a neutral
--      0.5: it is charged out-of-state tuition, the dearest option there is.
--      Neutral let Virginia Tech, UGA and Clemson flood a Californian's list.
--   4. Territory schools are left out unless the student lives in one. Name
--      search is unfiltered, so they are still reachable by typing them.
--   5. For-profit four-years are left out the same way. They report outcomes
--      but no admissions, and cheap online programs (Strayer, American Public
--      University) took their place once the territories were gone. Trade
--      schools are untouched: most career colleges are for-profit.
--   6. Four-years graduating under 25% are left out unless graduation plus
--      transfer-out reaches 40%, which keeps branch campuses that feed a main
--      campus (Penn State Altoona: 17% graduate, 45% transfer). Removes 29 of
--      1,530 eligible four-years.
--   7. An income bracket's net price under 75% of the bracket below it is a
--      handful of students, not a price, and takes that bracket's price
--      (college_bracket_net_price). Saint Mary's (MN) listed $6,135 for
--      $110k+ against $14,771 for $75-110k.
--   8. Four-years reporting no admissions (online and adult-degree programs)
--      lose 0.10 in the pre-rank.
--   9. Price is scored against what the family can carry (the Affordable
--      filter's income caps), not one $5k-$35k line for every income. With
--      no income on file the line is unchanged.
--  10. A standing term (0.18): Carnegie class, selectivity and typical
--      SAT/ACT, our stand-in for a published ranking. Adds the
--      colleges.carnegie_basic column, so match_colleges is dropped and
--      recreated with it in the return type. Until the ingest backfills the
--      column, standing comes from selectivity and scores alone.
--  11. Special-mission schools are left out of the feed: the five federal
--      service academies (nomination and service commitment) and the two
--      colleges for deaf students.
--  12. With no distance preference, a home-state school still scores 0.9 on
--      location instead of 0.6, so home isn't worth nothing.
--  13. colleges.single_sex ('women' / 'men', from Scorecard), returned so the
--      client can leave out single-sex colleges a student can't attend
--      (leftOutOfFeed in collegeMatch.ts; gender isn't sent to the RPC).
--
-- Builds on 20261015000000; body is otherwise identical to that file.

-- A bracket's net price, refusing a figure under 75% of the bracket below it
-- (a handful of students, not a price). Mirrors bracketNetPrice() in
-- web/src/lib/collegeMatch.ts.
create or replace function public.college_bracket_net_price(nbi jsonb, bracket text)
returns numeric language plpgsql immutable parallel safe set search_path = '' as $$
declare
  b text;
  v numeric;
  eff numeric;
  prev numeric := null;
begin
  if nbi is null or bracket is null then return null; end if;
  foreach b in array array['0_30k','30k_48k','48k_75k','75k_110k','110k_plus'] loop
    v := (nbi->>b)::numeric;
    eff := case when v is null then null when prev is not null and v < 0.75 * prev then prev else v end;
    if b = bracket then return eff; end if;
    if eff is not null then prev := eff; end if;
  end loop;
  return null;
end
$$;

grant execute on function public.college_bracket_net_price(jsonb, text) to anon, authenticated;

-- Carnegie basic classification (2021): 15 = R1, 16 = R2, 21 = liberal arts
-- college, and so on. Filled by scripts/ingest-colleges (school.carnegie_basic).
alter table public.colleges add column if not exists carnegie_basic smallint;
-- Scorecard's women_only / men_only flags, filled by the same ingest.
alter table public.colleges add column if not exists single_sex text
  check (single_sex in ('women', 'men'));
comment on column public.colleges.carnegie_basic is
  'Carnegie basic classification (2021). Feeds the standing term in match_colleges and standingFit() in collegeMatch.ts. Null when not applicable.';

-- The return type gains carnegie_basic and single_sex, which create or
-- replace can't do.
drop function if exists public.match_colleges(jsonb, int);

create function public.match_colleges(p jsonb, p_limit int default 300)
returns table (
  id uuid, scorecard_id int, name text, slug text, institution_type text, city text, state text,
  region text, ownership text, locale text, size int, latitude numeric, longitude numeric,
  admit_rate numeric, sat_reading_25 int, sat_reading_75 int, sat_math_25 int, sat_math_75 int,
  act_25 int, act_75 int, avg_net_price_cents int, net_price_by_income jsonb,
  cost_of_attendance_cents int, programs jsonb, grad_rate numeric, transfer_rate numeric,
  median_earnings_10yr_cents int, pell_pct numeric, npc_url text, url text, carnegie_basic smallint,
  single_sex text
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
        -- it does not describe an out-of-state student's cost and must not make
        -- the school rank as cheap. Mirrors netPriceApplies() in
        -- web/src/lib/collegeMatch.ts -- change both together.
        when f.ownership = 'public' and f.home_state is not null
             and f.state is not null and f.state <> f.home_state then 0.15
        when coalesce(public.college_bracket_net_price(f.net_price_by_income, f.bracket), f.avg_net_price_cents) is null then 0.5
        -- Full credit up to a third of the cap, none past 7/3 of it.
        -- Mirrors affordabilityFit() in collegeMatch.ts.
        else greatest(0, least(1, 1 - ((coalesce(public.college_bracket_net_price(f.net_price_by_income, f.bracket), f.avg_net_price_cents)/100.0 - f.afford_cap / 3.0) / (2.0 * f.afford_cap))))
      end)
      + 0.16 * (case
        when array_length(f.fields,1) is null then 0.7
        when f.programs is null then 0.4
        else (
          -- Share of degrees against the field's national share, full credit at
          -- 1.5x. Mirrors majorFit() / NATIONAL_FIELD_SHARE in collegeMatch.ts.
          with best as (
            select coalesce(max((e.value)::numeric), 0) v,
                   coalesce(max((e.value)::numeric
                     / greatest(0.03, 1.5 * coalesce((ns.s->>e.key)::numeric, 0.03))), 0) lead_ratio
            from jsonb_each_text(f.programs) e
            cross join (select '{"business_marketing":0.19,"health":0.13,"social_science":0.07,"psychology":0.065,"biological":0.065,"engineering":0.065,"computer":0.055,"visual_performing":0.045,"communication":0.045,"education":0.045,"parks_recreation_fitness":0.03,"security_law_enforcement":0.025,"agriculture":0.02,"english":0.017,"mathematics":0.015,"physical_science":0.015,"engineering_technology":0.01}'::jsonb s) ns
            where e.key = any(f.fields))
          select case when v = 0 then 0.15 else greatest(0.5, least(1, 0.5 + 0.5 * lead_ratio)) end from best)
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
              when 32 then 0.3 when 23 then 0.2 when 24 then 0.2 end)::numeric),
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
         c.carnegie_basic, c.single_sex
  from keep k join public.colleges c on c.id = k.id
$$;

grant execute on function public.match_colleges(jsonb, int) to anon, authenticated;
