import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

/**
 * Holds the signed-in user.
 *
 * The tokens themselves are httpOnly cookies we never see from JavaScript —
 * this context only mirrors *who* the server says we are, refreshed from
 * /auth/me on mount so a reload does not log you out.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .get('/auth/me')
      .then(({ data }) => alive && setUser(data.user))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(async (payload) => {
    const { data } = await api.post('/auth/login', payload);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  /** Merges a partial user update returned by another endpoint. */
  const patchUser = useCallback((partial) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const value = useMemo(
    () => ({ user, loading, register, login, logout, patchUser, isAuthed: Boolean(user) }),
    [user, loading, register, login, logout, patchUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
