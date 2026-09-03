import { KeyboardDismissBoundary, OfflineIndicator } from "@/components/layout";
import { ToastProvider } from "@/components/ui";
import { WELCOME_IMAGE_ASSETS } from "@/components/welcome/OurPantryWelcome";
import { api } from "@/convex/_generated/api";
import {
  AnalyticsProvider,
  useAnalytics,
  useAnalyticsSession,
} from "@/lib/AnalyticsContext";
import { AuthenticatedUserBoundary } from "@/lib/AuthenticatedUserBoundary";
import { AccountDeletionCleanupBoundary } from "@/lib/AccountDeletionCleanupBoundary";
import { clerkTokenCache } from "@/lib/clerkTokenCache";
import { getNotificationHandlingDecision } from "@/lib/notificationHandling";
import {
  clearLastRestockNotificationResponse,
  getLastRestockNotificationResponse,
  listenForNotificationResponses,
} from "@/lib/pushNotifications";
import {
  getNotificationDestination,
  type RestockNotificationResponse,
} from "@/lib/notificationResponse";
import { SyncStatusProvider } from "@/lib/SyncStatusContext";
import { getAuthRoutingDecision } from "@/lib/authRouting";
import { OfflineQueueProvider } from "@/lib/useScopedOfflineQueue";
import type { OfflineScope } from "@/lib/offlineQueue";
import { themeColors } from "@/lib/theme";
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/expo";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import {
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from "@expo-google-fonts/nunito";
import { ConvexReactClient, useConvexAuth, useQuery } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import {
  type Href,
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { Asset } from "expo-asset";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useReducedMotion } from "react-native-reanimated";
import "../global.css";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn("Could not keep the native splash visible:", error);
});

// Initialize Convex client with the deployment URL
const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string,
  {
    unsavedChangesWarning: false,
  },
);

// Clerk publishable key from environment variables
const publishableKey = (() => {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!key) {
    throw new Error(
      "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Please set it in your .env file.",
    );
  }

  return key;
})();

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
  const routeKey = segments.join("/");
  const offlineQueueScope = useMemo<OfflineScope | null>(
    () =>
      isSignedIn && userId && household
        ? { clerkUserId: userId, householdId: household._id }
        : null,
    [household, isSignedIn, userId],
  );

  const { redirect: authRedirect, canRenderCurrentRoute } =
    getAuthRoutingDecision({
      isNavigationReady: Boolean(navigationState?.key),
      isClerkLoaded: isLoaded,
      isSignedIn,
      isConvexAuthenticated,
      household,
      rootSegment,
    });

  useEffect(() => {
    Keyboard.dismiss();
  }, [routeKey]);

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
      router.push(getNotificationDestination(pendingNotification.kind) as Href);
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
      return;
    }

    if (canRenderCurrentRoute) {
      SplashScreen.hideAsync().catch((error) => {
        console.warn("Could not hide the native splash:", error);
      });
    }
  }, [authRedirect, canRenderCurrentRoute, router]);

  return (
    <OfflineQueueProvider scope={offlineQueueScope}>
      <KeyboardDismissBoundary>
        <ToastProvider>
          <View className="flex-1 bg-background-light">
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
            {!canRenderCurrentRoute ? (
              <View
                style={styles.authTransitionOverlay}
                accessibilityLabel="Preparing OurPantry"
              >
                <ActivityIndicator color={themeColors.coral} />
              </View>
            ) : null}
          </View>
        </ToastProvider>
      </KeyboardDismissBoundary>
    </OfflineQueueProvider>
  );
}

const styles = StyleSheet.create({
  authTransitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: themeColors.canvas,
    justifyContent: "center",
    zIndex: 10_000,
  },
});

/**
 * Inner layout wrapped with Convex provider that uses Clerk authentication.
 * This component must be inside ClerkProvider to access useAuth.
 */
function ConvexClerkLayout() {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <AuthenticatedUserBoundary>
        <SyncStatusProvider>
          <AnalyticsProvider>
            <InitialLayout />
          </AnalyticsProvider>
        </SyncStatusProvider>
      </AuthenticatedUserBoundary>
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
  const [fontsLoaded, fontError] = useFonts({
    Nunito_800ExtraBold,
    Nunito_900Black,
  });
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [imageError, setImageError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    Asset.loadAsync(WELCOME_IMAGE_ASSETS)
      .then(() => {
        if (mounted) setImagesLoaded(true);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setImageError(
          error instanceof Error
            ? error
            : new Error("Could not preload welcome artwork."),
        );
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (fontError) throw fontError;
  if (imageError) throw imageError;
  if (!fontsLoaded || !imagesLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <StatusBar style="dark" />
        <AccountDeletionCleanupBoundary>
          <ClerkProvider
            publishableKey={publishableKey}
            tokenCache={clerkTokenCache}
          >
            <ClerkLoaded>
              <ConvexClerkLayout />
            </ClerkLoaded>
          </ClerkProvider>
        </AccountDeletionCleanupBoundary>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
