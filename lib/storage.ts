import { createMMKV, type MMKV } from "react-native-mmkv";

/**
 * MMKV storage instance for CartShare app.
 * Used for fast local caching of lists and items for offline support.
 */
export const storage: MMKV = createMMKV({
  id: "cartshare-storage",
});

/**
 * Storage keys for the CartShare app.
 * Using a consistent naming convention for organization.
 */
export const StorageKeys = {
  // Lists cache
  LISTS_CACHE: "cache:lists",
  LISTS_CACHE_TIMESTAMP: "cache:lists:timestamp",

  // Items cache (per list)
  ITEMS_CACHE_PREFIX: "cache:items:",
  ITEMS_CACHE_TIMESTAMP_PREFIX: "cache:items:timestamp:",

  // Offline mutation queue
  OFFLINE_QUEUE: "offline:queue",

  // User preferences
  USER_PREFERENCES: "user:preferences",
} as const;

/**
 * Get the storage key for a specific list's items cache.
 */
export function getItemsCacheKey(listId: string): string {
  return `${StorageKeys.ITEMS_CACHE_PREFIX}${listId}`;
}

/**
 * Get the storage key for a specific list's items cache timestamp.
 */
export function getItemsCacheTimestampKey(listId: string): string {
  return `${StorageKeys.ITEMS_CACHE_TIMESTAMP_PREFIX}${listId}`;
}

/**
 * Set a value in MMKV storage with JSON serialization.
 * @param key - The storage key
 * @param value - The value to store (will be JSON serialized)
 */
export function setItem<T>(key: string, value: T): void {
  try {
    const jsonValue = JSON.stringify(value);
    storage.set(key, jsonValue);
  } catch (error) {
    console.error(`[Storage] Failed to set item for key "${key}":`, error);
  }
}

/**
 * Get a value from MMKV storage with JSON deserialization.
 * @param key - The storage key
 * @returns The parsed value or null if not found/error
 */
export function getItem<T>(key: string): T | null {
  try {
    const jsonValue = storage.getString(key);
    if (jsonValue === undefined) {
      return null;
    }
    return JSON.parse(jsonValue) as T;
  } catch (error) {
    console.error(`[Storage] Failed to get item for key "${key}":`, error);
    return null;
  }
}

/**
 * Remove a value from MMKV storage.
 * @param key - The storage key to remove
 */
export function removeItem(key: string): void {
  try {
    storage.remove(key);
  } catch (error) {
    console.error(`[Storage] Failed to remove item for key "${key}":`, error);
  }
}

/**
 * Check if a key exists in MMKV storage.
 * @param key - The storage key to check
 * @returns true if the key exists, false otherwise
 */
export function hasItem(key: string): boolean {
  return storage.contains(key);
}

/**
 * Clear all items from MMKV storage.
 * Use with caution - this removes all cached data.
 */
export function clearAll(): void {
  try {
    storage.clearAll();
  } catch (error) {
    console.error("[Storage] Failed to clear all items:", error);
  }
}

/**
 * Get all keys in MMKV storage.
 * @returns Array of all storage keys
 */
export function getAllKeys(): string[] {
  return storage.getAllKeys();
}

/**
 * Cache lists data with timestamp.
 * @param householdId - The household ID
 * @param lists - The lists data to cache
 */
export function cacheLists<T>(householdId: string, lists: T): void {
  const cacheKey = `${StorageKeys.LISTS_CACHE}:${householdId}`;
  const timestampKey = `${StorageKeys.LISTS_CACHE_TIMESTAMP}:${householdId}`;

  setItem(cacheKey, lists);
  setItem(timestampKey, Date.now());
}

/**
 * Get cached lists data if not expired.
 * @param householdId - The household ID
 * @param maxAgeMs - Maximum age of cache in milliseconds (default: 5 minutes)
 * @returns The cached lists or null if not found/expired
 */
export function getCachedLists<T>(
  householdId: string,
  maxAgeMs: number = 5 * 60 * 1000
): T | null {
  const cacheKey = `${StorageKeys.LISTS_CACHE}:${householdId}`;
  const timestampKey = `${StorageKeys.LISTS_CACHE_TIMESTAMP}:${householdId}`;

  const timestamp = getItem<number>(timestampKey);
  if (timestamp === null) {
    return null;
  }

  const age = Date.now() - timestamp;
  if (age > maxAgeMs) {
    // Cache expired, remove it
    removeItem(cacheKey);
    removeItem(timestampKey);
    return null;
  }

  return getItem<T>(cacheKey);
}

/**
 * Cache items data for a specific list with timestamp.
 * @param listId - The list ID
 * @param items - The items data to cache
 */
export function cacheItems<T>(listId: string, items: T): void {
  const cacheKey = getItemsCacheKey(listId);
  const timestampKey = getItemsCacheTimestampKey(listId);

  setItem(cacheKey, items);
  setItem(timestampKey, Date.now());
}

/**
 * Get cached items data for a specific list if not expired.
 * @param listId - The list ID
 * @param maxAgeMs - Maximum age of cache in milliseconds (default: 5 minutes)
 * @returns The cached items or null if not found/expired
 */
export function getCachedItems<T>(
  listId: string,
  maxAgeMs: number = 5 * 60 * 1000
): T | null {
  const cacheKey = getItemsCacheKey(listId);
  const timestampKey = getItemsCacheTimestampKey(listId);

  const timestamp = getItem<number>(timestampKey);
  if (timestamp === null) {
    return null;
  }

  const age = Date.now() - timestamp;
  if (age > maxAgeMs) {
    // Cache expired, remove it
    removeItem(cacheKey);
    removeItem(timestampKey);
    return null;
  }

  return getItem<T>(cacheKey);
}

/**
 * Invalidate (remove) cached lists for a household.
 * @param householdId - The household ID
 */
export function invalidateListsCache(householdId: string): void {
  const cacheKey = `${StorageKeys.LISTS_CACHE}:${householdId}`;
  const timestampKey = `${StorageKeys.LISTS_CACHE_TIMESTAMP}:${householdId}`;

  removeItem(cacheKey);
  removeItem(timestampKey);
}

/**
 * Invalidate (remove) cached items for a specific list.
 * @param listId - The list ID
 */
export function invalidateItemsCache(listId: string): void {
  const cacheKey = getItemsCacheKey(listId);
  const timestampKey = getItemsCacheTimestampKey(listId);

  removeItem(cacheKey);
  removeItem(timestampKey);
}
