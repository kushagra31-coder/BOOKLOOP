/**
 * Vitest Integration Test Suite for BookLoop
 * Runs against the real Supabase backend with anon key and user sign-in sessions.
 * Zero mocks used.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Helper to load environment variables from web/.env.local or scripts/.env
function loadTestEnv() {
  const env = { ...process.env };
  const candidateFiles = [
    path.resolve(__dirname, '../web/.env.local'),
    path.resolve(__dirname, '../scripts/.env'),
  ];

  for (const f of candidateFiles) {
    if (fs.existsSync(f)) {
      const content = fs.readFileSync(f, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq > 0) {
          const k = trimmed.substring(0, eq).trim();
          const v = trimmed.substring(eq + 1).trim().replace(/^['"]|['"]$/g, '');
          if (!env[k]) env[k] = v;
        }
      }
    }
  }

  return env;
}

const env = loadTestEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

// Create unauthenticated client
function createAnonClient() {
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Create authenticated client by signing in with email & password
async function createAuthClient(email, password = env.SEED_DEMO_PASSWORD) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client, user: data.user, session: data.session };
}

// Summary table tracker
const resultsTable = [];
function recordResult(testName, description, passed, details = '') {
  resultsTable.push({
    '#': resultsTable.length + 1,
    'Test Name': testName,
    'Description': description,
    'Result': passed ? '✅ PASS' : '❌ FAIL',
    'Details': details,
  });
}

describe('BookLoop Real Supabase Security & Functional Tests', () => {
  let anon;
  let u1, u2, u3, u4, u5, u6, u7Admin, u8Suspended;
  let categories = {};
  let institutions = {};
  let activeBookIds = [];

  beforeAll(async () => {
    expect(supabaseUrl, 'Missing SUPABASE_URL in web/.env.local or scripts/.env').toBeDefined();
    expect(anonKey, 'Missing SUPABASE_ANON_KEY in web/.env.local or scripts/.env').toBeDefined();

    anon = createAnonClient();

    // Fetch categories and institutions for filter lookups
    const [catsRes, instsRes] = await Promise.all([
      anon.from('categories').select('id, name'),
      anon.from('institutions').select('id, name'),
    ]);

    (catsRes.data || []).forEach((c) => { categories[c.name] = c.id; });
    (instsRes.data || []).forEach((i) => { institutions[i.name] = i.id; });

    // Authenticate test users
    try {
      u1 = await createAuthClient('aarav@demo.test');
      u2 = await createAuthClient('priya@demo.test');
      u3 = await createAuthClient('rohan@demo.test');
      u4 = await createAuthClient('sneha@demo.test');
      u5 = await createAuthClient('kabir@demo.test');
      u6 = await createAuthClient('isha@demo.test');
      u7Admin = await createAuthClient('admin@demo.test');
      u8Suspended = await createAuthClient('sam@demo.test');
    } catch (err) {
      console.warn('Note: Could not authenticate all demo users. Ensure scripts/seed.mjs has been run.', err.message);
    }
  });

  afterAll(() => {
    console.log('\n' + '='.repeat(85));
    console.log('📊 TEST EXECUTION SUMMARY TABLE');
    console.log('='.repeat(85));
    console.table(resultsTable);
    console.log('='.repeat(85) + '\n');
  });

  // ── 1. Anon Search Tests ──
  describe('1. Anon Search via search_listings RPC', () => {
    it('no filters returns exactly 20 active books', async () => {
      const { data, error } = await anon.rpc('search_listings', { p_sort: 'newest', p_limit: 50 });
      expect(error).toBeNull();
      const count = data?.length || 0;
      expect(count).toBe(20);
      activeBookIds = data.map((b) => b.id);
      recordResult('search_no_filters', 'No filters returns exactly 20 books', count === 20, `${count} books`);
    });

    it('keyword "algorithm" matches 2 books', async () => {
      const { data, error } = await anon.rpc('search_listings', { p_query: 'algorithm' });
      expect(error).toBeNull();
      expect(data?.length).toBe(2);
      recordResult('search_algorithm', 'Query "algorithm" matches 2 books', data?.length === 2, `${data?.length} found`);
    });

    it('keyword "silberschatz" matches 2 books', async () => {
      const { data, error } = await anon.rpc('search_listings', { p_query: 'silberschatz' });
      expect(error).toBeNull();
      expect(data?.length).toBe(2);
      recordResult('search_silberschatz', 'Query "silberschatz" matches 2 books', data?.length === 2, `${data?.length} found`);
    });

    it('keyword "operating" matches 2 books', async () => {
      const { data, error } = await anon.rpc('search_listings', { p_query: 'operating' });
      expect(error).toBeNull();
      expect(data?.length).toBe(2);
      recordResult('search_operating', 'Query "operating" matches 2 books', data?.length === 2, `${data?.length} found`);
    });

    it('keyword "c++" matches 1 book', async () => {
      const { data, error } = await anon.rpc('search_listings', { p_query: 'c++' });
      expect(error).toBeNull();
      expect(data?.length).toBe(1);
      recordResult('search_cpp', 'Query "c++" matches 1 book', data?.length === 1, `${data?.length} found`);
    });

    it('category Computer Science matches 6 books', async () => {
      const csId = categories['Computer Science'];
      const { data, error } = await anon.rpc('search_listings', { p_category: csId });
      expect(error).toBeNull();
      expect(data?.length).toBe(6);
      recordResult('search_cat_cs', 'Category CS matches 6 books', data?.length === 6, `${data?.length} found`);
    });

    it('institution SGSITS matches 5 books', async () => {
      const sgsId = institutions['SGSITS'];
      const { data, error } = await anon.rpc('search_listings', { p_institution: sgsId });
      expect(error).toBeNull();
      expect(data?.length).toBe(5);
      recordResult('search_inst_sgs', 'Institution SGS matches 5 books', data?.length === 5, `${data?.length} found`);
    });

    it('price range 300-500 rupees matches 7 books', async () => {
      const { data, error } = await anon.rpc('search_listings', { p_min: 30000, p_max: 50000 });
      expect(error).toBeNull();
      expect(data?.length).toBe(7);
      recordResult('search_price_300_500', 'Price 300-500 matches 7 books', data?.length === 7, `${data?.length} found`);
    });

    it('min price 500 rupees matches 7 books', async () => {
      const { data, error } = await anon.rpc('search_listings', { p_min: 50000 });
      expect(error).toBeNull();
      expect(data?.length).toBe(7);
      recordResult('search_min_500', 'Min price 500 matches 7 books', data?.length === 7, `${data?.length} found`);
    });

    it('max price 150 rupees matches 4 books', async () => {
      const { data, error } = await anon.rpc('search_listings', { p_max: 15000 });
      expect(error).toBeNull();
      expect(data?.length).toBe(4);
      recordResult('search_max_150', 'Max price 150 matches 4 books', data?.length === 4, `${data?.length} found`);
    });

    it('max price 0 (free) matches 1 book', async () => {
      const { data, error } = await anon.rpc('search_listings', { p_max: 0 });
      expect(error).toBeNull();
      expect(data?.length).toBe(1);
      recordResult('search_max_0', 'Max price 0 matches 1 free book', data?.length === 1, `${data?.length} found`);
    });

    it('Management + SGSITS combined filter matches 0 books', async () => {
      const mgmtId = categories['Management'];
      const sgsId = institutions['SGSITS'];
      const { data, error } = await anon.rpc('search_listings', { p_category: mgmtId, p_institution: sgsId });
      expect(error).toBeNull();
      expect(data?.length).toBe(0);
      recordResult('search_mgmt_sgs', 'Management + SGS matches 0 books', data?.length === 0, `${data?.length} found`);
    });

    it('sort price_asc returns 0 paise item first', async () => {
      const { data, error } = await anon.rpc('search_listings', { p_sort: 'price_asc', p_limit: 1 });
      expect(error).toBeNull();
      expect(data?.[0]?.price_paise).toBe(0);
      recordResult('search_price_asc', 'Sort price_asc has 0 paise first', data?.[0]?.price_paise === 0, `First price: ${data?.[0]?.price_paise} paise`);
    });
  });

  // ── 2. RLS Table Isolation (Anon) ──
  describe('2. RLS Isolation: Anon cannot read protected tables', () => {
    it('anon cannot read profile_private', async () => {
      const { data, error } = await anon.from('profile_private').select('*');
      const blocked = error || !data || data.length === 0;
      expect(blocked).toBeTruthy();
      recordResult('rls_profile_private', 'Anon cannot read profile_private', !!blocked, error ? error.message : '0 rows returned');
    });

    it('anon cannot read interest_requests', async () => {
      const { data, error } = await anon.from('interest_requests').select('*');
      const blocked = error || !data || data.length === 0;
      expect(blocked).toBeTruthy();
      recordResult('rls_interest_requests', 'Anon cannot read interest_requests', !!blocked, error ? error.message : '0 rows returned');
    });

    it('anon cannot read reports', async () => {
      const { data, error } = await anon.from('reports').select('*');
      const blocked = error || !data || data.length === 0;
      expect(blocked).toBeTruthy();
      recordResult('rls_reports', 'Anon cannot read reports', !!blocked, error ? error.message : '0 rows returned');
    });

    it('anon cannot read admin_audit', async () => {
      const { data, error } = await anon.from('admin_audit').select('*');
      const blocked = error || !data || data.length === 0;
      expect(blocked).toBeTruthy();
      recordResult('rls_admin_audit', 'Anon cannot read admin_audit', !!blocked, error ? error.message : '0 rows returned');
    });

    it('anon cannot read contact_messages', async () => {
      const { data, error } = await anon.from('contact_messages').select('*');
      const blocked = error || !data || data.length === 0;
      expect(blocked).toBeTruthy();
      recordResult('rls_contact_messages', 'Anon cannot read contact_messages', !!blocked, error ? error.message : '0 rows returned');
    });
  });

  // ── 3. WhatsApp Privacy (get_seller_contact) ──
  describe('3. WhatsApp Privacy: get_seller_contact security', () => {
    let acceptedReqId;
    let pendingReqId;
    let declinedReqId;

    beforeAll(async () => {
      if (!u5) return;
      // Find seeded request IDs
      const { data: reqs } = await u5.client.from('interest_requests').select('id, status');
      (reqs || []).forEach((r) => {
        if (r.status === 'accepted') acceptedReqId = r.id;
        if (r.status === 'pending') pendingReqId = r.id;
        if (r.status === 'declined') declinedReqId = r.id;
      });
    });

    it('fails for anon', async () => {
      const { data, error } = await anon.rpc('get_seller_contact', { p_request_id: acceptedReqId || '00000000-0000-0000-0000-000000000000' });
      expect(error).not.toBeNull();
      recordResult('wa_anon_blocked', 'get_seller_contact fails for anon', !!error, error?.message);
    });

    it('fails for unrelated authenticated user', async () => {
      if (!u2 || !acceptedReqId) return;
      const { data, error } = await u2.client.rpc('get_seller_contact', { p_request_id: acceptedReqId });
      expect(error).not.toBeNull();
      recordResult('wa_unrelated_user_blocked', 'get_seller_contact fails for unrelated user', !!error, error?.message);
    });

    it('fails for pending requests', async () => {
      if (!u5 || !pendingReqId) return;
      const { data, error } = await u5.client.rpc('get_seller_contact', { p_request_id: pendingReqId });
      expect(error).not.toBeNull();
      recordResult('wa_pending_blocked', 'get_seller_contact fails on pending request', !!error, error?.message);
    });

    it('fails for declined requests', async () => {
      if (!u6 || !declinedReqId) return;
      const { data, error } = await u6.client.rpc('get_seller_contact', { p_request_id: declinedReqId });
      expect(error).not.toBeNull();
      recordResult('wa_declined_blocked', 'get_seller_contact fails on declined request', !!error, error?.message);
    });

    it('succeeds strictly for accepted buyer, returning WhatsApp number', async () => {
      if (!u5 || !acceptedReqId) return;
      const { data, error } = await u5.client.rpc('get_seller_contact', { p_request_id: acceptedReqId });
      expect(error).toBeNull();
      expect(data).toMatch(/^\+?[0-9]{10,15}$/);
      recordResult('wa_accepted_buyer_success', 'get_seller_contact works for accepted buyer', !error && !!data, `Revealed: ${data}`);
    });
  });

  // ── 4. Ownership & Direct Write Restrictions ──
  describe('4. Ownership & Direct Table Writes Enforcement', () => {
    it('non-owner cannot update someone else listing', async () => {
      if (!u2 || !activeBookIds[0]) return;
      // Book 1 belongs to U1. U2 attempts to update it.
      const { error } = await u2.client.rpc('update_listing', {
        p_id: activeBookIds[0],
        p_title: 'Hacked Title',
        p_author: 'Hacker',
        p_edition: '1st',
        p_category_id: categories['Computer Science'],
        p_course_or_exam: 'OS',
        p_condition: 'poor',
        p_description: 'Tampered description',
        p_price_paise: 99900,
        p_image_paths: ['dummy.png'],
      });
      expect(error).not.toBeNull();
      recordResult('ownership_update_blocked', 'Non-owner blocked from update_listing', !!error, error?.message);
    });

    it('non-owner cannot remove someone else listing', async () => {
      if (!u2 || !activeBookIds[0]) return;
      const { error } = await u2.client.rpc('remove_listing', { p_id: activeBookIds[0] });
      expect(error).not.toBeNull();
      recordResult('ownership_remove_blocked', 'Non-owner blocked from remove_listing', !!error, error?.message);
    });

    it('non-owner cannot mark someone else listing as sold', async () => {
      if (!u2 || !activeBookIds[0]) return;
      const { error } = await u2.client.rpc('mark_listing_sold', { p_id: activeBookIds[0] });
      expect(error).not.toBeNull();
      recordResult('ownership_sold_blocked', 'Non-owner blocked from mark_listing_sold', !!error, error?.message);
    });

    it('direct INSERT into listings table fails', async () => {
      if (!u1) return;
      const { error } = await u1.client.from('listings').insert({
        seller_id: u1.user.id,
        institution_id: institutions['AITR'],
        category_id: categories['Computer Science'],
        title: 'Bypass Listing Attempt',
        price_paise: 10000,
      });
      expect(error).not.toBeNull();
      recordResult('direct_insert_blocked', 'Direct INSERT on listings fails', !!error, error?.message);
    });

    it('direct UPDATE on listings table fails', async () => {
      if (!u1 || !activeBookIds[0]) return;
      const { error } = await u1.client.from('listings').update({ price_paise: 1 }).eq('id', activeBookIds[0]);
      expect(error).not.toBeNull();
      recordResult('direct_update_blocked', 'Direct UPDATE on listings fails', !!error, error?.message);
    });

    it('direct DELETE on listings table fails', async () => {
      if (!u1 || !activeBookIds[0]) return;
      const { error } = await u1.client.from('listings').delete().eq('id', activeBookIds[0]);
      expect(error).not.toBeNull();
      recordResult('direct_delete_blocked', 'Direct DELETE on listings fails', !!error, error?.message);
    });
  });

  // ── 5. Request Rules & Restrictions ──
  describe('5. Interest Request Business Rules & Restrictions', () => {
    it('own-listing request is rejected', async () => {
      if (!u1 || !activeBookIds[0]) return;
      // Book 1 is owned by U1
      const { error } = await u1.client.rpc('create_interest_request', {
        p_listing_id: activeBookIds[0],
        p_message: 'Wanting my own book',
      });
      expect(error).not.toBeNull();
      recordResult('req_own_listing_blocked', 'Own-listing request rejected', !!error, error?.message);
    });

    it('duplicate active request is rejected', async () => {
      if (!u5 || !activeBookIds[0]) return;
      // U5 already has accepted request on Book 1
      const { error } = await u5.client.rpc('create_interest_request', {
        p_listing_id: activeBookIds[0],
        p_message: 'Duplicate request',
      });
      expect(error).not.toBeNull();
      recordResult('req_duplicate_blocked', 'Duplicate request rejected', !!error, error?.message);
    });

    it('request on sold listing is rejected', async () => {
      if (!u5) return;
      // Find a sold listing
      const { data: soldListings } = await anon.from('listings').select('id').eq('status', 'sold').limit(1);
      if (soldListings && soldListings[0]) {
        const { error } = await u5.client.rpc('create_interest_request', {
          p_listing_id: soldListings[0].id,
          p_message: 'Requesting sold book',
        });
        expect(error).not.toBeNull();
        recordResult('req_sold_listing_blocked', 'Request on sold listing rejected', !!error, error?.message);
      }
    });

    it('suspended user cannot create listings', async () => {
      if (!u8Suspended) return;
      const { error } = await u8Suspended.client.rpc('create_listing', {
        p_title: 'Suspended User Listing',
        p_author: 'Test',
        p_edition: '1st',
        p_category_id: categories['Computer Science'],
        p_course_or_exam: 'CS101',
        p_condition: 'good',
        p_description: 'Test',
        p_price_paise: 20000,
        p_image_paths: [`${u8Suspended.user.id}/test.png`],
      });
      expect(error).not.toBeNull();
      recordResult('suspended_create_listing_blocked', 'Suspended user cannot create listings', !!error, error?.message);
    });

    it('suspended user cannot create interest requests', async () => {
      if (!u8Suspended || !activeBookIds[0]) return;
      const { error } = await u8Suspended.client.rpc('create_interest_request', {
        p_listing_id: activeBookIds[0],
        p_message: 'Suspended attempt',
      });
      expect(error).not.toBeNull();
      recordResult('suspended_create_request_blocked', 'Suspended user cannot create interest requests', !!error, error?.message);
    });
  });

  // ── 6. Atomic Sold Transition Closes Pending Requests ──
  describe('6. Atomic mark_listing_sold Closes Pending Requests', () => {
    it('mark_listing_sold closes open pending requests', async () => {
      if (!u1) return;
      // Book 2 (CLRS) belongs to U1 and has a pending request from U5
      // Find book 2 id
      const { data: b2 } = await anon.from('listings').select('id').ilike('title', '%CLRS%').single();
      if (!b2) return;

      const { error } = await u1.client.rpc('mark_listing_sold', { p_id: b2.id });
      expect(error).toBeNull();

      // Check request status
      const { data: req } = await u1.client.from('interest_requests').select('status').eq('listing_id', b2.id).maybeSingle();
      expect(req?.status).toBe('closed');
      recordResult('mark_sold_closes_requests', 'mark_listing_sold sets pending requests to closed', req?.status === 'closed', `Request status: ${req?.status}`);
    });
  });

  // ── 7. Admin Function Enforcement ──
  describe('7. Admin Function Security: Non-admin vs Admin', () => {
    it('non-admin fails admin_stats', async () => {
      if (!u1) return;
      const { error } = await u1.client.rpc('admin_stats');
      expect(error).not.toBeNull();
      recordResult('admin_stats_non_admin_blocked', 'Non-admin blocked from admin_stats', !!error, error?.message);
    });

    it('non-admin fails admin_hide_listing', async () => {
      if (!u1 || !activeBookIds[0]) return;
      const { error } = await u1.client.rpc('admin_hide_listing', { p_listing_id: activeBookIds[0] });
      expect(error).not.toBeNull();
      recordResult('admin_hide_non_admin_blocked', 'Non-admin blocked from admin_hide_listing', !!error, error?.message);
    });

    it('non-admin fails admin_set_user_status', async () => {
      if (!u1 || !u2) return;
      const { error } = await u1.client.rpc('admin_set_user_status', { p_user_id: u2.user.id, p_status: 'suspended' });
      expect(error).not.toBeNull();
      recordResult('admin_set_user_status_blocked', 'Non-admin blocked from admin_set_user_status', !!error, error?.message);
    });

    it('non-admin fails admin_upsert_institution', async () => {
      if (!u1) return;
      const { error } = await u1.client.rpc('admin_upsert_institution', { p_name: 'Hacked College' });
      expect(error).not.toBeNull();
      recordResult('admin_upsert_inst_blocked', 'Non-admin blocked from admin_upsert_institution', !!error, error?.message);
    });

    it('admin succeeds on admin_stats', async () => {
      if (!u7Admin) return;
      const { data, error } = await u7Admin.client.rpc('admin_stats');
      expect(error).toBeNull();
      expect(data).toHaveProperty('listings_published');
      recordResult('admin_stats_admin_success', 'Admin succeeds on admin_stats', !error && !!data, `Listings: ${data?.listings_published}`);
    });
  });

  // ── 8. Storage Boundaries ──
  describe('8. Storage RLS & Bucket Limits Enforcement', () => {
    it('uploading into another user folder is rejected', async () => {
      if (!u1 || !u2) return;
      // U1 attempts to upload into U2's folder
      const dummyBuffer = Buffer.from('fake image content');
      const { error } = await u1.client.storage
        .from('listing-images')
        .upload(`${u2.user.id}/unauthorized.png`, dummyBuffer, { contentType: 'image/png' });
      expect(error).not.toBeNull();
      recordResult('storage_cross_user_blocked', 'Upload to other user folder blocked by RLS', !!error, error?.message);
    });

    it('uploading a file exceeding 2MB (e.g. 3MB) is rejected', async () => {
      if (!u1) return;
      // 3MB buffer
      const largeBuffer = Buffer.alloc(3 * 1024 * 1024, 0);
      const { error } = await u1.client.storage
        .from('listing-images')
        .upload(`${u1.user.id}/toolarge.png`, largeBuffer, { contentType: 'image/png' });
      expect(error).not.toBeNull();
      recordResult('storage_file_size_blocked', 'Upload exceeding 2MB size limit is rejected', !!error, error?.message);
    });

    it('uploading a non-image (.txt / text/plain) is rejected', async () => {
      if (!u1) return;
      const textBuffer = Buffer.from('hello world');
      const { error } = await u1.client.storage
        .from('listing-images')
        .upload(`${u1.user.id}/test.txt`, textBuffer, { contentType: 'text/plain' });
      expect(error).not.toBeNull();
      recordResult('storage_mime_type_blocked', 'Upload with non-image mime type is rejected', !!error, error?.message);
    });
  });
});
