-- ==============================================================================
-- Migration: 0001_schema.sql
-- Description: Core schema, tables, indexes, triggers, and helper functions
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "pgcrypto";

-- 2. UPDATED_AT TIMESTAMP FUNCTION
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3. INSTITUTIONS TABLE
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  institution_type text,
  city text,
  area text,
  verification_method text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_institutions_updated_at
before update on public.institutions
for each row execute function public.set_updated_at();

-- 4. CATEGORIES TABLE
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

-- 5. PROFILES TABLE (Public profile attributes)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  institution_id uuid not null references public.institutions(id),
  course_or_class text,
  graduation_year int check (graduation_year between 1990 and 2100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_institution on public.profiles(institution_id);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 6. PROFILE_PRIVATE TABLE (Sensitive contact, status, and verification details)
create table public.profile_private (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  whatsapp_number text check (whatsapp_number ~ '^\+[1-9][0-9]{9,14}$'),
  whatsapp_verified_at timestamptz,
  account_status text not null default 'active' check (account_status in ('active', 'suspended', 'deleted')),
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profile_private_updated_at
before update on public.profile_private
for each row execute function public.set_updated_at();

-- 7. ADMIN_ROLES TABLE
create table public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'moderator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_admin_roles_updated_at
before update on public.admin_roles
for each row execute function public.set_updated_at();

-- 8. LISTINGS TABLE
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  institution_id uuid not null references public.institutions(id),
  title text not null,
  author text,
  edition text,
  category_id uuid not null references public.categories(id),
  course_or_exam text,
  condition text check (condition in ('like_new', 'good', 'fair', 'poor')),
  description text,
  price_paise int not null check (price_paise >= 0),
  status text not null default 'active' check (status in ('active', 'reserved', 'sold', 'removed')),
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_listings_seller on public.listings(seller_id);
create index idx_listings_institution on public.listings(institution_id);
create index idx_listings_category on public.listings(category_id);
create index idx_listings_price_paise on public.listings(price_paise);
create index idx_listings_status_created on public.listings(status, created_at desc);

create trigger trg_listings_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

-- 9. LISTING_IMAGES TABLE
create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  display_order int not null default 1,
  created_at timestamptz not null default now(),
  constraint uq_listing_images_order unique (listing_id, display_order)
);

create index idx_listing_images_listing on public.listing_images(listing_id);

-- Enforce maximum of 3 images per listing via trigger
create or replace function public.check_listing_images_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  img_count int;
begin
  select count(*) into img_count
  from public.listing_images
  where listing_id = new.listing_id;

  if img_count >= 3 then
    raise exception 'A listing cannot have more than 3 images.';
  end if;
  return new;
end;
$$;

create trigger trg_check_listing_images_limit
before insert on public.listing_images
for each row execute function public.check_listing_images_limit();

-- 10. INTEREST_REQUESTS TABLE
create table public.interest_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'closed')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_interest_buyer_not_seller check (buyer_id <> seller_id)
);

create index idx_interest_requests_listing on public.interest_requests(listing_id);
create index idx_interest_requests_buyer on public.interest_requests(buyer_id);
create index idx_interest_requests_seller on public.interest_requests(seller_id);

-- One active request per buyer per book
create unique index uq_active_interest_request
on public.interest_requests(listing_id, buyer_id)
where status in ('pending', 'accepted');

create trigger trg_interest_requests_updated_at
before update on public.interest_requests
for each row execute function public.set_updated_at();

-- 11. REPORTS TABLE
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_reports_target_present check (reported_user_id is not null or listing_id is not null)
);

create index idx_reports_reporter on public.reports(reporter_id);
create index idx_reports_reported_user on public.reports(reported_user_id);
create index idx_reports_listing on public.reports(listing_id);
create index idx_reports_status on public.reports(status);

create trigger trg_reports_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

-- 12. USER_BLOCKS TABLE
create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint chk_user_blocks_distinct check (blocker_id <> blocked_id)
);

create index idx_user_blocks_blocked on public.user_blocks(blocked_id);

-- 13. CONTACT_MESSAGES TABLE
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null check (length(message) <= 2000),
  status text not null default 'unread' check (status in ('unread', 'read', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_contact_messages_updated_at
before update on public.contact_messages
for each row execute function public.set_updated_at();

-- 14. ADMIN_AUDIT TABLE
create table public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index idx_admin_audit_admin on public.admin_audit(admin_id);
create index idx_admin_audit_target on public.admin_audit(target_type, target_id);

-- 15. AUTH.USERS TRIGGER: Auto-create profiles and profile_private
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta_display_name text;
  meta_institution_id_text text;
  meta_institution_id uuid;
  inst_active boolean;
  meta_whatsapp text;
  meta_course text;
  meta_grad_year int;
begin
  meta_display_name := trim(coalesce(new.raw_user_meta_data->>'display_name', ''));
  meta_institution_id_text := trim(coalesce(new.raw_user_meta_data->>'institution_id', ''));

  if meta_display_name = '' then
    meta_display_name := split_part(new.email, '@', 1);
  end if;

  if meta_institution_id_text = '' then
    raise exception 'Missing required institution_id in user metadata.';
  end if;

  begin
    meta_institution_id := meta_institution_id_text::uuid;
  exception when others then
    raise exception 'Invalid institution_id format: %', meta_institution_id_text;
  end;

  -- Validate institution exists and is active
  select is_active into inst_active
  from public.institutions
  where id = meta_institution_id;

  if inst_active is null or inst_active = false then
    raise exception 'Selected institution is invalid or currently inactive.';
  end if;

  meta_whatsapp := nullif(trim(coalesce(new.raw_user_meta_data->>'whatsapp_number', '')), '');
  meta_course := nullif(trim(coalesce(new.raw_user_meta_data->>'course_or_class', '')), '');
  
  begin
    meta_grad_year := (new.raw_user_meta_data->>'graduation_year')::int;
  exception when others then
    meta_grad_year := null;
  end;

  insert into public.profiles (
    id,
    display_name,
    institution_id,
    course_or_class,
    graduation_year
  ) values (
    new.id,
    meta_display_name,
    meta_institution_id,
    meta_course,
    meta_grad_year
  );

  insert into public.profile_private (
    user_id,
    whatsapp_number,
    account_status
  ) values (
    new.id,
    meta_whatsapp,
    'active'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 16. HELPER FUNCTIONS
-- Helper: check if caller is an admin or moderator
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_roles
    where user_id = (select auth.uid())
      and role in ('admin', 'moderator')
  );
$$;

-- Helper: check if target user is active
create or replace function public.is_active_user(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profile_private
    where user_id = uid
      and account_status = 'active'
  );
$$;
