import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginCredentials, ShopLoginResponse } from '@/types/auth';
import { authApi } from '@/services/api/authApi';
import { SecureTokenStorage } from '@/utils/storage';
import { CacheManager } from '@/services/offline/cacheManager';

interface AuthContextType {
  user: User | null;
  shop: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  shopLogin: (credentials: { shopId: string; password: string }) => Promise<ShopLoginResponse>;
  completeSetup: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  shop: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  shopLogin: async () => ({ mustChangePassword: false }),
  completeSetup: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [shop, setShop] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const token = await SecureTokenStorage.getAccessToken();
        if (token) {
          const profile = await authApi.getProfile();
          setUser(profile);
          if (profile.role === 'SHOP') {
            try {
              const shopProfile = await authApi.getShopProfile();
              setShop(shopProfile);
            } catch {
              // Graceful fallback
            }
          }
        }
      } catch {
        await SecureTokenStorage.clearTokens();
        setUser(null);
        setShop(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const authRes = await authApi.login(credentials);
      setUser(authRes.user);
    } finally {
      setIsLoading(false);
    }
  };

  const shopLogin = async (credentials: { shopId: string; password: string }): Promise<ShopLoginResponse> => {
    setIsLoading(true);
    try {
      const res = await authApi.shopLogin(credentials);
      if (!res.mustChangePassword && res.user) {
        setUser(res.user);
        setShop(res.shop || null);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const completeSetup = async (newPassword: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.completeSetup(newPassword);
      if (res.user) {
        setUser(res.user);
        setShop(res.shop || null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (shop?.id) {
        await CacheManager.clearShopCache(shop.id);
      }
      await authApi.logout();
    } finally {
      await SecureTokenStorage.clearTokens();
      setUser(null);
      setShop(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        shop,
        isLoading,
        isAuthenticated: !!user,
        login,
        shopLogin,
        completeSetup,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
