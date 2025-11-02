import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, type LoginResponse } from '../api/client';

type AuthContextType = {
  user: LoginResponse['user'] | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LoginResponse['user'] | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (t) setToken(t);
    if (u) {
      try { setUser(JSON.parse(u)); } catch {}
    }
  }, []);

  const actions = useMemo(() => ({
    async login(email: string, password: string) {
      const res = await authApi.login(email, password);
      localStorage.setItem('token', res.accessToken);
      localStorage.setItem('user', JSON.stringify(res.user));
      setUser(res.user);
      setToken(res.accessToken);
    },
    async register(name: string, email: string, phone: string, password: string) {
      const res = await authApi.register(name, email, phone, password);
      localStorage.setItem('token', res.accessToken);
      localStorage.setItem('user', JSON.stringify(res.user));
      setUser(res.user);
      setToken(res.accessToken);
    },
    logout() {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
    }
  }), []);

  const value: AuthContextType = {
    user, token,
    login: actions.login,
    register: actions.register,
    logout: actions.logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
