import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Faltan variables de entorno: VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
});

// Detecta cuando la sesión expira para evitar que la app se quede "muerta"
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    const tokenKey = Object.keys(localStorage).find(k => k.includes('auth-token'));
    if (tokenKey) localStorage.removeItem(tokenKey);
  }
  if (event === 'TOKEN_REFRESHED') {
    console.debug('[Auth] Token refrescado correctamente');
  }
});