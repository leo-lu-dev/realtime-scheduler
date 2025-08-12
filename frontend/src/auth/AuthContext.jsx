import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      setAccessToken(token);
      fetchUser(token);
    } else {
      setIsAuthLoaded(true);
    }
  }, []);

  const fetchUser = async (token) => {
    try {
      const res = await api.get('/api/user/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUser(res.data);
    } catch (err) {
      console.error('Failed to load user:', err);
      setUser(null);
    } finally {
      setIsAuthLoaded(true);
    }
  };

  const login = (access, refresh) => {
    localStorage.setItem(ACCESS_TOKEN, access);
    localStorage.setItem(REFRESH_TOKEN, refresh);
    setAccessToken(access);
    fetchUser(access);
  };

  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    setAccessToken(null);
    setUser(null);
  };

  const isLoggedIn = !!accessToken;

  return (
    <AuthContext.Provider value={{ accessToken, user, isLoggedIn, isAuthLoaded, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
