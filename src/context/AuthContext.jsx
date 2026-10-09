import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getToken,
  setToken as saveToken,
  clearToken as removeToken,
  getMe,
  loginAdmin,
} from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => getToken());
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Validate session on initial load if token exists
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const activeToken = getToken();
      if (!activeToken) {
        if (isMounted) {
          setUser(null);
          setTokenState(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await getMe();
        if (isMounted && response?.data) {
          const userObj = response.data.user || response.data;
          setUser(userObj);
          setTokenState(activeToken);
        }
      } catch (err) {
        // Token invalid, expired, or server rejected session
        removeToken();
        if (isMounted) {
          setUser(null);
          setTokenState(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

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
      return { success: true, user: userData };
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    setTokenState(null);
    setAuthError(null);
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
