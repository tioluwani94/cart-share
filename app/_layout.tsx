import { OfflineIndicator } from "@/components/layout";
import { api } from "@/convex/_generated/api";
import { SyncStatusProvider } from "@/lib/SyncStatusContext";
import { AnalyticsProvider } from "@/lib/AnalyticsContext";
import { getAuthRedirect } from "@/lib/authRouting";
import { listenForNotificationResponses } from "@/lib/pushNotifications";
import { useScopedOfflineQueue } from "@/lib/useScopedOfflineQueue";
import type { OfflineScope } from "@/lib/offlineQueue";
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ConvexReactClient, useConvexAuth, useQuery } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import {
  type Href,
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useReducedMotion } from "react-native-reanimated";
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

/**
 * Initial layout component that handles auth-based route protection.
 * Redirects users based on authentication and household state:
 * - Unauthenticated users to /(auth)/welcome
 * - Authenticated users without a household to /household-setup
 * - Authenticated users with a household to /(tabs)
 */
function InitialLayout() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const reduceMotion = useReducedMotion();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  // Only query household when Convex auth is ready (not just Clerk)
  // This prevents querying before JWT is propagated to Convex
  const household = useQuery(
    api.households.getCurrentHousehold,
    isConvexAuthenticated ? {} : "skip",
  );

  const rootSegment = segments[0] as string | undefined;
  const childSegment = segments[1] as string | undefined;
  const ownsForegroundQueue =
    rootSegment === "list" ||
    rootSegment === "restock-review" ||
    (rootSegment === "(tabs)" && childSegment === "shop");
  const backgroundSyncScope = useMemo<OfflineScope | null>(
    () =>
      isSignedIn && userId && household && !ownsForegroundQueue
        ? { clerkUserId: userId, householdId: household._id }
        : null,
    [household, isSignedIn, ownsForegroundQueue, userId],
  );
  // List screens own their live queue state; everywhere else this keeps
  // queued work replaying as soon as the connection is restored.
  useScopedOfflineQueue(backgroundSyncScope);

  useEffect(() => {
    const subscription = listenForNotificationResponses(() => {
      router.push("/restock-review?source=notification" as Href);
    });
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    const redirect = getAuthRedirect({
      isNavigationReady: Boolean(navigationState?.key),
      isClerkLoaded: isLoaded,
      isSignedIn,
      isConvexAuthenticated,
      household,
      rootSegment,
    });

    if (redirect) {
      router.replace(redirect as Href);
      SplashScreen.hideAsync();
      return;
    }

    const authStateResolved =
      isSignedIn === false ||
      (isSignedIn === true &&
        isConvexAuthenticated &&
        household !== undefined);

    if (navigationState?.key && isLoaded && authStateResolved) {
      SplashScreen.hideAsync();
    }
  }, [
    household,
    isConvexAuthenticated,
    isLoaded,
    isSignedIn,
    navigationState?.key,
    rootSegment,
    router,
  ]);

  return (
    <View style={{ flex: 1 }}>
      <OfflineIndicator />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: reduceMotion ? "fade" : "default",
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
      </Stack>
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
        <AnalyticsProvider>
          <InitialLayout />
        </AnalyticsProvider>
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
      <BottomSheetModalProvider>
        <StatusBar style="dark" />
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <ClerkLoaded>
            <ConvexClerkLayout />
          </ClerkLoaded>
        </ClerkProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
