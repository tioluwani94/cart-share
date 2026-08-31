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

interface AuthRoutingInput {
  isNavigationReady: boolean;
  isClerkLoaded: boolean;
  isSignedIn: boolean | undefined;
  isConvexAuthenticated: boolean;
  household: HouseholdRoutingState;
  rootSegment: string | undefined;
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
    ["(auth)", "household-setup", "join-household"].includes(
      rootSegment ?? "",
    )
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
