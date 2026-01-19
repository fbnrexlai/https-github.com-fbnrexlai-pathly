
import { createClient } from '@supabase/supabase-js';

// Safely access process.env
const env = typeof process !== 'undefined' ? process.env : {};

// The Supabase client throws an error if initialized with empty strings.
// We provide placeholder values that match the expected format to prevent the app from crashing on load.
const supabaseUrl = env.SUPABASE_URL || 'https://zdhwsbmgamcifbtqfmde.supabase.co';
const supabaseAnonKey = env.SUPABASE_ANON_KEY || 'sb_publishable_mIb26Tj_opTrHfAPF4uCvg_1pAOBbZw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Utility to check if the Supabase client has been properly configured with real credentials.
 * It now checks the actual variables used, not just the environment variables.
 */
export const isSupabaseConfigured = () => {
  const defaultPlaceholder = 'placeholder-project.supabase.co';
  // Check if the URL exists and is not the default placeholder
  return !!supabaseUrl && 
         !supabaseUrl.includes(defaultPlaceholder) && 
         !!supabaseAnonKey && 
         supabaseAnonKey.length > 20;
};
