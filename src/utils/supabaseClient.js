import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://byxxbkhjdfqsbocebkgj.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5eHhia2hqZGZxc2JvY2Via2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjMzNzIsImV4cCI6MjA5NTY5OTM3Mn0.jdJcvq3RAgWslLPb78XKx78tdksjknEbId-lmxb2mb4';

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
