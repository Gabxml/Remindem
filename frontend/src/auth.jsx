import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    if (!getToken()) return;
    api.get('/auth/me')
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [signOut]);

  const authenticate = useCallback(async (mode, fields) => {
    const data = await api.post(`/auth/${mode}`, fields);
    setToken(data.access_token);
    setUser(data.user);
  }, []);

  const value = useMemo(() => ({ user, loading, authenticate, signOut }), [user, loading, authenticate, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
