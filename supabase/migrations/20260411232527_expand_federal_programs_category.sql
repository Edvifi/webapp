alter table public.fafsa_federal_programs
  drop constraint fafsa_federal_programs_category_check;

alter table public.fafsa_federal_programs
  add constraint fafsa_federal_programs_category_check
  check (category in (
    'grant',
    'work_study',
    'loan',
    'military_benefit',
    'service_scholarship',
    'health_loan',
    'tribal_aid',
    'service_award'
  ));
