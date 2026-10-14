import { Platform } from 'react-native';

const TOKEN_KEY = 'delivshop_auth_token';
const REFRESH_TOKEN_KEY = 'delivshop_refresh_token';

// In-memory fallback for secure storage across platforms
const memoryStore = new Map<string, string>();

/**
 * Storage adapter designed for secure client-side token persistence.
 * Ready for expo-secure-store in native builds.
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
      return memoryStore.get(TOKEN_KEY) ?? null;
    } catch {
      return null;
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
      }
      memoryStore.set(TOKEN_KEY, accessToken);
      if (refreshToken) {
        memoryStore.set(REFRESH_TOKEN_KEY, refreshToken);
      }
    } catch {
      // Storage error gracefully handled
    }
  },

  async clearTokens(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem(TOKEN_KEY);
          window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      }
      memoryStore.delete(TOKEN_KEY);
      memoryStore.delete(REFRESH_TOKEN_KEY);
    } catch {
      // Graceful clear
    }
  },
};
