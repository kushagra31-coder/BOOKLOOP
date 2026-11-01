-- ==============================================================================
-- Migration: 0005_institution_type.sql
-- Description: Enforce institution_type check constraint ('school', 'college'),
-- default 'college' for existing rows, and ensure Acropolis Institute is present.
-- ==============================================================================

-- 1. Normalize existing institution_type rows to 'college' or 'school'
update public.institutions
set institution_type = 'college'
where institution_type is null or institution_type not in ('school', 'college');

-- 2. Alter default to 'college' and apply CHECK constraint
alter table public.institutions
  alter column institution_type set default 'college';

alter table public.institutions
  drop constraint if exists chk_institutions_type;

alter table public.institutions
  add constraint chk_institutions_type
  check (institution_type in ('school', 'college'));

-- 3. Insert or update Acropolis Institute of Technology and Research
insert into public.institutions (name, institution_type, city, area, is_active)
values (
  'Acropolis Institute of Technology and Research',
  'college',
  'Indore',
  'Khandwa Road',
  true
)
on conflict (name) do update set
  institution_type = 'college',
  city = 'Indore',
  area = 'Khandwa Road',
  is_active = true;
