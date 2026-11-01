-- ==============================================================================
-- Migration: 0002_rls.sql
-- Description: Enable Row Level Security (RLS) on all tables and configure
--              least-privilege access policies and column grants.
-- ==============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
alter table public.institutions enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.admin_roles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.interest_requests enable row level security;
alter table public.reports enable row level security;
alter table public.user_blocks enable row level security;
alter table public.contact_messages enable row level security;
alter table public.admin_audit enable row level security;

-- 2. REVOKE ALL DEFAULT PERMISSIONS
revoke all on table public.institutions from anon, authenticated, public;
revoke all on table public.categories from anon, authenticated, public;
revoke all on table public.profiles from anon, authenticated, public;
revoke all on table public.profile_private from anon, authenticated, public;
revoke all on table public.admin_roles from anon, authenticated, public;
revoke all on table public.listings from anon, authenticated, public;
revoke all on table public.listing_images from anon, authenticated, public;
revoke all on table public.interest_requests from anon, authenticated, public;
revoke all on table public.reports from anon, authenticated, public;
revoke all on table public.user_blocks from anon, authenticated, public;
revoke all on table public.contact_messages from anon, authenticated, public;
revoke all on table public.admin_audit from anon, authenticated, public;

-- 3. FUNCTION EXECUTE PERMISSIONS
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_active_user(uuid) to anon, authenticated;

-- 4. TABLE GRANTS (LEAST PRIVILEGE)
-- Institutions & Categories: Read-only for visitors & users
grant select on table public.institutions to anon, authenticated;
grant select on table public.categories to anon, authenticated;

-- Profiles: Public directory for all, update own row
grant select on table public.profiles to anon, authenticated;
grant update on table public.profiles to authenticated;

-- Profile Private: Select own row, Column-level grant on whatsapp_number ONLY
grant select on table public.profile_private to authenticated;
grant update (whatsapp_number) on table public.profile_private to authenticated;

-- Admin Roles: Users can query their own role
grant select on table public.admin_roles to authenticated;

-- Listings & Images: Select only (No direct client INSERT/UPDATE/DELETE; writes will use RPCs)
grant select on table public.listings to anon, authenticated;
grant select on table public.listing_images to anon, authenticated;

-- Interest Requests: Select only for involved parties (No direct writes)
grant select on table public.interest_requests to authenticated;

-- Reports, Admin Audit, Contact Messages: Read-only for admins
grant select on table public.reports to authenticated;
grant select on table public.admin_audit to authenticated;
grant select on table public.contact_messages to authenticated;

-- User Blocks: Read-only for the blocker
grant select on table public.user_blocks to authenticated;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ==============================================================================

-- A. INSTITUTIONS
create policy "institutions_select_active"
on public.institutions
for select
to anon, authenticated
using (is_active = true);

-- B. CATEGORIES
create policy "categories_select_active"
on public.categories
for select
to anon, authenticated
using (is_active = true);

-- C. PROFILES
create policy "profiles_select_all"
on public.profiles
for select
to anon, authenticated
using (true);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- D. PROFILE_PRIVATE
create policy "profile_private_select_own"
on public.profile_private
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "profile_private_update_own"
on public.profile_private
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- E. LISTINGS
-- Selectable if status is active, or user is the seller, or user is admin
-- AND user has not been blocked by the seller
create policy "listings_select_policy"
on public.listings
for select
to anon, authenticated
using (
  (
    status = 'active'
    or seller_id = (select auth.uid())
    or public.is_admin()
  )
  and not exists (
    select 1
    from public.user_blocks b
    where b.blocker_id = listings.seller_id
      and b.blocked_id = (select auth.uid())
  )
);

-- F. LISTING_IMAGES
-- Selectable only if parent listing is selectable by current user
create policy "listing_images_select_policy"
on public.listing_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_images.listing_id
  )
);

-- G. INTEREST_REQUESTS
-- Visible strictly to buyer or seller
create policy "interest_requests_select_party"
on public.interest_requests
for select
to authenticated
using (
  buyer_id = (select auth.uid())
  or seller_id = (select auth.uid())
);

-- H. ADMIN_ROLES
-- Visible strictly to own user
create policy "admin_roles_select_own"
on public.admin_roles
for select
to authenticated
using (user_id = (select auth.uid()));

-- I. REPORTS
-- Visible strictly to campus administrators & moderators
create policy "reports_select_admin"
on public.reports
for select
to authenticated
using (public.is_admin());

-- J. ADMIN_AUDIT
-- Visible strictly to campus administrators & moderators
create policy "admin_audit_select_admin"
on public.admin_audit
for select
to authenticated
using (public.is_admin());

-- K. CONTACT_MESSAGES
-- Visible strictly to campus administrators & moderators
create policy "contact_messages_select_admin"
on public.contact_messages
for select
to authenticated
using (public.is_admin());

-- L. USER_BLOCKS
-- Visible strictly to the user who placed the block
create policy "user_blocks_select_blocker"
on public.user_blocks
for select
to authenticated
using (blocker_id = (select auth.uid()));
