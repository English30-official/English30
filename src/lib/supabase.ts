import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

const hasValidSupabaseUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl);
const hasValidPublishableKey = Boolean(
  supabasePublishableKey
  && !supabasePublishableKey.includes('your-supabase')
  && supabasePublishableKey.length >= 30
);

export const isSupabaseConfigured = hasValidSupabaseUrl && hasValidPublishableKey;
export const isDevelopmentFallbackEnabled =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_FALLBACK === 'true';

if (!isSupabaseConfigured && !isDevelopmentFallbackEnabled) {
  throw new Error(
    'Missing required Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
  );
}

/**
 * Singleton Supabase Client for English30
 * Uses public/publishable credentials only (Safe for browser environment).
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Helper function to safely retrieve the initialized Supabase client
 * or throw a descriptive error if environment variables are missing.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase client is not initialized. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in Secrets / Environment.'
    );
  }
  return supabase;
}
