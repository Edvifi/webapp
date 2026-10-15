-- Stop volunteering schools we know almost nothing about.
--
-- Two independent defects put a 118-student seminary on the second card of the
-- feed, at 80% match, above Georgia Tech, Rice, Berkeley and Stanford:
--
--   1. The outcomes term averaged only the fields a school reported, so a
--      100% graduation rate with no earnings figure scored a perfect 1.000 --
--      better than Princeton's 0.988. Reporting less was rewarded.
--   2. The candidate query had no quality floor of any kind: any published
--      4yr/2yr/trade row was eligible, with no test on size or data coverage.
--
-- The floor is on the 4yr branch only. 2yr stays untouched (612 of 630 public
-- community colleges report both outcome fields, and the keep union exists to
-- guarantee local ones). Trade is exempt from the size floor because trade
-- schools are legitimately small -- only 989 of 2,619 clear 250.
--
-- Builds on 20261014000000; the residency guard in the affordability term is
-- carried through unchanged. Body is otherwise byte-identical to that file.

create or replace function public.match_colleges(p jsonb, p_limit int default 300)
returns table (
  id uuid, scorecard_id int, name text, slug text, institution_type text, city text, state text,
  region text, ownership text, locale text, size int, latitude numeric, longitude numeric,
  admit_rate numeric, sat_reading_25 int, sat_reading_75 int, sat_math_25 int, sat_math_75 int,
  act_25 int, act_75 int, avg_net_price_cents int, net_price_by_income jsonb,
  cost_of_attendance_cents int, programs jsonb, grad_rate numeric, transfer_rate numeric,
  median_earnings_10yr_cents int, pell_pct numeric, npc_url text, url text
)
language sql stable parallel safe set search_path = '' as $$
  with pr as (
    select
      nullif(p->>'income_bracket','')                                            as bracket,
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
      and (
        (c.institution_type = '2yr' and c.ownership = 'public'
           and pr.home_state is not null and c.state = pr.home_state)
        or (c.institution_type = 'trade' and pr.open_to_trade
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
      0.28 * (case
        -- A public school's net price is computed on its in-state cost base, so
        -- it does not describe an out-of-state student's cost and must not make
        -- the school rank as cheap. Mirrors netPriceApplies() in
        -- web/src/lib/collegeMatch.ts -- change both together.
        when f.ownership = 'public' and f.home_state is not null
             and f.state is not null and f.state <> f.home_state then 0.5
        when coalesce((f.net_price_by_income->>f.bracket)::numeric, f.avg_net_price_cents) is null then 0.5
        else greatest(0, least(1, 1 - ((coalesce((f.net_price_by_income->>f.bracket)::numeric, f.avg_net_price_cents)/100.0 - 5000) / 30000.0)))
      end)
      + 0.22 * (case
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
      + 0.15 * ((coalesce(least(1,greatest(0,f.grad_rate)), 0.5)
                 + coalesce(least(1,greatest(0,(f.median_earnings_10yr_cents/100.0-25000)/50000.0)), 0.5))
                / 2.0)
      + 0.10 * (case
        when f.pref_distance = 'anywhere' or f.pref_distance is null then 0.6
        when f.olat is not null and f.latitude is not null then
          greatest(0.2, least(1, 1 - ((public.college_distance_mi(f.olat,f.olng,f.latitude,f.longitude) - 30)
                                       / (case when f.pref_distance='in_state' then 220.0 else 570.0 end))))
        when f.home_state is not null and f.state = f.home_state then 1.0
        else 0.4
      end) as score
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
         c.grad_rate, c.transfer_rate, c.median_earnings_10yr_cents, c.pell_pct, c.npc_url, c.url
  from keep k join public.colleges c on c.id = k.id
$$;

grant execute on function public.match_colleges(jsonb, int) to anon, authenticated;
