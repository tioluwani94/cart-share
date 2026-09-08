import {
  continueEmailSignIn,
  emailSignInError,
  emailSignInErrorCode,
  requireClerkSuccess,
} from "./emailSignIn";

function resource(status: string, strategies: string[] = []) {
  return {
    status,
    supportedSecondFactors: strategies.map((strategy) => ({ strategy })),
    finalize: jest.fn().mockResolvedValue({ error: null }),
    mfa: { sendEmailCode: jest.fn().mockResolvedValue({ error: null }) },
  } as unknown as Parameters<typeof continueEmailSignIn>[0];
}

it("activates only a completed Clerk sign-in", async () => {
  const signIn = resource("complete");
  await expect(continueEmailSignIn(signIn)).resolves.toBe("complete");
  expect(signIn.finalize).toHaveBeenCalledTimes(1);
});

it.each([
  "needs_identifier",
  "needs_first_factor",
  "needs_protect_check",
  "needs_second_factor",
])("does not bypass %s", async (status) => {
  const signIn = resource(status);
  await expect(continueEmailSignIn(signIn)).rejects.toThrow();
  expect(signIn.finalize).not.toHaveBeenCalled();
});

it.each(["needs_client_trust", "needs_second_factor"])(
  "requests a real email challenge for %s",
  async (status) => {
    const signIn = resource(status, ["email_code"]);
    await expect(continueEmailSignIn(signIn)).resolves.toBe("email-code");
    expect(signIn.mfa.sendEmailCode).toHaveBeenCalledTimes(1);
    expect(signIn.finalize).not.toHaveBeenCalled();
  },
);

it("respects authenticator MFA", async () => {
  const signIn = resource("needs_second_factor", ["totp"]);
  await expect(continueEmailSignIn(signIn)).resolves.toBe("authenticator-code");
  expect(signIn.finalize).not.toHaveBeenCalled();
});

it("requires a new password before activating a recovery session", async () => {
  const signIn = resource("needs_new_password");
  await expect(continueEmailSignIn(signIn)).resolves.toBe("new-password");
  expect(signIn.finalize).not.toHaveBeenCalled();
});

it("does not claim success when Clerk returns an error", async () => {
  const error = { code: "too_many_requests" };
  await expect(requireClerkSuccess(Promise.resolve({ error }))).rejects.toEqual(
    error,
  );
  const signIn = resource("complete");
  jest.mocked(signIn.finalize).mockResolvedValue({ error } as never);
  await expect(continueEmailSignIn(signIn)).rejects.toEqual(error);
});

it("never displays raw account data from provider errors", () => {
  expect(
    emailSignInError({ code: "unexpected", message: "private@example.com" }),
  ).not.toContain("private@example.com");
  expect(emailSignInError({ code: "form_identifier_not_found" })).toBe(
    emailSignInError({ code: "form_password_incorrect" }),
  );
});

it("reads actionable codes inside Clerk response envelopes without exposing messages", () => {
  const failure = {
    code: "api_response_error",
    errors: [{ code: "form_identifier_not_found", message: "private@example.com" }],
  };
  expect(emailSignInErrorCode(failure)).toBe("form_identifier_not_found");
  expect(emailSignInError(failure)).toBe(
    emailSignInError({ code: "form_password_incorrect" }),
  );
  expect(emailSignInError(failure)).not.toContain("private@example.com");
  expect(emailSignInErrorCode({ errors: [null] })).toBeUndefined();
  expect(emailSignInErrorCode(null)).toBeUndefined();
});
