import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://byxxbkhjdfqsbocebkgj.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5eHhia2hqZGZxc2JvY2Via2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjMzNzIsImV4cCI6MjA5NTY5OTM3Mn0.jdJcvq3RAgWslLPb78XKx78tdksjknEbId-lmxb2mb4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
