import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import EmailSignInScreen from "@/app/(auth)/sign-in";

const mockBack = jest.fn();
const mockSignIn = {
  status: "needs_identifier",
  supportedSecondFactors: [],
  password: jest.fn(),
  finalize: jest.fn(),
  reset: jest.fn(),
  create: jest.fn(),
  mfa: {
    sendEmailCode: jest.fn(),
    verifyEmailCode: jest.fn(),
    verifyTOTP: jest.fn(),
  },
  resetPasswordEmailCode: {
    sendCode: jest.fn(),
    verifyCode: jest.fn(),
    submitPassword: jest.fn(),
  },
};
jest.mock("@clerk/expo", () => ({
  useSignIn: () => ({ signIn: mockSignIn, fetchStatus: "idle" }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: mockBack }) }));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("@/components/onboarding/OnboardingFormScreen", () => {
  const React = require("react");
  return {
    OnboardingFormScreen: ({ children, footer, ...props }) =>
      React.createElement("Form", props, children, footer),
  };
});
jest.mock("@/components/ui/Button", () => {
  const React = require("react");
  return { Button: (props) => React.createElement("Button", props) };
});
jest.mock("@/components/ui/Input", () => {
  const React = require("react");
  return { Input: (props) => React.createElement("Input", props) };
});

let renderer;
const field = (label) => renderer.root.findByProps({ label });
const action = (label) =>
  renderer.root
    .findAllByType("Button")
    .find((node) => node.props.children === label);
async function change(label, value) {
  await act(async () => field(label).props.onChangeText(value));
}
async function press(label) {
  await act(async () => {
    await action(label).props.onPress();
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockSignIn.status = "needs_identifier";
  mockSignIn.supportedSecondFactors = [];
  for (const method of [
    mockSignIn.password,
    mockSignIn.finalize,
    mockSignIn.reset,
    mockSignIn.create,
    ...Object.values(mockSignIn.mfa),
    ...Object.values(mockSignIn.resetPasswordEmailCode),
  ]) {
    method.mockReset().mockResolvedValue({ error: null });
  }
  await act(async () => {
    renderer = TestRenderer.create(<EmailSignInScreen />);
  });
});
afterEach(async () => {
  await act(async () => renderer.unmount());
});

it("keeps submission disabled until email and password are provided", async () => {
  expect(action("Sign in").props.disabled).toBe(true);
  await change("Email address", "review@example.com");
  await change("Password", "not-a-real-credential");
  expect(action("Sign in").props.disabled).toBe(false);
  expect(field("Password").props.secureTextEntry).toBe(true);
});

it("finalizes a real completed sign-in without choosing a household route", async () => {
  mockSignIn.password.mockImplementation(async () => {
    mockSignIn.status = "complete";
    return { error: null };
  });
  await change("Email address", " review@example.com ");
  await change("Password", "not-a-real-credential");
  await press("Sign in");
  expect(mockSignIn.password).toHaveBeenCalledWith({
    emailAddress: "review@example.com",
    password: "not-a-real-credential",
  });
  expect(mockSignIn.finalize).toHaveBeenCalledTimes(1);
  expect(action("Signing in").props.disabled).toBe(true);
});

it("does not activate a session on bad credentials", async () => {
  mockSignIn.password.mockResolvedValue({
    error: { code: "form_password_incorrect" },
  });
  await change("Email address", "review@example.com");
  await change("Password", "incorrect");
  await press("Sign in");
  expect(mockSignIn.finalize).not.toHaveBeenCalled();
  expect(
    renderer.root.findByProps({ accessibilityRole: "alert" }).props.children,
  ).toContain("Check your email and password");
});

it("blocks duplicate sign-in attempts while a request is pending", async () => {
  let resolve;
  mockSignIn.password.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await change("Email address", "review@example.com");
  await change("Password", "not-a-real-credential");
  await act(async () => {
    action("Sign in").props.onPress();
    action("Sign in").props.onPress();
  });
  expect(mockSignIn.password).toHaveBeenCalledTimes(1);
  await act(async () => {
    resolve({ error: { code: "form_password_incorrect" } });
  });
});

it("performs reset verification before accepting a new password", async () => {
  await press("Forgot password?");
  await change("Email address", "review@example.com");
  await press("Send reset code");
  expect(mockSignIn.create).toHaveBeenCalledWith({
    identifier: "review@example.com",
  });
  expect(mockSignIn.resetPasswordEmailCode.sendCode).toHaveBeenCalledTimes(1);
  mockSignIn.resetPasswordEmailCode.verifyCode.mockImplementation(async () => {
    mockSignIn.status = "needs_new_password";
    return { error: null };
  });
  await change("Verification code", "123456");
  await press("Verify code");
  expect(mockSignIn.finalize).not.toHaveBeenCalled();
  mockSignIn.resetPasswordEmailCode.submitPassword.mockImplementation(
    async () => {
      mockSignIn.status = "complete";
      return { error: null };
    },
  );
  await change("New password", "not-a-real-new-credential");
  await press("Save password and sign in");
  expect(mockSignIn.finalize).toHaveBeenCalledTimes(1);
});

it("shows Device Trust verification instead of bypassing it", async () => {
  mockSignIn.password.mockImplementation(async () => {
    mockSignIn.status = "needs_client_trust";
    mockSignIn.supportedSecondFactors = [{ strategy: "email_code" }];
    return { error: null };
  });
  await change("Email address", "review@example.com");
  await change("Password", "not-a-real-credential");
  await press("Sign in");
  expect(mockSignIn.mfa.sendEmailCode).toHaveBeenCalledTimes(1);
  expect(mockSignIn.finalize).not.toHaveBeenCalled();
  expect(action("Resend code in 30s").props.disabled).toBe(true);
  mockSignIn.mfa.verifyEmailCode.mockImplementation(async () => {
    mockSignIn.status = "complete";
    return { error: null };
  });
  await change("Verification code", "123456");
  await press("Verify and sign in");
  expect(mockSignIn.finalize).toHaveBeenCalledTimes(1);
});
