import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, login as loginRequest, register as registerRequest } from '../api/authService';

const AuthContext = createContext(null);
const TOKEN_KEY = 'govflow_token';
const USER_KEY = 'govflow_user';

const clearStoredAuth = () => {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
};

const readStoredUser = () => {
  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) return null;

  try {
    const parsed = JSON.parse(rawUser);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    clearStoredAuth();
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistAuth = (userData, authToken) => {
    const normalizedUser = {
      ...userData,
      _id: userData?._id || userData?.id,
      id: userData?.id || userData?._id,
    };

    setUser(normalizedUser);
    setToken(authToken);
    localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    localStorage.setItem(TOKEN_KEY, authToken);
    return normalizedUser;
  };

  const logout = (redirect = true) => {
    setUser(null);
    setToken(null);
    clearStoredAuth();

    if (redirect && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  };

  const login = async (credentials) => {
    const response = await loginRequest(credentials);
    const authUser = response.data.data.user;
    const authToken = response.data.data.token;

    return persistAuth(authUser, authToken);
  };

  const register = async (payload) => {
    const response = await registerRequest({ ...payload, role: 'citizen' });
    const authUser = response.data.data.user;
    const authToken = response.data.data.token;

    persistAuth(authUser, authToken);
    return response;
  };

  useEffect(() => {
    const restoreSession = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);

      if (!savedToken) {
        setUser(null);
        setToken(null);
        clearStoredAuth();
        setLoading(false);
        return;
      }

      try {
        const response = await getCurrentUser();
        const currentUser = {
          ...response.data.data.user,
          _id: response.data.data.user?._id || response.data.data.user?.id,
          id: response.data.data.user?.id || response.data.data.user?._id,
        };
        setUser(currentUser);
        setToken(savedToken);
      } catch {
        setUser(null);
        setToken(null);
        clearStoredAuth();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      isAuthenticated: Boolean(user && token),
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
