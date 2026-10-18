import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginCredentials, ShopLoginResponse } from '@/types/auth';
import { authApi } from '@/services/api/authApi';
import { SecureTokenStorage } from '@/utils/storage';
import { CacheManager } from '@/services/offline/cacheManager';

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHED_USER_KEY = '@delivshop_auth_user';
const CACHED_SHOP_KEY = '@delivshop_auth_shop';

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
          // Pre-populate with cached session if available for fast offline startup
          try {
            const cachedUserRaw = await AsyncStorage.getItem(CACHED_USER_KEY);
            const cachedShopRaw = await AsyncStorage.getItem(CACHED_SHOP_KEY);
            if (cachedUserRaw) {
              setUser(JSON.parse(cachedUserRaw));
            }
            if (cachedShopRaw) {
              setShop(JSON.parse(cachedShopRaw));
            }
          } catch {
            // Non-fatal cache read failure
          }

          // Fetch fresh profile from backend
          try {
            const profile = await authApi.getProfile();
            setUser(profile);
            await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(profile));

            if (profile.role === 'SHOP') {
              try {
                const shopProfile = await authApi.getShopProfile();
                setShop(shopProfile);
                await AsyncStorage.setItem(CACHED_SHOP_KEY, JSON.stringify(shopProfile));
              } catch {
                // Graceful fallback for shop profile
              }
            }
          } catch (apiErr: any) {
            // Only clear credentials if backend explicitly rejects the token (HTTP 401 or 403)
            if (apiErr?.status === 401 || apiErr?.status === 403) {
              await SecureTokenStorage.clearTokens();
              await AsyncStorage.removeItem(CACHED_USER_KEY);
              await AsyncStorage.removeItem(CACHED_SHOP_KEY);
              setUser(null);
              setShop(null);
            } else {
              // Network error, offline, or timeout: retain local session so user is not locked out
              console.warn('[AuthContext] Profile refresh skipped due to network/offline status. Preserving cached session.');
            }
          }
        }
      } catch {
        // Unexpected storage error
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
      await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(authRes.user));
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
        await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(res.user));
        if (res.shop) {
          await AsyncStorage.setItem(CACHED_SHOP_KEY, JSON.stringify(res.shop));
        }
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
        await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(res.user));
        if (res.shop) {
          await AsyncStorage.setItem(CACHED_SHOP_KEY, JSON.stringify(res.shop));
        }
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
      await AsyncStorage.removeItem(CACHED_USER_KEY);
      await AsyncStorage.removeItem(CACHED_SHOP_KEY);
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
