import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CacheEntry<T> {
  data: T;
  timestamp: number; // Unix timestamp in ms
  shopId: string;
}

export interface CachedResult<T> {
  data: T | null;
  lastSync: Date | null;
  isStale: boolean;
  isFromCache: boolean;
}

const CACHE_PREFIX = '@delivshop_cache_';

/**
 * Enterprise Low-Internet & Offline Cache Manager.
 * Stores authenticated shop data locally with explicit freshness metadata.
 * Ensures zero cross-account data leakage by strictly isolating cache keys per shop ID.
 */
export const CacheManager = {
  getScopedKey(shopId: string, key: string): string {
    return `${CACHE_PREFIX}${shopId}_${key}`;
  },

  async save<T>(shopId: string, key: string, data: T): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        shopId,
      };
      await AsyncStorage.setItem(this.getScopedKey(shopId, key), JSON.stringify(entry));
    } catch {
      // Storage failure non-fatal to active session
    }
  },

  async load<T>(
    shopId: string,
    key: string,
    maxAgeMinutes = 60
  ): Promise<CachedResult<T>> {
    try {
      const raw = await AsyncStorage.getItem(this.getScopedKey(shopId, key));
      if (!raw) {
        return { data: null, lastSync: null, isStale: false, isFromCache: false };
      }

      const entry: CacheEntry<T> = JSON.parse(raw);
      if (entry.shopId !== shopId) {
        // Defensive cross-shop isolation check
        return { data: null, lastSync: null, isStale: false, isFromCache: false };
      }

      const ageMs = Date.now() - entry.timestamp;
      const isStale = ageMs > maxAgeMinutes * 60 * 1000;

      return {
        data: entry.data,
        lastSync: new Date(entry.timestamp),
        isStale,
        isFromCache: true,
      };
    } catch {
      return { data: null, lastSync: null, isStale: false, isFromCache: false };
    }
  },

  async clearShopCache(shopId: string): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const shopPrefix = `${CACHE_PREFIX}${shopId}_`;
      const keysToDelete = allKeys.filter((k) => k.startsWith(shopPrefix));
      if (keysToDelete.length > 0) {
        await AsyncStorage.multiRemove(keysToDelete);
      }
    } catch {
      // Graceful clear
    }
  },
};
