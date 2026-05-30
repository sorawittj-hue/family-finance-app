import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://byxxbkhjdfqsbocebkgj.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'eyJhbG...2mb4';

// Validate API key — a real Supabase anon key is a JWT > 100 chars
const isKeyValid = SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 100 && SUPABASE_ANON_KEY.startsWith('eyJ');
export const supabaseAvailable = isKeyValid;

if (!supabaseAvailable) {
  const hasEnvVars = env.VITE_SUPABASE_URL || env.VITE_SUPABASE_ANON_KEY;
  if (hasEnvVars) {
    console.warn(
      '[Supabase] Invalid configuration. The app will run in localStorage-only mode. ' +
      'Please check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
    );
  } else {
    // Normal local-only operation, log a quiet info message instead of a warning
    console.log('[Supabase] Running in local development mode (localStorage).');
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Always persist session in localStorage so PWA remembers login across restarts
    persistSession: true,
    // Auto-refresh the JWT token before it expires
    autoRefreshToken: true,
    // Don't try to parse session from URL hash (causes issues in PWA standalone mode)
    detectSessionInUrl: false,
    // Use localStorage explicitly (default, but explicit is safer for PWA)
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  realtime: {
    // Keep realtime connection alive in PWA background
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'x-client-info': 'money-nitro-pwa',
    },
  },
});
