import { oauthSignInError } from "./oauthSignIn";

it("offers a connection retry for Clerk network errors", () => {
  expect(oauthSignInError({ code: "network_error" })).toContain("internet connection");
});

it("asks rate-limited users to wait", () => {
  expect(oauthSignInError({ errors: [{ code: "too_many_requests" }] })).toContain("wait a moment");
});

it("never renders unknown provider messages", () => {
  expect(oauthSignInError(new Error("Private account details")))
    .toBe("We couldn't sign you in. Please try again.");
});
