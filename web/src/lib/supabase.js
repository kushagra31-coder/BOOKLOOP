import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Warning: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. ' +
    'Please set them in web/.env.local (refer to web/.env.example).'
  );
}

export const isConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder-url') &&
  !supabaseAnonKey.includes('placeholder-anon-key')
);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

