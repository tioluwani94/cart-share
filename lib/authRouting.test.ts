import { getAuthRedirect, getAuthRoutingDecision } from "./authRouting";

describe("auth routing", () => {
  it.each([
    {
      name: "signing out from a protected screen",
      input: {
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
        isNavigationReady: true,
        isClerkLoaded: true,
        isSignedIn: true,
        isConvexAuthenticated: false,
        household: undefined,
        rootSegment: "(auth)",
      }),
    ).toBeNull();
  });

  it.each(["(auth)", "household-setup", "join-household"])(
    "sends a returning household member away from %s",
    (rootSegment) => {
      expect(
        getAuthRedirect({
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

  it("sends a new signed-in user to household setup after membership resolves", () => {
    expect(
      getAuthRedirect({
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
