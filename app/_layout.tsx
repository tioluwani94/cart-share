import "../global.css";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";

// Initialize Convex client with the deployment URL
const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string,
  {
    unsavedChangesWarning: false,
  }
);

/**
 * Token cache using SecureStore for persisting auth state across app restarts.
 * SecureStore provides secure, encrypted storage on iOS (Keychain) and Android (Keystore).
 */
const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      const item = await SecureStore.getItemAsync(key);
      return item;
    } catch (error) {
      console.error("SecureStore get error:", error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error("SecureStore save error:", error);
    }
  },
};

// Clerk publishable key from environment variables
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Please set it in your .env file."
  );
}

/**
 * Inner layout wrapped with Convex provider that uses Clerk authentication.
 * This component must be inside ClerkProvider to access useAuth.
 */
function ConvexClerkLayout() {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </ConvexProviderWithClerk>
  );
}

/**
 * Root layout component that sets up authentication and data providers.
 *
 * Provider hierarchy:
 * 1. ClerkProvider - Handles authentication with Clerk
 * 2. ConvexProviderWithClerk - Connects Convex to Clerk auth
 * 3. Stack - Expo Router navigation
 */
export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>
          <ConvexClerkLayout />
        </ClerkLoaded>
      </ClerkProvider>
    </>
  );
}
