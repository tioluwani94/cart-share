const { inspectOAuthResponse } = require("../scripts/check-oauth.cjs");
const origin = "https://clerk.example.com";
const bodyFor = (url) => ({ response: {
  first_factor_verification: { external_verification_redirect_url: url },
} });

it("rejects Apple's HTTP 200 response when production credentials are missing", () => {
  const body = bodyFor(`https://appleid.apple.com/auth/authorize?client_id=&redirect_uri=${origin}/v1/oauth_callback&response_type=code&state=test`);
  expect(inspectOAuthResponse({ ok: true }, body, "oauth_apple", origin))
    .toEqual({ ok: false, reason: "missing client_id" });
});

it("accepts a configured provider without returning sensitive URL parameters", () => {
  const body = bodyFor(`https://appleid.apple.com/auth/authorize?client_id=app.example.web&redirect_uri=${origin}/v1/oauth_callback&response_type=code&state=private-oauth-state`);
  expect(inspectOAuthResponse({ ok: true }, body, "oauth_apple", origin))
    .toEqual({ ok: true, providerHost: "appleid.apple.com" });
});

it("rejects Clerk callback allowlist failures", () => {
  expect(inspectOAuthResponse({ ok: false }, { errors: [{ code: "resource_missmatch" }] }, "oauth_google", origin))
    .toEqual({ ok: false, reason: "resource_missmatch" });
});

const developmentOrigin = "https://example.clerk.accounts.dev";
const sharedCallback = "https://clerk.shared.lcl.dev/v1/oauth_callback";
const providerBody = (strategy, callback, clientId = "configured-client") => {
  const host = strategy === "oauth_apple" ? "appleid.apple.com" : "accounts.google.com";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callback,
    state: "private-test-state",
  });
  return bodyFor(`https://${host}/auth/authorize?${params}`);
};

it.each(["oauth_apple", "oauth_google"])("accepts Clerk's shared development callback for %s", (strategy) => {
  expect(inspectOAuthResponse(
    { ok: true }, providerBody(strategy, sharedCallback), strategy, developmentOrigin, "development",
  ).ok).toBe(true);
});

it("rejects the shared callback in production", () => {
  expect(inspectOAuthResponse(
    { ok: true }, providerBody("oauth_apple", sharedCallback), "oauth_apple", origin, "production",
  )).toEqual({ ok: false, reason: "incorrect provider callback" });
});

it("still accepts an instance callback with custom development credentials", () => {
  expect(inspectOAuthResponse(
    { ok: true }, providerBody("oauth_apple", `${developmentOrigin}/v1/oauth_callback`),
    "oauth_apple", developmentOrigin, "development",
  ).ok).toBe(true);
});

it("rejects unrelated callbacks in development", () => {
  expect(inspectOAuthResponse(
    { ok: true }, providerBody("oauth_apple", "https://unrelated.example/v1/oauth_callback"),
    "oauth_apple", developmentOrigin, "development",
  )).toEqual({ ok: false, reason: "incorrect provider callback" });
});

it("still rejects missing development client IDs", () => {
  expect(inspectOAuthResponse(
    { ok: true }, providerBody("oauth_apple", sharedCallback, ""),
    "oauth_apple", developmentOrigin, "development",
  )).toEqual({ ok: false, reason: "missing client_id" });
});
