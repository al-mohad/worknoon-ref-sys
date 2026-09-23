import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAuthToken } from './api.ts';
import type { CustomerProfile } from './types.ts';

type Role = 'customer' | 'agent';

interface StoredSession {
  token: string;
  role: Role;
  name: string;
  email: string;
}

interface AuthState {
  session: StoredSession | null;
  signInCustomer: (email: string) => Promise<void>;
  signInAgent: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const STORAGE_KEY = 'refund-desk-session';
const AuthContext = createContext<AuthState | null>(null);

function readStoredSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => readStoredSession());

  useEffect(() => {
    setAuthToken(session?.token ?? null);
  }, [session]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      async signInCustomer(email: string) {
        const res = await api.post<{ accessToken: string; customer: CustomerProfile }>(
          '/auth/customer-sessions',
          { email },
        );
        const next: StoredSession = {
          token: res.accessToken,
          role: 'customer',
          name: res.customer.name,
          email: res.customer.email,
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setSession(next);
      },
      async signInAgent(email: string, password: string) {
        const res = await api.post<{ accessToken: string; agent: { name: string; email: string } }>(
          '/auth/agent-sessions',
          { email, password },
        );
        const next: StoredSession = {
          token: res.accessToken,
          role: 'agent',
          name: res.agent.name,
          email: res.agent.email,
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setSession(next);
      },
      signOut() {
        sessionStorage.removeItem(STORAGE_KEY);
        setSession(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
