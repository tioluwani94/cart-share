import { OfflineIndicator } from "@/components/layout";
import { api } from "@/convex/_generated/api";
import { SyncStatusProvider } from "@/lib/SyncStatusContext";
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexReactClient, useConvexAuth, useQuery } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import {
  Slot,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Initialize Convex client with the deployment URL
const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string,
  {
    unsavedChangesWarning: false,
  },
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
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Please set it in your .env file.",
  );
}

// Routes that don't require a household to access
const HOUSEHOLD_EXEMPT_ROUTES = ["household-setup", "join-household"];

/**
 * Initial layout component that handles auth-based route protection.
 * Redirects users based on authentication and household state:
 * - Unauthenticated users to /(auth)/welcome
 * - Authenticated users without a household to /household-setup
 * - Authenticated users with a household to /(tabs)
 */
function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  // Only query household when Convex auth is ready (not just Clerk)
  // This prevents querying before JWT is propagated to Convex
  const household = useQuery(
    api.households.getCurrentHousehold,
    isConvexAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    // Wait for navigation and auth to be ready
    if (!navigationState?.key || !isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inHouseholdExemptRoute = HOUSEHOLD_EXEMPT_ROUTES.includes(
      segments[0] as string,
    );

    if (!isSignedIn) {
      if (!inAuthGroup) {
        router.replace("/(auth)/welcome");
      }
      SplashScreen.hideAsync();
      return;
    }

    if (inAuthGroup) {
      if (household) {
        router.replace("/(tabs)");
      } else {
        router.replace("/household-setup");
      }
      SplashScreen.hideAsync();
      return;
    }

    if (household === null && !inHouseholdExemptRoute) {
      router.replace("/household-setup");
      SplashScreen.hideAsync();
      return;
    }

    SplashScreen.hideAsync();
  }, [isLoaded, isSignedIn, segments, navigationState?.key, household, router]);

  return (
    <View style={{ flex: 1 }}>
      <OfflineIndicator />
      <Slot />
    </View>
  );
}

/**
 * Inner layout wrapped with Convex provider that uses Clerk authentication.
 * This component must be inside ClerkProvider to access useAuth.
 */
function ConvexClerkLayout() {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <SyncStatusProvider>
        <InitialLayout />
      </SyncStatusProvider>
    </ConvexProviderWithClerk>
  );
}

/**
 * Root layout component that sets up authentication and data providers.
 *
 * Provider hierarchy:
 * 1. ClerkProvider - Handles authentication with Clerk
 * 2. ConvexProviderWithClerk - Connects Convex to Clerk auth
 * 3. InitialLayout - Handles auth-based routing and splash screen
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>
          <ConvexClerkLayout />
        </ClerkLoaded>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
