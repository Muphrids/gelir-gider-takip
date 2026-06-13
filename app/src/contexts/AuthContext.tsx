import { createContext, useContext, type ReactNode } from 'react';
import { useSupabaseAuth, type SupabaseUser, type AuthStatus } from '@/hooks/useSupabaseAuth';

interface AuthContextValue {
  user: SupabaseUser | null;
  status: AuthStatus;
  error: string | null;
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useSupabaseAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth yalnızca AuthProvider içinde kullanılabilir.');
  }
  return context;
}
