import { getAuthRedirect } from "./authRouting";

describe("auth routing", () => {
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
