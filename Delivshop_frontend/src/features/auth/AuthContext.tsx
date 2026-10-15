import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../../types';
import { api } from '../../services/api/endpoints';
import { tokenStore, onSessionExpired } from '../../services/api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  setAuthenticatedUser: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => { throw new Error('Not implemented'); },
  setAuthenticatedUser: () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const profile = await api.auth.getMe();
        setUser(profile);
      } catch {
        tokenStore.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  // Listen to session expiration events from the API client (e.g. expired refresh token or rejected 401)
  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      setUser(null);
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;

      if (!currentPath.startsWith('/login')) {
        const destination = currentPath + currentSearch;
        const safeDestination =
          destination.startsWith('/') && !destination.startsWith('//') && !destination.includes('://')
            ? destination
            : '/admin/dashboard';

        const loginUrl = `/login?redirect=${encodeURIComponent(safeDestination)}`;
        window.history.pushState(null, '', loginUrl);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    });

    return unsubscribe;
  }, []);

  const login = async (credentials: { email: string; password: string }): Promise<User> => {
    setLoading(true);
    try {
      const res = await api.auth.login(credentials);
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const setAuthenticatedUser = (authUser: User) => {
    setUser(authUser);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.auth.logout();
    } finally {
      tokenStore.clear();
      setUser(null);
      setLoading(false);
      window.history.pushState(null, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, setAuthenticatedUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
