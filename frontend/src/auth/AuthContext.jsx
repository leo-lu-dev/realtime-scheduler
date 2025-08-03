import { createContext, useContext, useState, useEffect } from 'react';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) setAccessToken(token);
    setIsAuthLoaded(true);
  }, []);

  const login = (access, refresh) => {
    localStorage.setItem(ACCESS_TOKEN, access);
    localStorage.setItem(REFRESH_TOKEN, refresh);
    setAccessToken(access);
  };

  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    setAccessToken(null);
  };

  const isLoggedIn = !!accessToken;

  return (
    <AuthContext.Provider value={{ accessToken, isLoggedIn, isAuthLoaded, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
