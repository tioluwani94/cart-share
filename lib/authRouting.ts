import type { AnalyticsConsent } from "./analytics";

export type HouseholdRoutingState =
  | { restockSetupCompletedAt?: number }
  | null
  | undefined;

export type AuthRedirect =
  | "/(auth)/welcome"
  | "/household-setup"
  | "/restock-setup"
  | "/notification-setup"
  | "/analytics-setup"
  | "/(tabs)"
  | null;

export interface AuthRoutingInput {
  analyticsConsent: AnalyticsConsent;
  isNavigationReady: boolean;
  isAnalyticsPreferenceResolved: boolean;
  isClerkLoaded: boolean;
  isSignedIn: boolean | undefined;
  isConvexAuthenticated: boolean;
  household: HouseholdRoutingState;
  rootSegment: string | undefined;
}

export interface AuthRoutingDecision {
  redirect: AuthRedirect;
  canRenderCurrentRoute: boolean;
}

export function getAuthRedirect({
  analyticsConsent,
  isNavigationReady,
  isAnalyticsPreferenceResolved,
  isClerkLoaded,
  isSignedIn,
  isConvexAuthenticated,
  household,
  rootSegment,
}: AuthRoutingInput): AuthRedirect {
  if (
    !isNavigationReady ||
    !isClerkLoaded ||
    (isSignedIn &&
      (!isConvexAuthenticated ||
        household === undefined ||
        (household?.restockSetupCompletedAt !== undefined &&
          !isAnalyticsPreferenceResolved)))
  ) {
    return null;
  }

  if (isSignedIn === false && rootSegment !== "(auth)") {
    return "/(auth)/welcome";
  }

  if (
    household?.restockSetupCompletedAt !== undefined &&
    analyticsConsent === undefined &&
    ![
      "notification-setup",
      "analytics-setup",
      "join-household",
      "restock-setup",
    ].includes(rootSegment ?? "")
  ) {
    return "/notification-setup";
  }

  if (
    household?.restockSetupCompletedAt !== undefined &&
    ["(auth)", "household-setup"].includes(rootSegment ?? "")
  ) {
    return "/(tabs)";
  }

  if (
    household === null &&
    ![
      "household-setup",
      "join-household",
      "notification-setup",
      "analytics-setup",
    ].includes(rootSegment ?? "")
  ) {
    return "/household-setup";
  }

  if (
    household &&
    household.restockSetupCompletedAt === undefined &&
    rootSegment !== "restock-setup"
  ) {
    return "/restock-setup";
  }

  return null;
}

/**
 * Keeps the current route covered until both the authentication state and its
 * destination agree. Redirects are asynchronous, so rendering solely from
 * `getAuthRedirect` would expose the outgoing screen for a frame (or longer
 * while Convex membership resolves).
 */
export function getAuthRoutingDecision(
  input: AuthRoutingInput,
): AuthRoutingDecision {
  const redirect = getAuthRedirect(input);
  const authStateResolved =
    input.isNavigationReady &&
    input.isClerkLoaded &&
    (input.isSignedIn === false ||
      (input.isSignedIn === true &&
        input.isConvexAuthenticated &&
        input.household !== undefined &&
        (input.household?.restockSetupCompletedAt === undefined ||
          input.isAnalyticsPreferenceResolved)));

  return {
    redirect,
    canRenderCurrentRoute: authStateResolved && redirect === null,
  };
}
