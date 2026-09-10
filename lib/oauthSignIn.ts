import { emailSignInErrorCode } from "./emailSignIn";

export function oauthSignInError(error: unknown): string {
  switch (emailSignInErrorCode(error)) {
    // This spelling is returned by Clerk's production Frontend API.
    case "resource_missmatch":
      return "Apple and Google sign-in are temporarily unavailable. Please use email if you already have a password, or try again later.";
    case "network_error":
      return "We couldn't connect. Check your internet connection and try again.";
    case "too_many_requests":
    case "too_many_requests_rate_limit_exceeded":
      return "Too many attempts. Please wait a moment before trying again.";
    default:
      return "We couldn't sign you in. Please try again.";
  }
}
