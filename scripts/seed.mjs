#!/usr/bin/env node
/**
 * BookLoop Local Seed Script (Node.js)
 * Populates Supabase Postgres and Storage with the demo benchmark dataset.
 *
 * Safety constraint:
 * Refuses to run unless SEED_ALLOWED=true is set in scripts/.env.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
import crypto from 'crypto';

// Resolve project root & scripts directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Manually parse scripts/.env (zero external dependencies)
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const webEnvPath = path.join(projectRoot, 'web', '.env.local');

  const env = { ...process.env };

  const pathsToTry = [envPath, webEnvPath];
  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx).trim();
          const val = trimmed.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (!env[key]) env[key] = val;
        }
      }
    }
  }

  return env;
}

const env = loadEnv();

// 2. Safety Check: Refuse unless SEED_ALLOWED=true
const seedAllowed = (env.SEED_ALLOWED || '').toLowerCase().trim();
if (seedAllowed !== 'true') {
  console.error('\n❌ ERROR: Refusing to run seed script.');
  console.error('Safety guard: SEED_ALLOWED must be set to "true" in scripts/.env\n');
  process.exit(1);
}

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const demoPassword = env.SEED_DEMO_PASSWORD;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('\n❌ ERROR: Missing credentials in scripts/.env.');
  console.error('Both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be provided.\n');
  process.exit(1);
}

if (!demoPassword) {
  console.error('\n❌ ERROR: Missing SEED_DEMO_PASSWORD in scripts/.env.');
  console.error('Set SEED_DEMO_PASSWORD to specify the password for seeded @demo.test accounts.\n');
  process.exit(1);
}

// Dynamically import @supabase/supabase-js from web/node_modules if needed
let createClient;
try {
  const sbModule = await import('@supabase/supabase-js');
  createClient = sbModule.createClient;
} catch (e) {
  const webSbPath = path.join(projectRoot, 'web', 'node_modules', '@supabase', 'supabase-js', 'dist', 'main', 'index.js');
  const sbModule = await import('file://' + webSbPath.replace(/\\/g, '/'));
  createClient = sbModule.createClient;
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Pure Node PNG Generator ──
function generatePngBuffer(width = 400, height = 500, r = 36, g = 59, b = 100) {
  function makeChunk(type, data) {
    const len = data.length;
    const chunk = Buffer.alloc(12 + len);
    chunk.writeUInt32BE(len, 0);
    chunk.write(type, 4, 4, 'ascii');
    data.copy(chunk, 8);
    const crc = zlib.crc32(chunk.subarray(4, 8 + len));
    chunk.writeUInt32BE(crc >>> 0, 8 + len);
    return chunk;
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 2; // Color type: 2 (RGB)
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const offset = y * rowSize;
    rawData[offset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const px = offset + 1 + x * 3;
      // Slight decorative gradient
      const factor = (y / height) * 0.4 + 0.8;
      rawData[px] = Math.min(255, Math.floor(r * factor));
      rawData[px + 1] = Math.min(255, Math.floor(g * factor));
      rawData[px + 2] = Math.min(255, Math.floor(b * factor));
    }
  }

  const idatChunk = makeChunk('IDAT', zlib.deflateSync(rawData));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const CATEGORY_COLORS = {
  'Computer Science': [30, 58, 138],
  'Electrical Engineering': [180, 83, 9],
  'Mathematics': [67, 56, 202],
  'Physics': [4, 120, 87],
  'Chemistry': [15, 118, 110],
  'Management': [124, 45, 18],
  'Economics': [6, 95, 70],
  'Competitive Exams': [131, 24, 67],
  'Engineering': [30, 41, 59],
};

// ── Reset Mode ──
async function handleReset() {
  console.log('\n[Reset] Searching for existing @demo.test accounts...');
  const { data: userList, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;

  const demoUsers = (userList?.users || []).filter((u) => u.email?.endsWith('@demo.test'));
  console.log(`[Reset] Found ${demoUsers.length} demo users to purge.`);

  for (const u of demoUsers) {
    // 1. Remove storage photos in listing-images/{uid}/*
    try {
      const { data: files } = await supabase.storage.from('listing-images').list(u.id);
      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${u.id}/${f.name}`);
        await supabase.storage.from('listing-images').remove(filePaths);
      }
    } catch (e) {
      // ignore storage list errors
    }

    // 2. Delete user from auth.users (cascades to profiles, listings, requests, etc.)
    const { error: delError } = await supabase.auth.admin.deleteUser(u.id);
    if (delError) {
      console.warn(`[Reset] Failed to delete user ${u.email}:`, delError.message);
    }
  }

  console.log('[Reset] Demo data successfully wiped.');
}

// ── Main Seed Execution ──
async function runSeed() {
  const isReset = process.argv.includes('--reset');

  if (isReset) {
    await handleReset();
  }

  console.log('\n' + '='.repeat(60));
  console.log('🌱 Starting BookLoop Demo Database Seeding...');
  console.log('='.repeat(60));

  // 1. Seed Institutions
  console.log('\n[1/7] Seeding Institutions...');
  const institutionsSpec = [
    { name: 'Acropolis Institute of Technology and Research', code: 'AITR', city: 'Indore', institution_type: 'university', is_active: true },
    { name: 'IET DAVV', code: 'IETD', city: 'Indore', institution_type: 'college', is_active: true },
    { name: 'SGSITS', code: 'SGS', city: 'Indore', institution_type: 'institute', is_active: true },
    { name: 'IIT Indore', code: 'IITI', city: 'Indore', institution_type: 'institute', is_active: true },
    { name: 'Medicaps', code: 'MED', city: 'Indore', institution_type: 'university', is_active: true },
    { name: 'IPS Academy', code: 'IPS', city: 'Indore', institution_type: 'college', is_active: true },
    // Inactive legacy institutions
    { name: 'Indian Institute of Technology Madras', code: 'IITM', city: 'Chennai', institution_type: 'institute', is_active: false },
    { name: 'National Institute of Technology Tiruchirappalli', code: 'NITT', city: 'Tiruchirappalli', institution_type: 'institute', is_active: false },
    { name: 'College of Engineering Guindy, Anna University', code: 'CEG', city: 'Chennai', institution_type: 'college', is_active: false },
    { name: 'PSG College of Technology', code: 'PSGCT', city: 'Coimbatore', institution_type: 'college', is_active: false },
    { name: 'Loyola College', code: 'LC', city: 'Chennai', institution_type: 'college', is_active: false },
  ];

  const instMap = {};
  for (const inst of institutionsSpec) {
    const { data, error } = await supabase
      .from('institutions')
      .upsert(
        {
          name: inst.name,
          city: inst.city,
          institution_type: inst.institution_type,
          is_active: inst.is_active,
        },
        { onConflict: 'name' }
      )
      .select('id, name')
      .single();

    if (error) throw error;
    instMap[inst.code] = data.id;
    instMap[inst.name] = data.id;
  }
  console.log(`✓ Seeded ${institutionsSpec.length} institutions.`);

  // 2. Seed Categories
  console.log('\n[2/7] Seeding Academic Categories...');
  const categoriesSpec = [
    'Computer Science',
    'Electrical Engineering',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Management',
    'Economics',
    'Competitive Exams',
    'Engineering',
  ];

  const catMap = {};
  for (const catName of categoriesSpec) {
    const { data, error } = await supabase
      .from('categories')
      .upsert({ name: catName, is_active: true }, { onConflict: 'name' })
      .select('id, name')
      .single();

    if (error) throw error;
    catMap[catName] = data.id;
  }
  console.log(`✓ Seeded ${categoriesSpec.length} categories.`);

  // 3. Seed Users
  console.log('\n[3/7] Seeding Users with Supabase Auth Admin API...');
  const usersSpec = [
    { uid: 1, name: 'Aarav Mehta', email: 'aarav@demo.test', instCode: 'AITR', dept: 'Computer Science', yr: 2026, role: 'user', status: 'active' },
    { uid: 2, name: 'Priya Nair', email: 'priya@demo.test', instCode: 'IETD', dept: 'Computer Science', yr: 2026, role: 'user', status: 'active' },
    { uid: 3, name: 'Rohan Verma', email: 'rohan@demo.test', instCode: 'SGS', dept: 'Electrical Engineering', yr: 2025, role: 'user', status: 'active' },
    { uid: 4, name: 'Sneha Patel', email: 'sneha@demo.test', instCode: 'IITI', dept: 'Computer Science', yr: 2025, role: 'user', status: 'active' },
    { uid: 5, name: 'Kabir Singh', email: 'kabir@demo.test', instCode: 'MED', dept: 'Management', yr: 2026, role: 'user', status: 'active' },
    { uid: 6, name: 'Isha Joshi', email: 'isha@demo.test', instCode: 'IPS', dept: 'Management', yr: 2027, role: 'user', status: 'active' },
    { uid: 7, name: 'Admin Moderator', email: 'admin@demo.test', instCode: 'AITR', dept: 'Campus Administration', yr: 2024, role: 'admin', status: 'active' },
    { uid: 8, name: 'Sam Suspended', email: 'sam@demo.test', instCode: 'AITR', dept: 'Computer Science', yr: 2026, role: 'user', status: 'suspended' },
    { uid: 9, name: 'Unverified User', email: 'unverified@demo.test', instCode: 'IPS', dept: 'Engineering', yr: 2027, role: 'user', status: 'active' },
  ];

  const userMap = {}; // uid -> authUser.id

  for (const u of usersSpec) {
    const instId = instMap[u.instCode];
    const waNumber = `+91900000000${u.uid}`;

    // Create or retrieve auth user
    let authUser = null;
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: demoPassword,
      email_confirm: true,
      user_metadata: {
        display_name: u.name,
        institution_id: instId,
        course_or_class: u.dept,
        graduation_year: u.yr,
      },
    });

    if (createError) {
      if (createError.message.includes('already exists') || createError.status === 422) {
        const { data: listData } = await supabase.auth.admin.listUsers();
        authUser = listData?.users?.find((x) => x.email === u.email);
      } else {
        throw createError;
      }
    } else {
      authUser = createData.user;
    }

    userMap[u.uid] = authUser.id;

    // Set WhatsApp number & status in profile_private
    await supabase
      .from('profile_private')
      .update({
        whatsapp_number: waNumber,
        account_status: u.status,
      })
      .eq('user_id', authUser.id);

    // If admin, assign in admin_roles
    if (u.role === 'admin') {
      await supabase
        .from('admin_roles')
        .upsert({ user_id: authUser.id, role: 'admin' }, { onConflict: 'user_id' });
    }
  }
  console.log(`✓ Seeded ${usersSpec.length} demo users.`);

  // 4. Seed Listings & Images
  console.log('\n[4/7] Seeding Listings & Generating Cover Photos in Storage...');
  const activeListingsSpec = [
    { id: 1, title: 'Operating System Concepts (Dinosaur Book)', author: 'Silberschatz, Galvin, Gagne', category: 'Computer Science', subject: 'OS', condition: 'good', price: 420, sellerUid: 1, photos: 3 },
    { id: 2, title: 'Introduction to Algorithms (CLRS)', author: 'Cormen, Leiserson, Rivest, Stein', category: 'Computer Science', subject: 'Algorithms', condition: 'good', price: 650, sellerUid: 1, photos: 2 },
    { id: 3, title: 'Data Structures and Algorithms in C++', author: 'Mark Allen Weiss', category: 'Computer Science', subject: 'DSA', condition: 'like_new', price: 480, sellerUid: 2, photos: 1 },
    { id: 4, title: 'Database System Concepts', author: 'Abraham Silberschatz', category: 'Computer Science', subject: 'DBMS', condition: 'fair', price: 300, sellerUid: 2, photos: 1 },
    { id: 5, title: 'Computer Networks', author: 'Andrew Tanenbaum', category: 'Computer Science', subject: 'Networks', condition: 'poor', price: 120, sellerUid: 3, photos: 1 },
    { id: 6, title: 'Digital Design', author: 'M. Morris Mano', category: 'Electrical Engineering', subject: 'Digital Logic', condition: 'good', price: 320, sellerUid: 3, photos: 1 },
    { id: 7, title: 'Microelectronic Circuits', author: 'Sedra and Smith', category: 'Electrical Engineering', subject: 'Analog Electronics', condition: 'like_new', price: 900, sellerUid: 4, photos: 2 },
    { id: 8, title: 'Higher Engineering Mathematics', author: 'B.S. Grewal', category: 'Mathematics', subject: 'Maths 1', condition: 'good', price: 350, sellerUid: 1, photos: 1 },
    { id: 9, title: 'Advanced Engineering Mathematics', author: 'Erwin Kreyszig', category: 'Mathematics', subject: 'Maths 3', condition: 'fair', price: 500, sellerUid: 2, photos: 1 },
    { id: 10, title: 'Concepts of Physics Vol 1', author: 'H.C. Verma', category: 'Physics', subject: 'Physics 1', condition: 'like_new', price: 290, sellerUid: 3, photos: 1 },
    { id: 11, title: 'Concepts of Physics Vol 2', author: 'H.C. Verma', category: 'Physics', subject: 'Physics 1', condition: 'good', price: 250, sellerUid: 3, photos: 1 },
    { id: 12, title: 'University Chemistry', author: 'Bruce H. Mahan', category: 'Chemistry', subject: 'Chemistry 1', condition: 'fair', price: 0, sellerUid: 4, photos: 1 },
    { id: 13, title: 'Organic Chemistry', author: 'Morrison and Boyd', category: 'Chemistry', subject: 'Organic Chemistry', condition: 'good', price: 399, sellerUid: 5, photos: 1 },
    { id: 14, title: 'Marketing Management', author: 'Philip Kotler', category: 'Management', subject: 'Marketing', condition: 'good', price: 550, sellerUid: 6, photos: 1 },
    { id: 15, title: 'Principles of Economics', author: 'N. Gregory Mankiw', category: 'Economics', subject: 'Economics', condition: 'like_new', price: 700, sellerUid: 5, photos: 1 },
    { id: 16, title: 'GATE Computer Science Question Bank', author: 'Made Easy', category: 'Competitive Exams', subject: 'GATE CSE', condition: 'fair', price: 200, sellerUid: 1, photos: 1 },
    { id: 17, title: 'Quantitative Aptitude', author: 'R.S. Aggarwal', category: 'Competitive Exams', subject: 'Aptitude', condition: 'good', price: 150, sellerUid: 6, photos: 1 },
    { id: 18, title: 'Understanding Physics: Mechanics', author: 'D.C. Pandey', category: 'Physics', subject: 'Mechanics', condition: 'poor', price: 100, sellerUid: 3, photos: 1 },
    { id: 19, title: 'A Comprehensive Guide to Modern Operating Systems, Distributed Computing and Cloud Infrastructure, Second Revised Edition', author: null, category: 'Computer Science', subject: 'OS / Cloud', condition: 'good', price: 1200, sellerUid: 4, photos: 1 },
    { id: 20, title: 'Discrete Mathematics and Its Applications', author: 'Kenneth Rosen', category: 'Mathematics', subject: 'Discrete Maths', condition: 'like_new', price: 1500, sellerUid: 4, photos: 1 },
  ];

  const inactiveListingsSpec = [
    { id: 21, title: 'Engineering Drawing', author: 'N.D. Bhatt', category: 'Engineering', subject: 'Engineering Drawing', condition: 'good', price: 180, sellerUid: 1, status: 'sold', isSold: true },
    { id: 22, title: 'Theory of Machines', author: 'S.S. Rattan', category: 'Engineering', subject: 'Theory of Machines', condition: 'good', price: 350, sellerUid: 3, status: 'sold', isSold: true },
    { id: 23, title: 'Old Syllabus Chemistry Notes', author: 'Campus Notes', category: 'Chemistry', subject: 'Chemistry Notes', condition: 'fair', price: 80, sellerUid: 4, status: 'removed', isSold: false },
    { id: 24, title: 'Engineering Physics Print', author: 'Class Notes', category: 'Physics', subject: 'Engineering Physics', condition: 'fair', price: 60, sellerUid: 3, status: 'removed', isSold: false },
  ];

  const listingIdMap = {}; // specId -> database uuid

  const now = new Date();

  // Helper to generate and upload photo
  async function uploadPhoto(userId, categoryName) {
    const rgb = CATEGORY_COLORS[categoryName] || [36, 59, 100];
    const buffer = generatePngBuffer(400, 500, rgb[0], rgb[1], rgb[2]);
    const filename = `${crypto.randomUUID()}.png`;
    const storagePath = `${userId}/${filename}`;

    const { error: upError } = await supabase.storage
      .from('listing-images')
      .upload(storagePath, buffer, { contentType: 'image/png', upsert: true });

    if (upError) throw upError;
    return storagePath;
  }

  // Insert Active Listings
  for (const item of activeListingsSpec) {
    const sellerId = userMap[item.sellerUid];
    const catId = catMap[item.category];

    // Fetch seller institution
    const { data: sellerProf } = await supabase
      .from('profiles')
      .select('institution_id')
      .eq('id', sellerId)
      .single();

    const daysAgo = 20 - item.id;
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 + item.id * 5 * 60 * 1000);

    const desc = item.id === 19 ? null : 'Clean copy, minor highlighting.';

    const { data: listingData, error: lError } = await supabase
      .from('listings')
      .insert({
        seller_id: sellerId,
        institution_id: sellerProf.institution_id,
        category_id: catId,
        title: item.title,
        author: item.author,
        edition: '1st',
        course_or_exam: item.subject,
        condition: item.condition,
        description: desc,
        price_paise: item.price * 100,
        status: 'active',
        created_at: createdAt.toISOString(),
      })
      .select('id')
      .single();

    if (lError) throw lError;
    listingIdMap[item.id] = listingData.id;

    // Upload & attach images
    for (let p = 1; p <= item.photos; p++) {
      const path = await uploadPhoto(sellerId, item.category);
      await supabase.from('listing_images').insert({
        listing_id: listingData.id,
        storage_path: path,
        display_order: p,
      });
    }
  }

  // Insert Inactive Listings
  for (const item of inactiveListingsSpec) {
    const sellerId = userMap[item.sellerUid];
    const catId = catMap[item.category];

    const { data: sellerProf } = await supabase
      .from('profiles')
      .select('institution_id')
      .eq('id', sellerId)
      .single();

    const createdAt = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000);
    const soldAt = item.isSold ? new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() : null;

    const { data: listingData, error: lError } = await supabase
      .from('listings')
      .insert({
        seller_id: sellerId,
        institution_id: sellerProf.institution_id,
        category_id: catId,
        title: item.title,
        author: item.author,
        edition: '1st',
        course_or_exam: item.subject,
        condition: item.condition,
        description: 'Clean copy, minor highlighting.',
        price_paise: item.price * 100,
        status: item.status,
        sold_at: soldAt,
        created_at: createdAt.toISOString(),
      })
      .select('id')
      .single();

    if (lError) throw lError;
    listingIdMap[item.id] = listingData.id;

    const path = await uploadPhoto(sellerId, item.category);
    await supabase.from('listing_images').insert({
      listing_id: listingData.id,
      storage_path: path,
      display_order: 1,
    });
  }
  console.log(`✓ Seeded 24 listings with verified photos.`);

  // 5. Seed Interest Requests
  console.log('\n[5/7] Seeding Interest Requests...');
  const requestsSpec = [
    { buyerUid: 5, bookSpecId: 1, sellerUid: 1, status: 'accepted', msg: 'Hi Aarav, I would like to buy your OS Dinosaur book. Can we meet tomorrow?', respAgoDays: 1 },
    { buyerUid: 6, bookSpecId: 1, sellerUid: 1, status: 'pending', msg: 'Hello, is this OS textbook still available for purchase?', respAgoDays: null },
    { buyerUid: 5, bookSpecId: 2, sellerUid: 1, status: 'pending', msg: 'Hi Aarav, interested in your CLRS Algorithms book.', respAgoDays: null },
    { buyerUid: 6, bookSpecId: 10, sellerUid: 3, status: 'declined', msg: 'Would you consider Rs 200 for Concepts of Physics?', respAgoDays: 1 },
    { buyerUid: 5, bookSpecId: 4, sellerUid: 2, status: 'cancelled', msg: 'Hi Priya, interested in DBMS book. (Request cancelled)', respAgoDays: null },
    { buyerUid: 6, bookSpecId: 21, sellerUid: 1, status: 'closed', msg: 'Interested in Engineering Drawing. (Listing sold/closed)', respAgoDays: null },
  ];

  for (const req of requestsSpec) {
    const listingId = listingIdMap[req.bookSpecId];
    const buyerId = userMap[req.buyerUid];
    const sellerId = userMap[req.sellerUid];

    const respondedAt = req.respAgoDays
      ? new Date(now.getTime() - req.respAgoDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { error: rError } = await supabase.from('interest_requests').insert({
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      status: req.status,
      message: req.msg,
      responded_at: respondedAt,
    });

    if (rError) throw rError;
  }
  console.log(`✓ Seeded ${requestsSpec.length} interest requests.`);

  // 6. Seed Moderation Reports
  console.log('\n[6/7] Seeding Moderation Reports...');
  const reportsSpec = [
    { reporterUid: 5, targetType: 'user', reportedUid: 8, listingSpecId: null, reason: 'Suspicious activity', details: 'User account is suspended and appears fraudulent.', status: 'open', notes: null },
    { reporterUid: 6, targetType: 'listing', reportedUid: null, listingSpecId: 24, reason: 'Inappropriate listing', details: 'Printout quality violates guidelines.', status: 'reviewing', notes: 'Investigating listing.' },
    { reporterUid: 3, targetType: 'listing', reportedUid: null, listingSpecId: 23, reason: 'Outdated syllabus notes', details: 'Notes are from old syllabus, no longer useful.', status: 'resolved', notes: 'Listing removed from marketplace.' },
    { reporterUid: 2, targetType: 'user', reportedUid: 6, listingSpecId: null, reason: 'Miscommunication', details: 'Unresponsive during meetup discussion.', status: 'dismissed', notes: 'No policy violation found; resolved between parties.' },
  ];

  for (const rep of reportsSpec) {
    const reporterId = userMap[rep.reporterUid];
    const reportedUserId = rep.reportedUid ? userMap[rep.reportedUid] : null;
    const listingId = rep.listingSpecId ? listingIdMap[rep.listingSpecId] : null;

    const { error: repError } = await supabase.from('reports').insert({
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      listing_id: listingId,
      reason: rep.reason,
      details: rep.details,
      status: rep.status,
      admin_notes: rep.notes,
      resolved_at: ['resolved', 'dismissed'].includes(rep.status) ? now.toISOString() : null,
    });

    if (repError) throw repError;
  }
  console.log(`✓ Seeded ${reportsSpec.length} moderation reports.`);

  // 7. Seed User Blocks
  console.log('\n[7/7] Seeding User Blocks...');
  // U2 blocks U8
  const { error: blockError } = await supabase.from('user_blocks').upsert({
    blocker_id: userMap[2],
    blocked_id: userMap[8],
  });
  if (blockError) throw blockError;
  console.log('✓ Seeded user block (U2 blocks U8).');

  console.log('\n' + '='.repeat(60));
  console.log('🎉 BOOKLOOP DEMO SEEDING COMPLETE!');
  console.log('='.repeat(60) + '\n');
}

runSeed().catch((err) => {
  console.error('\n❌ Fatal Seeding Error:', err);
  process.exit(1);
});
