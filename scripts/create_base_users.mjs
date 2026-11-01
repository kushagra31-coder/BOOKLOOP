#!/usr/bin/env node
/**
 * BookLoop Base User Accounts Provisioner (Node.js)
 * Creates or updates initial production/testing accounts:
 *   1. Kushagra Singh Tomar (kushagrasingh@gmail.com)
 *   2. Bhagyesh Jain (bhagyeshjain@gmail.com)
 *   3. BookLoop Admin (admin@bookloop.test or from SEED_ADMIN_EMAIL)
 *
 * Local execution only. Never imported or exposed to /web.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Load scripts/.env
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const env = { ...process.env };

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
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

  return env;
}

const env = loadEnv();
const supabaseUrl = env.SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

// 2. Validate environment credentials
if (!supabaseUrl || !serviceRoleKey) {
  console.error('\n❌ ERROR: Missing required credentials.');
  console.error('Both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in scripts/.env\n');
  process.exit(1);
}

// 3. Import Supabase client
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

// Helper to generate a strong 16-character random password
function generateSecurePassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
  const randomBytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[randomBytes[i] % charset.length];
  }
  return result;
}

async function main() {
  const resetPasswords = process.argv.includes('--reset-passwords');
  const purgeOthers = process.argv.includes('--purge-others');

  console.log('\n' + '='.repeat(65));
  console.log('👤 Provisioning BookLoop Base User Accounts...');
  console.log('='.repeat(65));

  // 1. Find or verify target institution: "Acropolis Institute of Technology and Research"
  console.log('\n[1/3] Locating Acropolis Institute institution...');
  let { data: inst, error: instError } = await supabase
    .from('institutions')
    .select('id, name')
    .eq('name', 'Acropolis Institute of Technology and Research')
    .maybeSingle();

  if (instError) throw instError;

  if (!inst) {
    console.log('Institution missing. Inserting Acropolis Institute of Technology and Research...');
    const { data: newInst, error: insertInstError } = await supabase
      .from('institutions')
      .insert({
        name: 'Acropolis Institute of Technology and Research',
        institution_type: 'college',
        city: 'Indore',
        area: 'Khandwa Road',
        is_active: true,
      })
      .select('id, name')
      .single();

    if (insertInstError) throw insertInstError;
    inst = newInst;
  }
  console.log(`✓ Using Institution: ${inst.name} (${inst.id})`);

  // 2. Define account specifications
  const adminEmail = (env.SEED_ADMIN_EMAIL || 'admin@bookloop.test').trim().toLowerCase();

  const accountsSpec = [
    {
      key: 'KUSHAGRA',
      name: 'Kushagra Singh Tomar',
      email: 'kushagrasingh@gmail.com',
      isAdmin: false,
      envPassword: env.SEED_KUSHAGRA_PASSWORD,
    },
    {
      key: 'BHAGYESH',
      name: 'Bhagyesh Jain',
      email: 'bhagyeshjain@gmail.com',
      isAdmin: false,
      envPassword: env.SEED_BHAGYESH_PASSWORD,
    },
    {
      key: 'ADMIN',
      name: 'BookLoop Admin',
      email: adminEmail,
      isAdmin: true,
      envPassword: env.SEED_ADMIN_PASSWORD,
    },
  ];

  // Fetch existing users from auth
  console.log('\n[2/3] Checking existing auth users...');
  const { data: userList, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;

  const existingByEmail = new Map();
  (userList?.users || []).forEach((u) => {
    if (u.email) existingByEmail.set(u.email.toLowerCase(), u);
  });

  // Optional: Purge all other users if requested
  if (purgeOthers) {
    console.log('\n[Purge] Removing all users except the 3 base accounts...');
    const allowed = new Set(accountsSpec.map((a) => a.email.toLowerCase()));
    let purgedCount = 0;
    for (const [email, userObj] of existingByEmail.entries()) {
      if (!allowed.has(email)) {
        console.log(`  • Purging non-base user: ${email} (${userObj.id})`);
        try {
          const { data: files } = await supabase.storage.from('listing-images').list(userObj.id);
          if (files && files.length > 0) {
            await supabase.storage.from('listing-images').remove(files.map((f) => `${userObj.id}/${f.name}`));
          }
        } catch (e) {}
        await supabase.auth.admin.deleteUser(userObj.id);
        existingByEmail.delete(email);
        purgedCount++;
      }
    }
    console.log(`✓ Purged ${purgedCount} other account(s).`);
  }

  const generatedCredentials = [];
  const summaryTable = [];

  // 3. Process each account idempotently
  for (const acc of accountsSpec) {
    const existing = existingByEmail.get(acc.email);
    let userId;
    let statusAction;
    let passwordUsed = null;

    if (!existing) {
      // Create new user
      passwordUsed = acc.envPassword || generateSecurePassword(16);
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: passwordUsed,
        email_confirm: true,
        user_metadata: {
          display_name: acc.name,
          institution_id: inst.id,
        },
      });

      if (createError) throw createError;
      userId = createData.user.id;
      statusAction = 'Created';
      generatedCredentials.push({ email: acc.email, name: acc.name, password: passwordUsed });
    } else {
      userId = existing.id;
      // Update metadata to ensure display_name and institution are aligned
      const updatePayload = {
        user_metadata: {
          ...existing.user_metadata,
          display_name: acc.name,
          institution_id: inst.id,
        },
      };

      if (resetPasswords) {
        passwordUsed = acc.envPassword || generateSecurePassword(16);
        updatePayload.password = passwordUsed;
        statusAction = 'Updated (Password Reset)';
        generatedCredentials.push({ email: acc.email, name: acc.name, password: passwordUsed });
      } else {
        statusAction = 'Existing (Metadata Synced)';
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, updatePayload);
      if (updateError) throw updateError;

      // Ensure profile row display name is synchronized
      await supabase
        .from('profiles')
        .update({ display_name: acc.name, institution_id: inst.id })
        .eq('id', userId);
    }

    // If Admin, ensure admin_roles entry
    if (acc.isAdmin) {
      const { error: roleError } = await supabase
        .from('admin_roles')
        .upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id' });
      if (roleError) throw roleError;
    }

    summaryTable.push({
      'Display Name': acc.name,
      'Email': acc.email,
      'Role': acc.isAdmin ? 'Admin (admin_roles)' : 'Student',
      'Action': statusAction,
      'User ID': userId,
    });
  }

  // 4. Save generated credentials to scripts/.credentials.local (gitignored)
  if (generatedCredentials.length > 0) {
    const credsPath = path.join(__dirname, '.credentials.local');
    const credsContent = [
      '# BookLoop Generated Account Credentials',
      `# Generated at: ${new Date().toISOString()}`,
      '# This file is strictly local and gitignored.',
      '',
      ...generatedCredentials.map(
        (c) => `Email:    ${c.email}\nName:     ${c.name}\nPassword: ${c.password}\n`
      ),
    ].join('\n');

    fs.writeFileSync(credsPath, credsContent, 'utf8');

    console.log('\n' + '='.repeat(65));
    console.log('🔑 PASSWORDS GENERATED (Saved to scripts/.credentials.local):');
    console.log('='.repeat(65));
    generatedCredentials.forEach((c) => {
      console.log(`  • ${c.email} (${c.name}): ${c.password}`);
    });
    console.log('='.repeat(65));
  } else {
    console.log('\n(No new passwords generated. Use --reset-passwords to regenerate existing passwords.)');
  }

  // 5. Output Summary Table
  console.log('\n[3/3] Account Provisioning Results:');
  console.table(summaryTable);
  console.log('✓ All 3 base user accounts are active and ready.\n');
}

main().catch((err) => {
  console.error('\n❌ Fatal Provisioning Error:', err);
  process.exit(1);
});

