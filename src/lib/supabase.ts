import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client side or standard authenticated client with safe fallbacks
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co', 
  supabaseAnonKey || 'placeholder-anon-key', 
  {
    auth: {
      persistSession: typeof window !== 'undefined', // Persist session in browser
    },
  }
);

// Admin client to bypass RLS (backend-only, secure API routes)
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co', 
  supabaseServiceKey || 'placeholder-service-key', 
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
