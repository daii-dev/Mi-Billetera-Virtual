import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error('Falta EXPO_PUBLIC_SUPABASE_URL en el archivo .env');
}

if (!supabaseKey) {
  throw new Error('Falta EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY en el archivo .env');
}

export function createSupabaseClient(getToken: () => Promise<string | null>) {
  return createClient(supabaseUrl, supabaseKey, {
    accessToken: async () => {
      return await getToken();
    },
  });
}