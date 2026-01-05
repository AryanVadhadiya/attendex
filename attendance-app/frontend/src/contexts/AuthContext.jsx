import { createContext, useState, useEffect, useContext } from 'react';
import { useSWRConfig } from 'swr';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const { cache, mutate } = useSWRConfig();

  const clearClientCache = () => {
    try {
      const preservedTheme = localStorage.getItem('theme');
      localStorage.clear();
      if (preservedTheme) {
        localStorage.setItem('theme', preservedTheme);
      }
      sessionStorage.clear();
    } catch (_) {}

    try {
      cache?.clear?.();
      mutate(() => true, undefined, { revalidate: false });
    } catch (err) {
      console.warn('Failed to clear SWR cache on logout', err);
    }
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        // Verify token and hydrate user from backend
        const res = await api.get('/user/profile');
        setToken(storedToken);
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      } catch (err) {
        // Token invalid/expired or network error – clear auth state
        clearClientCache();
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, [token]);

  const login = (userData, accessToken, refreshToken) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  };

  const logout = () => {
    clearClientCache();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
        {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
