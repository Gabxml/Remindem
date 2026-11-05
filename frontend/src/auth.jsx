import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api';
import { AUTH_DISABLED, DEV_ACCOUNT } from './dev';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

let devSessionPromise = null;

function startDevSession() {
  if (!devSessionPromise) {
    devSessionPromise = (async () => {
      try {
        const data = await api.post('/auth/login', {
          email: DEV_ACCOUNT.email,
          password: DEV_ACCOUNT.password,
        });
        setToken(data.access_token);
        return data.user;
      } catch {
        // First run, or the local dev database was reset: create the demo user.
        const data = await api.post('/auth/register', DEV_ACCOUNT);
        setToken(data.access_token);
        return data.user;
      }
    })().catch((err) => {
      devSessionPromise = null;
      throw err;
    });
  }
  return devSessionPromise;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    devSessionPromise = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setUnauthorizedHandler(signOut);

    async function boot() {
      if (AUTH_DISABLED) {
        try {
          const devUser = await startDevSession();
          if (!cancelled) setUser(devUser);
        } catch {
          if (!cancelled) setToken(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      if (!getToken()) {
        setLoading(false);
        return;
      }
      api.get('/auth/me')
        .then((me) => !cancelled && setUser(me))
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false));
    }

    boot();
    return () => { cancelled = true; };
  }, [signOut]);

  const authenticate = useCallback(async (mode, fields) => {
    const data = await api.post(`/auth/${mode}`, fields);
    setToken(data.access_token);
    setUser(data.user);
  }, []);

  const value = useMemo(() => ({ user, loading, authenticate, signOut }), [user, loading, authenticate, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
