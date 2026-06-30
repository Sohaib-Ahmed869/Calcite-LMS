import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { apiGet, apiPost, getToken, setToken } from '../lib/api';

/**
 * Auth state for the portal. On boot, if a token is stored we resolve the current user via
 * `GET /auth/me`; `login` posts credentials and persists the JWT; `logout` clears it.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiGet('/course-auth/me')
      .then((res) => alive && setUser(res.user))
      .catch(() => {
        // Token invalid/expired — drop it so the user is sent to login.
        setToken(null);
        if (alive) setUser(null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await apiPost('/course-auth/login', { email, password }, { auth: false });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  /** Re-fetch the current user (e.g. after a profile/avatar update) and refresh state. */
  const reload = useCallback(async () => {
    if (!getToken()) return null;
    try {
      const res = await apiGet('/course-auth/me');
      setUser(res.user);
      return res.user;
    } catch {
      return null;
    }
  }, []);

  /**
   * Publish an already-fetched user into auth state — e.g. the object a profile/avatar update
   * returns — so chrome (sidebar/topbar) refreshes WITHOUT a redundant `GET /me` round-trip.
   */
  const applyUser = useCallback((next) => {
    if (next) setUser(next);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout, reload, applyUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

/** Route guard — renders the nested routes only when authenticated, else redirects to /login. */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export default AuthProvider;
