alter table public.fafsa_scholarships
  add column deadline_display text,
  add column application_requirements text[] not null default '{}',
  add column eligibility_summary text,
  add column min_gpa numeric(3,2),
  add column num_awards_per_year integer,
  add column renewable_years integer,
  add column selection_criteria text[] not null default '{}';

-- GIN indexes on the array columns so the UI can filter cheaply later
create index fafsa_scholarships_requirements_idx
  on public.fafsa_scholarships using gin (application_requirements);

create index fafsa_scholarships_criteria_idx
  on public.fafsa_scholarships using gin (selection_criteria);
