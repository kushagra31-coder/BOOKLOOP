-- ==============================================================================
-- Migration: 0003_functions.sql
-- Description: Core business logic RPCs, search, safety, and admin functions
-- ==============================================================================

-- 1. CREATE_LISTING
create or replace function public.create_listing(
  p_title text,
  p_author text,
  p_edition text,
  p_category_id uuid,
  p_course_or_exam text,
  p_condition text,
  p_description text,
  p_price_paise int,
  p_image_paths text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_institution_id uuid;
  v_listing_id uuid;
  v_path text;
  v_order int := 1;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_active_user(v_user_id) then
    raise exception 'User account is not active or is suspended.';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'Listing title is required.';
  end if;

  if p_price_paise is null or p_price_paise < 0 then
    raise exception 'Price must be a non-negative integer in paise.';
  end if;

  if p_condition is null or p_condition not in ('like_new', 'good', 'fair', 'poor') then
    raise exception 'Invalid condition. Allowed: like_new, good, fair, poor.';
  end if;

  -- 1..3 image paths required
  if p_image_paths is null
     or array_length(p_image_paths, 1) is null
     or array_length(p_image_paths, 1) < 1
     or array_length(p_image_paths, 1) > 3 then
    raise exception 'A listing must have between 1 and 3 photos.';
  end if;

  -- Validate each path begins with auth.uid() || '/'
  foreach v_path in array p_image_paths loop
    if v_path is null or not (v_path like (v_user_id::text || '/%')) then
      raise exception 'Image path % is invalid; must start with user folder %/', v_path, v_user_id;
    end if;
  end loop;

  -- Fetch institution from seller profile
  select institution_id into v_institution_id
  from public.profiles
  where id = v_user_id;

  if v_institution_id is null then
    raise exception 'Seller profile is missing an assigned institution.';
  end if;

  if not exists (select 1 from public.categories where id = p_category_id and is_active = true) then
    raise exception 'Selected category does not exist or is inactive.';
  end if;

  -- Insert listing
  insert into public.listings (
    seller_id,
    institution_id,
    title,
    author,
    edition,
    category_id,
    course_or_exam,
    condition,
    description,
    price_paise,
    status
  ) values (
    v_user_id,
    v_institution_id,
    trim(p_title),
    nullif(trim(p_author), ''),
    nullif(trim(p_edition), ''),
    p_category_id,
    nullif(trim(p_course_or_exam), ''),
    p_condition,
    nullif(trim(p_description), ''),
    p_price_paise,
    'active'
  )
  returning id into v_listing_id;

  -- Insert images atomically
  foreach v_path in array p_image_paths loop
    insert into public.listing_images (
      listing_id,
      storage_path,
      display_order
    ) values (
      v_listing_id,
      v_path,
      v_order
    );
    v_order := v_order + 1;
  end loop;

  return v_listing_id;
end;
$$;

revoke all on function public.create_listing from public, anon;
grant execute on function public.create_listing to authenticated;

-- 2. UPDATE_LISTING
create or replace function public.update_listing(
  p_listing_id uuid,
  p_title text,
  p_author text,
  p_edition text,
  p_category_id uuid,
  p_course_or_exam text,
  p_condition text,
  p_description text,
  p_price_paise int,
  p_image_paths text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_seller_id uuid;
  v_status text;
  v_path text;
  v_order int := 1;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select seller_id, status into v_seller_id, v_status
  from public.listings
  where id = p_listing_id;

  if v_seller_id is null then
    raise exception 'Listing not found.';
  end if;

  if v_seller_id <> v_user_id and not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if v_status in ('sold', 'removed') then
    raise exception 'Cannot update a listing that is already sold or removed.';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'Listing title is required.';
  end if;

  if p_price_paise is null or p_price_paise < 0 then
    raise exception 'Price must be a non-negative integer in paise.';
  end if;

  if p_condition is null or p_condition not in ('like_new', 'good', 'fair', 'poor') then
    raise exception 'Invalid condition.';
  end if;

  if p_image_paths is null
     or array_length(p_image_paths, 1) is null
     or array_length(p_image_paths, 1) < 1
     or array_length(p_image_paths, 1) > 3 then
    raise exception 'A listing must have between 1 and 3 photos.';
  end if;

  foreach v_path in array p_image_paths loop
    if v_path is null or not (v_path like (v_seller_id::text || '/%') or v_path like (v_user_id::text || '/%')) then
      raise exception 'Image path % must be within user folder.', v_path;
    end if;
  end loop;

  update public.listings
  set
    title = trim(p_title),
    author = nullif(trim(p_author), ''),
    edition = nullif(trim(p_edition), ''),
    category_id = p_category_id,
    course_or_exam = nullif(trim(p_course_or_exam), ''),
    condition = p_condition,
    description = nullif(trim(p_description), ''),
    price_paise = p_price_paise,
    updated_at = now()
  where id = p_listing_id;

  -- Re-sync images
  delete from public.listing_images where listing_id = p_listing_id;

  foreach v_path in array p_image_paths loop
    insert into public.listing_images (
      listing_id,
      storage_path,
      display_order
    ) values (
      p_listing_id,
      v_path,
      v_order
    );
    v_order := v_order + 1;
  end loop;
end;
$$;

revoke all on function public.update_listing from public, anon;
grant execute on function public.update_listing to authenticated;

-- 3. REMOVE_LISTING
create or replace function public.remove_listing(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_seller_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select seller_id into v_seller_id
  from public.listings
  where id = p_id;

  if v_seller_id is null then
    raise exception 'Listing not found.';
  end if;

  if v_seller_id <> v_user_id and not public.is_admin() then
    raise exception 'forbidden';
  end if;

  update public.listings
  set status = 'removed', updated_at = now()
  where id = p_id;

  -- Close any open requests
  update public.interest_requests
  set status = 'closed', updated_at = now()
  where listing_id = p_id and status = 'pending';
end;
$$;

revoke all on function public.remove_listing from public, anon;
grant execute on function public.remove_listing to authenticated;

-- 4. MARK_LISTING_SOLD
create or replace function public.mark_listing_sold(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_listing record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_listing
  from public.listings
  where id = p_id
  for update;

  if v_listing.id is null then
    raise exception 'Listing not found.';
  end if;

  if v_listing.seller_id <> v_user_id then
    raise exception 'Only the seller can mark a listing as sold.';
  end if;

  if v_listing.status <> 'active' then
    raise exception 'Only active listings can be marked as sold.';
  end if;

  update public.listings
  set status = 'sold', sold_at = now(), updated_at = now()
  where id = p_id;

  update public.interest_requests
  set status = 'closed', updated_at = now()
  where listing_id = p_id and status = 'pending';
end;
$$;

revoke all on function public.mark_listing_sold from public, anon;
grant execute on function public.mark_listing_sold to authenticated;

-- 5. CREATE_INTEREST_REQUEST
create or replace function public.create_interest_request(
  p_listing_id uuid,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_listing record;
  v_req_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_active_user(v_user_id) then
    raise exception 'User account is not active or is suspended.';
  end if;

  select * into v_listing
  from public.listings
  where id = p_listing_id;

  if v_listing.id is null then
    raise exception 'Listing not found.';
  end if;

  if v_listing.status <> 'active' then
    raise exception 'This book listing is no longer available.';
  end if;

  if v_listing.seller_id = v_user_id then
    raise exception 'You cannot submit an interest request on your own listing.';
  end if;

  -- Block check: neither party blocked the other
  if exists (
    select 1 from public.user_blocks
    where (blocker_id = v_listing.seller_id and blocked_id = v_user_id)
       or (blocker_id = v_user_id and blocked_id = v_listing.seller_id)
  ) then
    raise exception 'Cannot interact with this seller.';
  end if;

  -- Check existing active request
  if exists (
    select 1 from public.interest_requests
    where listing_id = p_listing_id
      and buyer_id = v_user_id
      and status in ('pending', 'accepted')
  ) then
    raise exception 'You already have an active interest request for this book.';
  end if;

  insert into public.interest_requests (
    listing_id,
    buyer_id,
    seller_id,
    message,
    status
  ) values (
    p_listing_id,
    v_user_id,
    v_listing.seller_id,
    nullif(trim(p_message), ''),
    'pending'
  )
  returning id into v_req_id;

  return v_req_id;
end;
$$;

revoke all on function public.create_interest_request from public, anon;
grant execute on function public.create_interest_request to authenticated;

-- 6. RESPOND_TO_REQUEST
create or replace function public.respond_to_request(
  p_request_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_req record;
  v_listing record;
  v_whatsapp text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_action not in ('accept', 'decline') then
    raise exception 'Invalid action. Must be accept or decline.';
  end if;

  select * into v_req
  from public.interest_requests
  where id = p_request_id
  for update;

  if v_req.id is null then
    raise exception 'Request not found.';
  end if;

  if v_req.seller_id <> v_user_id then
    raise exception 'Only the seller can respond to this request.';
  end if;

  if v_req.status <> 'pending' then
    raise exception 'This request is no longer pending.';
  end if;

  select * into v_listing
  from public.listings
  where id = v_req.listing_id
  for update;

  if v_listing.status <> 'active' then
    raise exception 'This listing is no longer active.';
  end if;

  if p_action = 'accept' then
    -- Seller must have a verified / valid WhatsApp number
    select whatsapp_number into v_whatsapp
    from public.profile_private
    where user_id = v_user_id;

    if v_whatsapp is null or length(trim(v_whatsapp)) = 0 then
      raise exception 'You must set a valid WhatsApp number in your profile before accepting requests.';
    end if;

    update public.interest_requests
    set status = 'accepted', responded_at = now(), updated_at = now()
    where id = p_request_id;
  else
    update public.interest_requests
    set status = 'declined', responded_at = now(), updated_at = now()
    where id = p_request_id;
  end if;
end;
$$;

revoke all on function public.respond_to_request from public, anon;
grant execute on function public.respond_to_request to authenticated;

-- 7. CANCEL_REQUEST
create or replace function public.cancel_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_req record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_req
  from public.interest_requests
  where id = p_request_id
  for update;

  if v_req.id is null then
    raise exception 'Request not found.';
  end if;

  if v_req.buyer_id <> v_user_id then
    raise exception 'Only the buyer can cancel their own interest request.';
  end if;

  if v_req.status <> 'pending' then
    raise exception 'Only pending requests can be cancelled.';
  end if;

  update public.interest_requests
  set status = 'cancelled', responded_at = now(), updated_at = now()
  where id = p_request_id;
end;
$$;

revoke all on function public.cancel_request from public, anon;
grant execute on function public.cancel_request to authenticated;

-- 8. GET_SELLER_CONTACT
create or replace function public.get_seller_contact(p_request_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_req record;
  v_whatsapp text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select r.*, l.status as listing_status into v_req
  from public.interest_requests r
  join public.listings l on l.id = r.listing_id
  where r.id = p_request_id;

  if v_req.id is null then
    raise exception 'forbidden';
  end if;

  -- Only if auth.uid()=buyer_id AND status='accepted' AND listing status<>'removed'
  if v_req.buyer_id <> v_user_id or v_req.status <> 'accepted' or v_req.listing_status = 'removed' then
    raise exception 'forbidden';
  end if;

  select whatsapp_number into v_whatsapp
  from public.profile_private
  where user_id = v_req.seller_id;

  return coalesce(v_whatsapp, '');
end;
$$;

revoke all on function public.get_seller_contact from public, anon;
grant execute on function public.get_seller_contact to authenticated;

-- 9. SEARCH_LISTINGS (SECURITY INVOKER, public/anon accessible)
create or replace function public.search_listings(
  p_query text default null,
  p_category uuid default null,
  p_institution uuid default null,
  p_min int default null,
  p_max int default null,
  p_sort text default 'newest',
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid,
  title text,
  author text,
  category_name text,
  condition text,
  price_paise int,
  created_at timestamptz,
  institution_name text,
  seller_display_name text,
  cover_path text,
  total_count bigint
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_terms text[];
begin
  if p_query is not null and length(trim(p_query)) > 0 then
    v_terms := regexp_split_to_array(trim(p_query), '\s+');
  else
    v_terms := null;
  end if;

  return query
  with filtered as (
    select
      l.id,
      l.title,
      l.author,
      c.name as category_name,
      l.condition,
      l.price_paise,
      l.created_at,
      i.name as institution_name,
      p.display_name as seller_display_name,
      img.storage_path as cover_path
    from public.listings l
    join public.categories c on c.id = l.category_id
    join public.institutions i on i.id = l.institution_id
    join public.profiles p on p.id = l.seller_id
    left join lateral (
      select storage_path
      from public.listing_images li
      where li.listing_id = l.id
      order by li.display_order asc, li.created_at asc
      limit 1
    ) img on true
    where l.status = 'active'
      -- Hide if seller blocked current user
      and not exists (
        select 1
        from public.user_blocks b
        where b.blocker_id = l.seller_id
          and b.blocked_id = (select auth.uid())
      )
      -- Category filter
      and (p_category is null or l.category_id = p_category)
      -- Institution filter
      and (p_institution is null or l.institution_id = p_institution)
      -- Price min
      and (p_min is null or l.price_paise >= p_min)
      -- Price max: p_max = 0 MUST work, use IS NOT NULL (never truthiness)
      and (p_max is null or l.price_paise <= p_max)
      -- Every search term must match title, author, course_or_exam, or institution name
      and (
        v_terms is null
        or not exists (
          select 1
          from unnest(v_terms) as t(val)
          where not (
            l.title ilike ('%' || replace(replace(replace(t.val, '\', '\\'), '%', '\%'), '_', '\_') || '%')
            or coalesce(l.author, '') ilike ('%' || replace(replace(replace(t.val, '\', '\\'), '%', '\%'), '_', '\_') || '%')
            or coalesce(l.course_or_exam, '') ilike ('%' || replace(replace(replace(t.val, '\', '\\'), '%', '\%'), '_', '\_') || '%')
            or i.name ilike ('%' || replace(replace(replace(t.val, '\', '\\'), '%', '\%'), '_', '\_') || '%')
          )
        )
      )
  ),
  total as (
    select count(*) as cnt from filtered
  )
  select
    f.id,
    f.title,
    f.author,
    f.category_name,
    f.condition,
    f.price_paise,
    f.created_at,
    f.institution_name,
    f.seller_display_name,
    f.cover_path,
    t.cnt as total_count
  from filtered f
  cross join total t
  order by
    case when p_sort = 'price_asc' then f.price_paise end asc,
    case when p_sort = 'price_desc' then f.price_paise end desc,
    case when p_sort = 'newest' or p_sort is null or p_sort not in ('price_asc', 'price_desc') then f.created_at end desc,
    f.id desc
  limit greatest(1, least(coalesce(p_limit, 24), 100))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

-- search_listings is executable by anon and authenticated
grant execute on function public.search_listings to anon, authenticated;

-- 10. CREATE_REPORT
create or replace function public.create_report(
  p_reported_user_id uuid default null,
  p_listing_id uuid default null,
  p_reason text default null,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_rep_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_active_user(v_user_id) then
    raise exception 'Account is inactive or suspended.';
  end if;

  if p_reported_user_id is null and p_listing_id is null then
    raise exception 'Must specify a reported user or listing.';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Reason is required.';
  end if;

  insert into public.reports (
    reporter_id,
    reported_user_id,
    listing_id,
    reason,
    details,
    status
  ) values (
    v_user_id,
    p_reported_user_id,
    p_listing_id,
    trim(p_reason),
    nullif(trim(p_details), ''),
    'open'
  )
  returning id into v_rep_id;

  return v_rep_id;
end;
$$;

revoke all on function public.create_report from public, anon;
grant execute on function public.create_report to authenticated;

-- 11. BLOCK_USER & UNBLOCK_USER
create or replace function public.block_user(p_blocked_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if v_user_id = p_blocked_id then
    raise exception 'You cannot block yourself.';
  end if;

  if not exists (select 1 from public.profiles where id = p_blocked_id) then
    raise exception 'Target user not found.';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (v_user_id, p_blocked_id)
  on conflict (blocker_id, blocked_id) do nothing;
end;
$$;

revoke all on function public.block_user from public, anon;
grant execute on function public.block_user to authenticated;

create or replace function public.unblock_user(p_blocked_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.user_blocks
  where blocker_id = v_user_id and blocked_id = p_blocked_id;
end;
$$;

revoke all on function public.unblock_user from public, anon;
grant execute on function public.unblock_user to authenticated;

-- 12. REQUEST_ACCOUNT_DELETION
create or replace function public.request_account_deletion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  update public.profile_private
  set
    deletion_requested_at = now(),
    account_status = 'deleted',
    updated_at = now()
  where user_id = v_user_id;

  -- Hide all listings owned by this user
  update public.listings
  set status = 'removed', updated_at = now()
  where seller_id = v_user_id and status = 'active';

  -- Close open interest requests
  update public.interest_requests
  set status = 'closed', updated_at = now()
  where (buyer_id = v_user_id or seller_id = v_user_id) and status = 'pending';
end;
$$;

revoke all on function public.request_account_deletion from public, anon;
grant execute on function public.request_account_deletion to authenticated;

-- 13. SUBMIT_CONTACT_MESSAGE (Executable by anon)
create or replace function public.submit_contact_message(
  p_name text,
  p_email text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_msg_id uuid;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Name is required.';
  end if;

  if p_email is null or p_email not like '%@%.%' then
    raise exception 'Valid email address is required.';
  end if;

  if p_message is null or length(trim(p_message)) = 0 then
    raise exception 'Message is required.';
  end if;

  if length(p_message) > 2000 then
    raise exception 'Message cannot exceed 2000 characters.';
  end if;

  insert into public.contact_messages (
    name,
    email,
    message,
    status
  ) values (
    trim(p_name),
    trim(lower(p_email)),
    trim(p_message),
    'unread'
  )
  returning id into v_msg_id;

  return v_msg_id;
end;
$$;

grant execute on function public.submit_contact_message to anon, authenticated;

-- ==============================================================================
-- ADMIN FUNCTIONS (Each checks is_admin() and writes to admin_audit)
-- ==============================================================================

-- 14. ADMIN_HIDE_LISTING
create or replace function public.admin_hide_listing(
  p_listing_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
begin
  v_admin_id := auth.uid();
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  update public.listings
  set status = 'removed', updated_at = now()
  where id = p_listing_id;

  update public.interest_requests
  set status = 'closed', updated_at = now()
  where listing_id = p_listing_id and status = 'pending';

  insert into public.admin_audit (
    admin_id,
    action,
    target_type,
    target_id,
    details
  ) values (
    v_admin_id,
    'HIDE_LISTING',
    'listing',
    p_listing_id::text,
    jsonb_build_object('reason', coalesce(p_reason, 'Admin moderation'))
  );
end;
$$;

revoke all on function public.admin_hide_listing from public, anon;
grant execute on function public.admin_hide_listing to authenticated;

-- 15. ADMIN_SET_USER_STATUS
create or replace function public.admin_set_user_status(
  p_user_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
begin
  v_admin_id := auth.uid();
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if p_status not in ('active', 'suspended', 'deleted') then
    raise exception 'Invalid status. Must be active, suspended, or deleted.';
  end if;

  update public.profile_private
  set account_status = p_status, updated_at = now()
  where user_id = p_user_id;

  if p_status in ('suspended', 'deleted') then
    update public.listings
    set status = 'removed', updated_at = now()
    where seller_id = p_user_id and status = 'active';

    update public.interest_requests
    set status = 'closed', updated_at = now()
    where (buyer_id = p_user_id or seller_id = p_user_id) and status = 'pending';
  end if;

  insert into public.admin_audit (
    admin_id,
    action,
    target_type,
    target_id,
    details
  ) values (
    v_admin_id,
    'SET_USER_STATUS',
    'user',
    p_user_id::text,
    jsonb_build_object('status', p_status, 'reason', coalesce(p_reason, ''))
  );
end;
$$;

revoke all on function public.admin_set_user_status from public, anon;
grant execute on function public.admin_set_user_status to authenticated;

-- 16. ADMIN_UPDATE_REPORT
create or replace function public.admin_update_report(
  p_report_id uuid,
  p_status text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_resolved_at timestamptz := null;
begin
  v_admin_id := auth.uid();
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if p_status not in ('open', 'reviewing', 'resolved', 'dismissed') then
    raise exception 'Invalid report status. Allowed: open, reviewing, resolved, dismissed.';
  end if;

  if p_status in ('resolved', 'dismissed') then
    v_resolved_at := now();
  end if;

  update public.reports
  set
    status = p_status,
    admin_notes = coalesce(p_notes, admin_notes),
    resolved_at = v_resolved_at,
    updated_at = now()
  where id = p_report_id;

  insert into public.admin_audit (
    admin_id,
    action,
    target_type,
    target_id,
    details
  ) values (
    v_admin_id,
    'UPDATE_REPORT',
    'report',
    p_report_id::text,
    jsonb_build_object('status', p_status, 'notes', coalesce(p_notes, ''))
  );
end;
$$;

revoke all on function public.admin_update_report from public, anon;
grant execute on function public.admin_update_report to authenticated;

-- 17. ADMIN_UPSERT_INSTITUTION
create or replace function public.admin_upsert_institution(
  p_id uuid default null,
  p_name text default null,
  p_institution_type text default null,
  p_city text default null,
  p_area text default null,
  p_verification_method text default null,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_target_id uuid;
begin
  v_admin_id := auth.uid();
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Institution name is required.';
  end if;

  if p_id is not null then
    update public.institutions
    set
      name = trim(p_name),
      institution_type = nullif(trim(p_institution_type), ''),
      city = nullif(trim(p_city), ''),
      area = nullif(trim(p_area), ''),
      verification_method = nullif(trim(p_verification_method), ''),
      is_active = p_is_active,
      updated_at = now()
    where id = p_id
    returning id into v_target_id;
  else
    insert into public.institutions (
      name,
      institution_type,
      city,
      area,
      verification_method,
      is_active
    ) values (
      trim(p_name),
      nullif(trim(p_institution_type), ''),
      nullif(trim(p_city), ''),
      nullif(trim(p_area), ''),
      nullif(trim(p_verification_method), ''),
      p_is_active
    )
    returning id into v_target_id;
  end if;

  insert into public.admin_audit (
    admin_id,
    action,
    target_type,
    target_id,
    details
  ) values (
    v_admin_id,
    'UPSERT_INSTITUTION',
    'institution',
    v_target_id::text,
    jsonb_build_object('name', p_name, 'is_active', p_is_active)
  );

  return v_target_id;
end;
$$;

revoke all on function public.admin_upsert_institution from public, anon;
grant execute on function public.admin_upsert_institution to authenticated;

-- 18. ADMIN_UPSERT_CATEGORY
create or replace function public.admin_upsert_category(
  p_id uuid default null,
  p_name text default null,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_target_id uuid;
begin
  v_admin_id := auth.uid();
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Category name is required.';
  end if;

  if p_id is not null then
    update public.categories
    set
      name = trim(p_name),
      is_active = p_is_active,
      updated_at = now()
    where id = p_id
    returning id into v_target_id;
  else
    insert into public.categories (
      name,
      is_active
    ) values (
      trim(p_name),
      p_is_active
    )
    returning id into v_target_id;
  end if;

  insert into public.admin_audit (
    admin_id,
    action,
    target_type,
    target_id,
    details
  ) values (
    v_admin_id,
    'UPSERT_CATEGORY',
    'category',
    v_target_id::text,
    jsonb_build_object('name', p_name, 'is_active', p_is_active)
  );

  return v_target_id;
end;
$$;

revoke all on function public.admin_upsert_category from public, anon;
grant execute on function public.admin_upsert_category to authenticated;

-- 19. ADMIN_STATS
create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_listings_published bigint;
  v_requests_total bigint;
  v_requests_accepted bigint;
  v_books_sold bigint;
  v_open_reports bigint;
  v_suspended_users bigint;
begin
  v_admin_id := auth.uid();
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select count(*) into v_listings_published
  from public.listings
  where status <> 'removed';

  select count(*) into v_requests_total
  from public.interest_requests;

  select count(*) into v_requests_accepted
  from public.interest_requests
  where status = 'accepted';

  select count(*) into v_books_sold
  from public.listings
  where status = 'sold';

  select count(*) into v_open_reports
  from public.reports
  where status = 'open';

  select count(*) into v_suspended_users
  from public.profile_private
  where account_status = 'suspended';

  return jsonb_build_object(
    'listingsPublished', v_listings_published,
    'requestsTotal', v_requests_total,
    'requestsAccepted', v_requests_accepted,
    'booksSold', v_books_sold,
    'openReports', v_open_reports,
    'suspendedUsers', v_suspended_users
  );
end;
$$;

revoke all on function public.admin_stats from public, anon;
grant execute on function public.admin_stats to authenticated;
