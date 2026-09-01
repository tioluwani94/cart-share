import * as SecureStore from "expo-secure-store";

type ClerkTokenCache = {
  getToken: (key: string) => Promise<string | null | undefined>;
  saveToken: (key: string, value: string) => Promise<void>;
};

const CURRENT_CLERK_NATIVE_TOKEN_KEY = "__clerk_client_jwt";
const CLERK_TOKEN_KEY_INDEX = "ourpantry.clerk-token-cache-keys";

async function getTrackedTokenKeys(): Promise<string[]> {
  const encodedKeys = await SecureStore.getItemAsync(CLERK_TOKEN_KEY_INDEX);
  if (!encodedKeys) return [];
  try {
    const parsed = JSON.parse(encodedKeys) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((key): key is string => typeof key === "string")
      : [];
  } catch {
    return [];
  }
}

async function trackTokenKey(key: string): Promise<void> {
  const keys = await getTrackedTokenKeys();
  if (keys.includes(key)) return;
  await SecureStore.setItemAsync(
    CLERK_TOKEN_KEY_INDEX,
    JSON.stringify([...keys, key]),
  );
}

export const clerkTokenCache: ClerkTokenCache = {
  async getToken(key) {
    try {
      await trackTokenKey(key);
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error("SecureStore get error:", error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      await trackTokenKey(key);
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error("SecureStore save error:", error);
    }
  },
};

/** Remove every Clerk token key observed by this app, including the current key. */
export async function clearClerkTokenCache(): Promise<void> {
  const keys = new Set([
    CURRENT_CLERK_NATIVE_TOKEN_KEY,
    ...(await getTrackedTokenKeys()),
  ]);
  for (const key of keys) {
    await SecureStore.deleteItemAsync(key);
  }
  await SecureStore.deleteItemAsync(CLERK_TOKEN_KEY_INDEX);
}
