#!/usr/bin/env node

// Credential-free preflight: starts anonymous OAuth attempts, but never follows
// provider redirects, submits account data, or creates authenticated sessions.
const { expo } = require("../app.json");
const { redirectPath } = require("../lib/oauthConfig.json");

const redirectUrl = `${expo.scheme}://${redirectPath}`;
const frontendOrigin = process.argv[2];

function inspectOAuthResponse(response, body, strategy, origin, instanceType = "production") {
  const externalUrl = body.response?.first_factor_verification?.external_verification_redirect_url;
  if (!response.ok || !externalUrl || new URL(externalUrl).protocol !== "https:") {
    const codes = (body.errors ?? []).map((error) => error.code).join(", ");
    return { ok: false, reason: codes || "no provider redirect" };
  }
  const url = new URL(externalUrl);
  const expectedHost = strategy === "oauth_apple" ? "appleid.apple.com" : "accounts.google.com";
  if (url.hostname !== expectedHost) return { ok: false, reason: "unexpected provider host" };
  // Clerk can return HTTP 200 and an Apple URL even when setup is incomplete.
  if (!url.searchParams.get("client_id")?.trim()) return { ok: false, reason: "missing client_id" };
  const callback = url.searchParams.get("redirect_uri");
  const usesSharedDevelopmentCallback = instanceType === "development"
    && callback === "https://clerk.shared.lcl.dev/v1/oauth_callback";
  if (callback !== `${origin}/v1/oauth_callback` && !usesSharedDevelopmentCallback) {
    return { ok: false, reason: "incorrect provider callback" };
  }
  if (!url.searchParams.get("state")) return { ok: false, reason: "missing OAuth state" };
  return { ok: true, providerHost: url.hostname };
}

async function main() {
  if (!frontendOrigin || !/^https:\/\/[^/?#]+$/.test(frontendOrigin)) {
    console.error("Usage: pnpm auth:check https://<clerk-frontend-domain>");
    process.exitCode = 1;
    return;
  }
  const environmentResponse = await fetch(`${frontendOrigin}/v1/environment`, {
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  if (!environmentResponse.ok) {
    console.error("Could not read the Clerk environment; OAuth preflight cannot proceed.");
    process.exitCode = 1;
    return;
  }
  const environment = await environmentResponse.json();
  const instanceType = environment.display_config?.instance_environment_type;
  if (instanceType !== "development" && instanceType !== "production") {
    console.error("Unknown Clerk environment type; OAuth preflight cannot proceed.");
    process.exitCode = 1;
    return;
  }
  console.log(`Checking ${frontendOrigin} (${instanceType}) with callback ${redirectUrl}`);
  let failed = false;
  for (const strategy of ["oauth_google", "oauth_apple"]) {
    const response = await fetch(`${frontendOrigin}/v1/client/sign_ins?_is_native=1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-mobile": "1",
      },
      body: new URLSearchParams({ strategy, redirect_url: redirectUrl }),
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    const body = await response.json();
    const result = inspectOAuthResponse(response, body, strategy, frontendOrigin, instanceType);
    if (!result.ok) {
      failed = true;
      console.error(`${strategy}: FAIL (HTTP ${response.status}, ${result.reason})`);
    } else {
      // Never log the full URL: OAuth state and tokens can appear in its query.
      console.log(`${strategy}: PASS (provider redirect: ${result.providerHost})`);
    }
  }
  if (failed) process.exitCode = 1;
  else console.log("OAuth initiation passed. Device sign-in and callback completion still require UAT.");
}

module.exports = { inspectOAuthResponse };

if (require.main === module) {
  main().catch(() => {
    console.error("OAuth preflight failed. Check the HTTPS Clerk domain and network access.");
    process.exitCode = 1;
  });
}
