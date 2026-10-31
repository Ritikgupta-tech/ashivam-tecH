import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getToken,
  setToken as saveToken,
  clearToken as removeToken,
  getMe,
  loginAdmin,
  refreshSession,
  logoutAdmin,
  broadcastAuthEvent,
} from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => getToken());
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const verifySession = useCallback(async () => {
    const activeToken = getToken();
    if (!activeToken) {
      // Attempt sliding session silent restore via HttpOnly refresh cookie
      try {
        const refreshRes = await refreshSession();
        if (refreshRes?.data?.accessToken) {
          const newToken = refreshRes.data.accessToken;
          const userData = refreshRes.data.user;
          saveToken(newToken);
          setTokenState(newToken);
          setUser(userData);
          setIsLoading(false);
          return;
        }
      } catch {
        // No active refresh session exists
      }

      setUser(null);
      setTokenState(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await getMe();
      if (response?.data) {
        const userObj = response.data.user || response.data;
        setUser(userObj);
        setTokenState(activeToken);
      }
    } catch {
      // Token invalid, expired, or server rejected session
      removeToken();
      setUser(null);
      setTokenState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial session verification
  useEffect(() => {
    verifySession();
  }, [verifySession]);

  // Cross-tab synchronization via BroadcastChannel (strictly zero tokens transmitted)
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('ashivam_auth_sync');

    channel.onmessage = (event) => {
      const { type } = event?.data || {};
      if (type === 'LOGOUT') {
        removeToken();
        setUser(null);
        setTokenState(null);
        setAuthError(null);
      } else if (type === 'LOGIN' || type === 'SESSION_REFRESHED') {
        // Synchronize authenticated state across tabs without transferring credentials
        verifySession();
      }
    };

    return () => {
      channel.close();
    };
  }, [verifySession]);

  const login = useCallback(async (username, password) => {
    setAuthError(null);
    try {
      const response = await loginAdmin({ username, password });
      const { accessToken, user: userData } = response?.data || {};

      if (!accessToken || !userData) {
        throw new Error('Authentication succeeded but session payload is missing');
      }

      saveToken(accessToken);
      setTokenState(accessToken);
      setUser(userData);
      broadcastAuthEvent({ type: 'LOGIN', timestamp: Date.now() });
      return { success: true, user: userData };
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    logoutAdmin().catch(() => {});
    removeToken();
    setUser(null);
    setTokenState(null);
    setAuthError(null);
    broadcastAuthEvent({ type: 'LOGOUT', timestamp: Date.now() });
  }, []);

  const hasPermission = useCallback(
    (permission) => {
      if (!user) return false;
      if (user.role === 'Superadmin') return true;
      return Array.isArray(user.permissions) && user.permissions.includes(permission);
    },
    [user]
  );

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    authError,
    login,
    logout,
    hasPermission,
    isSuperadmin: user?.role === 'Superadmin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
