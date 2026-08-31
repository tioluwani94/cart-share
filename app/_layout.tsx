import { OfflineIndicator } from "@/components/layout";
import { api } from "@/convex/_generated/api";
import {
  AnalyticsProvider,
  useAnalytics,
  useAnalyticsSession,
} from "@/lib/AnalyticsContext";
import { getNotificationHandlingDecision } from "@/lib/notificationHandling";
import {
  clearLastRestockNotificationResponse,
  getLastRestockNotificationResponse,
  listenForNotificationResponses,
} from "@/lib/pushNotifications";
import type { RestockNotificationResponse } from "@/lib/notificationResponse";
import { SyncStatusProvider } from "@/lib/SyncStatusContext";
import { getAuthRedirect } from "@/lib/authRouting";
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
import { useEffect, useMemo, useRef, useState } from "react";
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
  const analytics = useAnalytics();
  const analyticsSession = useAnalyticsSession();
  const navigationState = useRootNavigationState();
  const handledNotificationIds = useRef(new Set<string>());
  const authScope = useRef({ isLoaded, isSignedIn, userId });
  authScope.current = { isLoaded, isSignedIn, userId };
  const [pendingNotification, setPendingNotification] = useState<
    (RestockNotificationResponse & { capturedUserId: string }) | null
  >(null);
  const [deferredNotification, setDeferredNotification] =
    useState<RestockNotificationResponse | null>(null);

  // Only query household when Convex auth is ready (not just Clerk)
  // This prevents querying before JWT is propagated to Convex
  const household = useQuery(
    api.households.getCurrentHousehold,
    isConvexAuthenticated ? {} : "skip",
  );
  const notificationPreference = useQuery(
    api.notifications.getPreferences,
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

  const authRedirect = getAuthRedirect({
    isNavigationReady: Boolean(navigationState?.key),
    isClerkLoaded: isLoaded,
    isSignedIn,
    isConvexAuthenticated,
    household,
    rootSegment,
  });

  useEffect(() => {
    let active = true;
    const handleResponse = (response: RestockNotificationResponse) => {
      if (!active || handledNotificationIds.current.has(response.identifier)) {
        return;
      }
      const currentAuth = authScope.current;
      if (!currentAuth.isLoaded) {
        setDeferredNotification(response);
        return;
      }
      handledNotificationIds.current.add(response.identifier);
      if (!currentAuth.isSignedIn || !currentAuth.userId) {
        void clearLastRestockNotificationResponse().catch((error) => {
          console.error("Couldn't clear the signed-out notification:", error);
        });
        return;
      }
      setPendingNotification({
        ...response,
        capturedUserId: currentAuth.userId,
      });
    };
    const subscription = listenForNotificationResponses(handleResponse);
    void getLastRestockNotificationResponse()
      .then((response) => {
        if (response) handleResponse(response);
      })
      .catch((error) => {
        console.error("Couldn't read the last notification response:", error);
      });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !deferredNotification) return;
    if (handledNotificationIds.current.has(deferredNotification.identifier)) {
      setDeferredNotification(null);
      return;
    }
    handledNotificationIds.current.add(deferredNotification.identifier);
    if (isSignedIn && userId) {
      setPendingNotification({
        ...deferredNotification,
        capturedUserId: userId,
      });
    } else {
      void clearLastRestockNotificationResponse().catch((error) => {
        console.error("Couldn't clear the signed-out notification:", error);
      });
    }
    setDeferredNotification(null);
  }, [deferredNotification, isLoaded, isSignedIn, userId]);

  useEffect(() => {
    if (!pendingNotification) return;
    const decision = getNotificationHandlingDecision({
      analyticsConsent: notificationPreference?.analyticsConsent,
      analyticsReadyConsent: analyticsSession?.consent ?? null,
      analyticsReadyUserId: analyticsSession?.userId ?? null,
      authRedirect,
      capturedUserId: pendingNotification.capturedUserId,
      currentUserId: userId ?? null,
      hasResolvedHousehold: household !== undefined,
      hasResolvedPreference: notificationPreference !== undefined,
      householdSetupCompleted: Boolean(household?.restockSetupCompletedAt),
      isClerkLoaded: isLoaded,
      isConvexAuthenticated,
      isNavigationReady: Boolean(navigationState?.key),
      isSignedIn,
      preferenceViewerId: notificationPreference?.viewerClerkId,
    });
    if (decision === "wait") return;
    if (
      decision === "handle" &&
      notificationPreference?.analyticsConsent === "granted"
    ) {
      analytics.track("notification opened", {
        household_id: household?._id,
        kind: pendingNotification.kind,
      });
    }
    if (decision === "handle") {
      router.push("/restock-review?source=notification" as Href);
    }
    setPendingNotification(null);
    void clearLastRestockNotificationResponse().catch((error) => {
      console.error("Couldn't clear the handled notification:", error);
    });
  }, [
    analytics,
    analyticsSession?.consent,
    analyticsSession?.userId,
    authRedirect,
    household,
    isConvexAuthenticated,
    isLoaded,
    isSignedIn,
    navigationState?.key,
    notificationPreference,
    pendingNotification,
    router,
    userId,
  ]);

  useEffect(() => {
    if (authRedirect) {
      router.replace(authRedirect as Href);
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
    authRedirect,
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
