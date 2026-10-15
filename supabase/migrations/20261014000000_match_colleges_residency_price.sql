-- Stop pre-ranking out-of-state publics on their in-state net price.
--
-- The shortlist is pre-ranked by the same affordability proxy the client
-- scores with, and that proxy read a public school's net price without asking
-- whether the student lives in its state. Scorecard computes a public net
-- price on the in-state cost base, so for 562 of 595 public four-years a
-- Californian was shown -- and ranked on -- a price they cannot be charged:
-- Michigan costs $34,654 in state and $69,326 out, against $13,138 on file.
-- Only 21 publics have an out-of-state cost stored, so there is no better
-- figure to substitute; the term goes neutral instead of favourable.
--
-- Body is otherwise byte-identical to 20260715000000_college_match_rpc.sql.

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
      + 0.15 * (case
        when f.grad_rate is null and f.median_earnings_10yr_cents is null then 0.5
        else (coalesce(least(1,greatest(0,f.grad_rate)),0) + coalesce(least(1,greatest(0,(f.median_earnings_10yr_cents/100.0-25000)/50000.0)),0))
             / nullif((case when f.grad_rate is not null then 1 else 0 end) + (case when f.median_earnings_10yr_cents is not null then 1 else 0 end),0)
      end)
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
