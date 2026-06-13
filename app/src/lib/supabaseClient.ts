import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Supabase] VITE_SUPABASE_URL veya VITE_SUPABASE_ANON_KEY tanımlı değil. Bulut senkronizasyonu devre dışı.'
  );
}

const isElectronApp =
  typeof window !== 'undefined' && window.electronAPI?.isElectron === true;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          flowType: 'pkce',
          detectSessionInUrl: !isElectronApp,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

