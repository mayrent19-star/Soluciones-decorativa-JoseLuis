import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'owner' | 'employee' | null;

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: AppRole;
  loading: boolean;
  isOwner: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  session: null,
  role: null,
  loading: true,
  isOwner: false,
  signOut: async () => {},
});

// Usa la función RPC que ya tienes en Supabase en vez de query directa
// Esto respeta RLS y es más seguro
const fetchRole = async (uid: string): Promise<AppRole> => {
  try {
    const { data, error } = await supabase.rpc('get_user_role', { _user_id: uid });
    if (error || !data) return null;
    return data as AppRole;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole]       = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  const handleSession = useCallback(async (sess: Session | null) => {
    setSession(sess);
    setUser(sess?.user ?? null);

    if (sess?.user) {
      const r = await fetchRole(sess.user.id);
      setRole(r);
    } else {
      setRole(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1. Cargar sesión inicial
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      if (mounted) handleSession(sess);
    });

    // 2. Escuchar cambios de sesión (refresh, logout, expiración)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (mounted) handleSession(sess);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleSession]);

  const signOut = async () => {
    await supabase.auth.signOut();
    // El onAuthStateChange se encarga de limpiar el estado
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        isOwner: role === 'owner',
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);