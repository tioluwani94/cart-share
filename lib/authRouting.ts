export type HouseholdRoutingState =
  | { restockSetupCompletedAt?: number }
  | null
  | undefined;

export type AuthRedirect =
  | "/(auth)/welcome"
  | "/household-setup"
  | "/restock-setup"
  | "/(tabs)"
  | null;

export interface AuthRoutingInput {
  isNavigationReady: boolean;
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
  isNavigationReady,
  isClerkLoaded,
  isSignedIn,
  isConvexAuthenticated,
  household,
  rootSegment,
}: AuthRoutingInput): AuthRedirect {
  if (
    !isNavigationReady ||
    !isClerkLoaded ||
    (isSignedIn && (!isConvexAuthenticated || household === undefined))
  ) {
    return null;
  }

  if (isSignedIn === false && rootSegment !== "(auth)") {
    return "/(auth)/welcome";
  }

  if (
    household?.restockSetupCompletedAt !== undefined &&
    ["(auth)", "household-setup", "join-household"].includes(rootSegment ?? "")
  ) {
    return "/(tabs)";
  }

  if (
    household === null &&
    !["household-setup", "join-household"].includes(rootSegment ?? "")
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
        input.household !== undefined));

  return {
    redirect,
    canRenderCurrentRoute: authStateResolved && redirect === null,
  };
}
