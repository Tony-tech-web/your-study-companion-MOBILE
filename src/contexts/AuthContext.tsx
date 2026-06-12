import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { clearStoredAuthSession, isInvalidRefreshToken, setRealtimeAuthFromSession, supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setRealtimeAuthFromSession(session);
        setSession(session);
        setUser(session?.user ?? null);
      })
      .catch(async (error) => {
        if (isInvalidRefreshToken(error)) {
          await clearStoredAuthSession();
        } else {
          console.error('Session restore failed:', error);
        }
        setSession(null);
        setUser(null);
      })
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setRealtimeAuthFromSession(session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut().catch(async (error) => {
      if (!isInvalidRefreshToken(error)) throw error;
    });
    await clearStoredAuthSession();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
