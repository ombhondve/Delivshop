import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DriverCacheEntry<T> {
  data: T;
  timestamp: number;
  driverId: string;
}

const DRIVER_CACHE_PREFIX = '@delivshop_driver_cache_';

export const DriverCacheManager = {
  getScopedKey(driverId: string, key: string): string {
    return `${DRIVER_CACHE_PREFIX}${driverId}_${key}`;
  },

  async save<T>(driverId: string, key: string, data: T): Promise<void> {
    try {
      const entry: DriverCacheEntry<T> = {
        data,
        timestamp: Date.now(),
        driverId,
      };
      await AsyncStorage.setItem(this.getScopedKey(driverId, key), JSON.stringify(entry));
    } catch {
      // Storage error non-fatal
    }
  },

  async load<T>(
    driverId: string,
    key: string,
    maxAgeMinutes = 60
  ): Promise<{ data: T | null; isStale: boolean; isFromCache: boolean }> {
    try {
      const raw = await AsyncStorage.getItem(this.getScopedKey(driverId, key));
      if (!raw) {
        return { data: null, isStale: false, isFromCache: false };
      }

      const entry: DriverCacheEntry<T> = JSON.parse(raw);
      if (entry.driverId !== driverId) {
        return { data: null, isStale: false, isFromCache: false };
      }

      const isStale = Date.now() - entry.timestamp > maxAgeMinutes * 60 * 1000;
      return {
        data: entry.data,
        isStale,
        isFromCache: true,
      };
    } catch {
      return { data: null, isStale: false, isFromCache: false };
    }
  },

  async clearDriverCache(driverId: string): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const prefix = `${DRIVER_CACHE_PREFIX}${driverId}_`;
      const keysToDelete = allKeys.filter((k) => k.startsWith(prefix));
      if (keysToDelete.length > 0) {
        await AsyncStorage.multiRemove(keysToDelete);
      }
    } catch {
      // Graceful clear
    }
  },

  async cacheItem<T>(key: string, data: T): Promise<void> {
    try {
      await AsyncStorage.setItem(`${DRIVER_CACHE_PREFIX}item_${key}`, JSON.stringify(data));
    } catch {}
  },

  async getCachedItem<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(`${DRIVER_CACHE_PREFIX}item_${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
};
