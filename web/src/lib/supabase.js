import { createClient } from '@supabase/supabase-js';
import { createMockClient } from './mockClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder-url') &&
  !supabaseAnonKey.includes('placeholder-anon-key')
);

// If Supabase keys are provided, connect to live Supabase;
// Otherwise, seamlessly activate Demo Mode with Indian textbooks, Kushagra & Bhagyesh accounts!
export const isDemoMode = !isConfigured;

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient();
