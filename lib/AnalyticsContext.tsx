import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/expo";
import { useQuery } from "convex/react";
import PostHog from "posthog-react-native";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  createAnalytics,
  type Analytics,
  type AnalyticsAdapter,
} from "./analytics";

const noOpAdapter: AnalyticsAdapter = {
  capture: () => undefined,
  identify: () => undefined,
  reset: () => undefined,
  optIn: () => undefined,
  optOut: () => undefined,
};

const AnalyticsContext = createContext<Analytics>(
  createAnalytics(noOpAdapter),
);

interface AnalyticsSession {
  userId: string;
  consent: "granted" | "denied" | undefined;
}

const AnalyticsSessionContext = createContext<AnalyticsSession | null>(null);

function createPostHogAdapter(): AnalyticsAdapter {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;
  if (!apiKey || !host) return noOpAdapter;

  const client = new PostHog(apiKey, {
    host,
    defaultOptIn: false,
    disableGeoip: true,
    enableSessionReplay: false,
    captureAppLifecycleEvents: true,
    capturePushNotificationSubscriptions: false,
    capturePushNotificationOpened: false,
    setDefaultPersonProperties: false,
    errorTracking: { autocapture: false },
  });
  return {
    capture: (event, properties) =>
      client.capture(
        event,
        properties as Parameters<PostHog["capture"]>[1],
      ),
    identify: (userId, properties) =>
      client.identify(
        userId,
        properties as Parameters<PostHog["identify"]>[1],
      ),
    reset: () => client.reset(),
    optIn: () => {
      void client.optIn();
    },
    optOut: () => {
      void client.optOut();
    },
    flush: () => client.flush(),
  };
}

export function AnalyticsProvider({ children }: PropsWithChildren) {
  const { user } = useUser();
  const household = useQuery(api.households.getCurrentHousehold);
  const preference = useQuery(
    api.notifications.getPreferences,
    user ? {} : "skip",
  );
  const analytics = useMemo(
    () => createAnalytics(createPostHogAdapter()),
    [],
  );
  const [analyticsSession, setAnalyticsSession] =
    useState<AnalyticsSession | null>(null);
  const activeUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const syncIdentityAndConsent = async () => {
      const nextUserId = user?.id ?? null;
      if (activeUserIdRef.current !== nextUserId) {
        setAnalyticsSession(null);
        await analytics.reset();
        if (!active) return;
        activeUserIdRef.current = nextUserId;
      }
      if (!active || !nextUserId || preference?.viewerClerkId !== nextUserId) {
        if (active) setAnalyticsSession(null);
        return;
      }
      if (preference.analyticsConsent === "granted") {
        analytics.setConsent("granted");
        if (!household?._id) {
          setAnalyticsSession(null);
          return;
        }
        analytics.identify(nextUserId, household._id);
      } else if (preference.analyticsConsent === "denied") {
        analytics.setConsent("denied");
      }
      if (active) {
        setAnalyticsSession({
          userId: nextUserId,
          consent: preference.analyticsConsent,
        });
      }
    };
    void syncIdentityAndConsent();
    return () => {
      active = false;
    };
  }, [analytics, household?._id, preference, user?.id]);

  return (
    <AnalyticsSessionContext.Provider value={analyticsSession}>
      <AnalyticsContext.Provider value={analytics}>
        {children}
      </AnalyticsContext.Provider>
    </AnalyticsSessionContext.Provider>
  );
}

export function useAnalytics(): Analytics {
  return useContext(AnalyticsContext);
}

export function useAnalyticsSession(): AnalyticsSession | null {
  return useContext(AnalyticsSessionContext);
}
