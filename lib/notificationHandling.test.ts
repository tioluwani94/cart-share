import { getNotificationHandlingDecision } from "./notificationHandling";

const readyState = {
  analyticsConsent: "granted" as const,
  analyticsReadyConsent: "granted" as const,
  analyticsReadyUserId: "clerk_1",
  authRedirect: null,
  capturedUserId: "clerk_1",
  currentUserId: "clerk_1",
  hasResolvedHousehold: true,
  hasResolvedPreference: true,
  householdSetupCompleted: true,
  isClerkLoaded: true,
  isConvexAuthenticated: true,
  isNavigationReady: true,
  isSignedIn: true,
  preferenceViewerId: "clerk_1",
};

describe("getNotificationHandlingDecision", () => {
  it("waits until navigation, household, and consented analytics identity are ready", () => {
    expect(
      getNotificationHandlingDecision({
        ...readyState,
        isNavigationReady: false,
      }),
    ).toBe("wait");
    expect(
      getNotificationHandlingDecision({
        ...readyState,
        hasResolvedHousehold: false,
      }),
    ).toBe("wait");
    expect(
      getNotificationHandlingDecision({
        ...readyState,
        analyticsReadyUserId: null,
      }),
    ).toBe("wait");
    expect(
      getNotificationHandlingDecision({
        ...readyState,
        analyticsReadyConsent: "denied",
      }),
    ).toBe("wait");
  });

  it("waits while route protection has a redirect to apply", () => {
    expect(
      getNotificationHandlingDecision({
        ...readyState,
        authRedirect: "/(tabs)",
      }),
    ).toBe("wait");
  });

  it("discards a response captured for another or signed-out user", () => {
    expect(
      getNotificationHandlingDecision({
        ...readyState,
        currentUserId: "clerk_2",
      }),
    ).toBe("discard");
    expect(
      getNotificationHandlingDecision({
        ...readyState,
        currentUserId: null,
        isSignedIn: false,
      }),
    ).toBe("discard");
  });

  it("handles a denied or absent-consent user without waiting for analytics identity", () => {
    expect(
      getNotificationHandlingDecision({
        ...readyState,
        analyticsConsent: "denied",
        analyticsReadyConsent: null,
        analyticsReadyUserId: null,
      }),
    ).toBe("handle");
    expect(
      getNotificationHandlingDecision({
        ...readyState,
        analyticsConsent: undefined,
        analyticsReadyConsent: null,
        analyticsReadyUserId: null,
      }),
    ).toBe("handle");
  });

  it("handles a fully scoped and ready response", () => {
    expect(getNotificationHandlingDecision(readyState)).toBe("handle");
  });
});
