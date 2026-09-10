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
