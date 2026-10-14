import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'delivshop_auth_token';
const REFRESH_TOKEN_KEY = 'delivshop_refresh_token';

// In-memory fallback
const memoryStore = new Map<string, string>();

/**
 * Enterprise Secure Storage Adapter.
 * Encrypts and persists authentication tokens in hardware-backed platform storage
 * (Android KeyStore / iOS Keychain) on native devices with graceful web/memory fallback.
 */
export const SecureTokenStorage = {
  async getAccessToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          return window.sessionStorage.getItem(TOKEN_KEY);
        }
        return memoryStore.get(TOKEN_KEY) ?? null;
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return memoryStore.get(TOKEN_KEY) ?? null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          return window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
        }
        return memoryStore.get(REFRESH_TOKEN_KEY) ?? null;
      }
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return memoryStore.get(REFRESH_TOKEN_KEY) ?? null;
    }
  },

  async setTokens(accessToken: string, refreshToken?: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(TOKEN_KEY, accessToken);
          if (refreshToken) {
            window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
          }
        }
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, accessToken, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
        if (refreshToken) {
          await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken, {
            keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          });
        }
      }
      memoryStore.set(TOKEN_KEY, accessToken);
      if (refreshToken) {
        memoryStore.set(REFRESH_TOKEN_KEY, refreshToken);
      }
    } catch {
      memoryStore.set(TOKEN_KEY, accessToken);
      if (refreshToken) memoryStore.set(REFRESH_TOKEN_KEY, refreshToken);
    }
  },

  async clearTokens(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem(TOKEN_KEY);
          window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
      memoryStore.delete(TOKEN_KEY);
      memoryStore.delete(REFRESH_TOKEN_KEY);
    } catch {
      memoryStore.delete(TOKEN_KEY);
      memoryStore.delete(REFRESH_TOKEN_KEY);
    }
  },
};
