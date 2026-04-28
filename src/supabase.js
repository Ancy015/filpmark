import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vlrhuxureqrmodjgavgw.supabase.co';
const rawSupabaseAnonKey =
	import.meta.env.VITE_SUPABASE_ANON_KEY ||
	' eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZscmh1eHVyZXFybW9kamdhdmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMDI3MzUsImV4cCI6MjA5Mjc3ODczNX0.buGF3-BBFc1sEQtp7y4nT_BQj6fZcDUctV8VcP9Ln9k';

function normalizeSupabaseUrl(url) {
	return url.replace(/\/?rest\/v1\/?$/i, '').replace(/\/$/, '');
}

export const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl.trim());
export const supabaseAnonKey = rawSupabaseAnonKey.trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.info('Supabase client ready for', supabaseUrl);

