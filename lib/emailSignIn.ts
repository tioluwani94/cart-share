import type { SignInFutureResource } from "@clerk/expo/types";

export type EmailSignInStep =
  | "password"
  | "email-code"
  | "authenticator-code"
  | "reset-email"
  | "reset-code"
  | "new-password"
  | "complete";

export type EmailSignInResource = Pick<
  SignInFutureResource,
  "status" | "supportedSecondFactors" | "finalize" | "mfa"
>;

/** Clerk API responses wrap their actionable code; never read/log their messages. */
export function emailSignInErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("errors" in error && Array.isArray(error.errors)) {
    const first = error.errors[0];
    if (first && typeof first.code === "string") return first.code;
  }
  return "code" in error && typeof error.code === "string" ? error.code : undefined;
}

/** Never render provider errors verbatim: they can contain account identifiers. */
export function emailSignInError(error: unknown): string {
  const code = emailSignInErrorCode(error);
  switch (code) {
    case "form_password_incorrect":
    case "form_identifier_not_found":
    case "strategy_for_user_invalid":
      return "We couldn't sign you in. Check your email and password, or use Apple or Google.";
    case "form_code_incorrect":
    case "verification_expired":
      return "That code is incorrect or has expired. Try again or request a new code.";
    case "too_many_requests":
    case "too_many_requests_rate_limit_exceeded":
      return "Too many attempts. Please wait a moment before trying again.";
    case "form_password_pwned":
    case "form_password_length_too_short":
    case "form_password_not_strong_enough":
      return "Choose a longer, unique password that you haven't used elsewhere.";
    default:
      return "We couldn't complete that step. Please try again. You can also go back and use Apple or Google.";
  }
}

export async function requireClerkSuccess(
  request: Promise<{ error: unknown }>,
): Promise<void> {
  const result = await request;
  if (result.error) throw result.error;
}

/** Clerk remains the authority; incomplete challenges can never activate a session. */
export async function continueEmailSignIn(
  signIn: EmailSignInResource,
): Promise<EmailSignInStep> {
  if (signIn.status === "complete") {
    await requireClerkSuccess(signIn.finalize());
    // The existing root auth gate owns household/consent routing.
    return "complete";
  }
  if (signIn.status === "needs_new_password") return "new-password";
  if (
    signIn.status === "needs_client_trust" ||
    signIn.status === "needs_second_factor"
  ) {
    if (
      signIn.supportedSecondFactors.some((factor) => factor.strategy === "totp")
    ) {
      return "authenticator-code";
    }
    if (
      signIn.supportedSecondFactors.some(
        (factor) => factor.strategy === "email_code",
      )
    ) {
      await requireClerkSuccess(signIn.mfa.sendEmailCode());
      return "email-code";
    }
  }
  throw new Error("An additional sign-in step is required.");
}
