import { getAuthRedirect, getAuthRoutingDecision } from "./authRouting";

const analyticsResolved = {
  analyticsConsent: "denied" as const,
  isAnalyticsPreferenceResolved: true,
};

describe("auth routing", () => {
  it.each([
    {
      name: "signing out from a protected screen",
      input: {
        ...analyticsResolved,
        isNavigationReady: true,
        isClerkLoaded: true,
        isSignedIn: false,
        isConvexAuthenticated: false,
        household: undefined,
        rootSegment: "(tabs)",
      },
      redirect: "/(auth)/welcome",
    },
    {
      name: "waiting for the signed-in household",
      input: {
        ...analyticsResolved,
        isNavigationReady: true,
        isClerkLoaded: true,
        isSignedIn: true,
        isConvexAuthenticated: false,
        household: undefined,
        rootSegment: "(auth)",
      },
      redirect: null,
    },
    {
      name: "sending a new user into household setup",
      input: {
        ...analyticsResolved,
        isNavigationReady: true,
        isClerkLoaded: true,
        isSignedIn: true,
        isConvexAuthenticated: true,
        household: null,
        rootSegment: "(tabs)",
      },
      redirect: "/household-setup",
    },
    {
      name: "sending an unfinished household into activation",
      input: {
        ...analyticsResolved,
        isNavigationReady: true,
        isClerkLoaded: true,
        isSignedIn: true,
        isConvexAuthenticated: true,
        household: {},
        rootSegment: "(tabs)",
      },
      redirect: "/restock-setup",
    },
  ])("hides the stale route while $name", ({ input, redirect }) => {
    expect(getAuthRoutingDecision(input)).toEqual({
      redirect,
      canRenderCurrentRoute: false,
    });
  });

  it("renders only after the user reaches the route matching resolved auth state", () => {
    expect(
      getAuthRoutingDecision({
        ...analyticsResolved,
        isNavigationReady: true,
        isClerkLoaded: true,
        isSignedIn: true,
        isConvexAuthenticated: true,
        household: null,
        rootSegment: "household-setup",
      }),
    ).toEqual({ redirect: null, canRenderCurrentRoute: true });
  });

  it("waits for Convex membership before routing a signed-in user", () => {
    expect(
      getAuthRedirect({
        ...analyticsResolved,
        isNavigationReady: true,
        isClerkLoaded: true,
        isSignedIn: true,
        isConvexAuthenticated: false,
        household: undefined,
        rootSegment: "(auth)",
      }),
    ).toBeNull();
  });

  it.each(["(auth)", "household-setup"])(
    "sends a returning household member away from %s",
    (rootSegment) => {
      expect(
        getAuthRedirect({
          ...analyticsResolved,
          isNavigationReady: true,
          isClerkLoaded: true,
          isSignedIn: true,
          isConvexAuthenticated: true,
          household: { restockSetupCompletedAt: 1_725_062_400_000 },
          rootSegment,
        }),
      ).toBe("/(tabs)");
    },
  );

  it("allows the successful join screen to hand off to notification setup", () => {
    expect(
      getAuthRedirect({
        ...analyticsResolved,
        isNavigationReady: true,
        isClerkLoaded: true,
        isSignedIn: true,
        isConvexAuthenticated: true,
        household: { restockSetupCompletedAt: 1_725_062_400_000 },
        rootSegment: "join-household",
      }),
    ).toBeNull();
  });

  it("sends an activated beta account with no choice to notification setup", () => {
    expect(
      getAuthRoutingDecision({
        analyticsConsent: undefined,
        isAnalyticsPreferenceResolved: true,
        isNavigationReady: true,
        isClerkLoaded: true,
        isSignedIn: true,
        isConvexAuthenticated: true,
        household: { restockSetupCompletedAt: 1_725_062_400_000 },
        rootSegment: "(tabs)",
      }),
    ).toEqual({
      redirect: "/notification-setup",
      canRenderCurrentRoute: false,
    });
  });

  it("keeps notification setup visible before analytics consent", () => {
    expect(
      getAuthRedirect({
        analyticsConsent: undefined,
        isAnalyticsPreferenceResolved: true,
        isNavigationReady: true,
        isClerkLoaded: true,
        isSignedIn: true,
        isConvexAuthenticated: true,
        household: { restockSetupCompletedAt: 1_725_062_400_000 },
        rootSegment: "notification-setup",
      }),
    ).toBeNull();
  });

  it("waits for the analytics preference before exposing an activated route", () => {
    expect(
      getAuthRoutingDecision({
        analyticsConsent: undefined,
        isAnalyticsPreferenceResolved: false,
        isNavigationReady: true,
        isClerkLoaded: true,
        isSignedIn: true,
        isConvexAuthenticated: true,
        household: { restockSetupCompletedAt: 1_725_062_400_000 },
        rootSegment: "(tabs)",
      }),
    ).toEqual({ redirect: null, canRenderCurrentRoute: false });
  });

  it("keeps analytics consent visible while a joined household refreshes", () => {
    expect(
      getAuthRedirect({
        analyticsConsent: undefined,
        isAnalyticsPreferenceResolved: true,
        isNavigationReady: true,
        isClerkLoaded: true,
        isSignedIn: true,
        isConvexAuthenticated: true,
        household: null,
        rootSegment: "analytics-setup",
      }),
    ).toBeNull();
  });

  it("sends a new signed-in user to household setup after membership resolves", () => {
    expect(
      getAuthRedirect({
        ...analyticsResolved,
        isNavigationReady: true,
        isClerkLoaded: true,
        isSignedIn: true,
        isConvexAuthenticated: true,
        household: null,
        rootSegment: "(auth)",
      }),
    ).toBe("/household-setup");
  });

  it("sends an existing household through activation when setup is incomplete", () => {
    expect(
      getAuthRedirect({
        ...analyticsResolved,
        isNavigationReady: true,
        isClerkLoaded: true,
        isSignedIn: true,
        isConvexAuthenticated: true,
        household: {},
        rootSegment: "household-setup",
      }),
    ).toBe("/restock-setup");
  });

  it("sends a signed-out user to welcome from a protected route", () => {
    expect(
      getAuthRedirect({
        ...analyticsResolved,
        isNavigationReady: true,
        isClerkLoaded: true,
        isSignedIn: false,
        isConvexAuthenticated: false,
        household: undefined,
        rootSegment: "(tabs)",
      }),
    ).toBe("/(auth)/welcome");
  });
});
