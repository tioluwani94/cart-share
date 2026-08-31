import type { AnalyticsConsent } from "./analytics";

export type NotificationHandlingDecision = "wait" | "discard" | "handle";

export function getNotificationHandlingDecision({
  analyticsConsent,
  analyticsReadyConsent,
  analyticsReadyUserId,
  authRedirect,
  capturedUserId,
  currentUserId,
  hasResolvedHousehold,
  hasResolvedPreference,
  householdSetupCompleted,
  isClerkLoaded,
  isConvexAuthenticated,
  isNavigationReady,
  isSignedIn,
  preferenceViewerId,
}: {
  analyticsConsent: AnalyticsConsent;
  analyticsReadyConsent: AnalyticsConsent | null;
  analyticsReadyUserId: string | null;
  authRedirect: string | null;
  capturedUserId: string;
  currentUserId: string | null;
  hasResolvedHousehold: boolean;
  hasResolvedPreference: boolean;
  householdSetupCompleted: boolean;
  isClerkLoaded: boolean;
  isConvexAuthenticated: boolean;
  isNavigationReady: boolean;
  isSignedIn: boolean | undefined;
  preferenceViewerId: string | undefined;
}): NotificationHandlingDecision {
  if (!isClerkLoaded || isSignedIn === undefined) return "wait";
  if (!isSignedIn || !currentUserId) return "discard";
  if (capturedUserId !== currentUserId) return "discard";
  if (
    !isNavigationReady ||
    !isConvexAuthenticated ||
    !hasResolvedHousehold ||
    !hasResolvedPreference ||
    authRedirect !== null
  ) {
    return "wait";
  }
  if (!householdSetupCompleted) return "discard";
  if (preferenceViewerId !== currentUserId) return "wait";
  if (
    analyticsConsent === "granted" &&
    (analyticsReadyUserId !== currentUserId ||
      analyticsReadyConsent !== "granted")
  ) {
    return "wait";
  }
  return "handle";
}
