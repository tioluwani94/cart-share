import { useSignIn } from "@clerk/expo";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Keyboard, Text, View } from "react-native";
import { OnboardingFormScreen } from "@/components/onboarding/OnboardingFormScreen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  continueEmailSignIn,
  emailSignInError,
  requireClerkSuccess,
  type EmailSignInStep,
} from "@/lib/emailSignIn";

const artwork = require("@/assets/onboarding/household/join-household.png");
const COPY: Record<
  EmailSignInStep,
  { title: string; description: string; action: string }
> = {
  password: {
    title: "Welcome back",
    description:
      "Sign in with your email and password. If you joined with Apple or Google, you can go back and use that instead.",
    action: "Sign in",
  },
  "email-code": {
    title: "Check your email",
    description:
      "Enter the verification code Clerk sent to your account's email address.",
    action: "Verify and sign in",
  },
  "authenticator-code": {
    title: "Verify it's you",
    description: "Enter the current code from your authenticator app.",
    action: "Verify and sign in",
  },
  "reset-email": {
    title: "Reset your password",
    description:
      "Enter your account's email address to request a password reset code.",
    action: "Send reset code",
  },
  "reset-code": {
    title: "Check your email",
    description:
      "If your account supports password recovery, you'll receive a reset code. Enter it below.",
    action: "Verify code",
  },
  "new-password": {
    title: "Choose a new password",
    description: "Use a long, unique password to keep your household secure.",
    action: "Save password and sign in",
  },
  complete: {
    title: "Signing you in",
    description: "Getting your household ready.",
    action: "Signing in",
  },
};

export default function EmailSignInScreen() {
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();
  const [step, setStep] = useState<EmailSignInStep>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendAfter, setResendAfter] = useState(0);
  const locked = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      Keyboard.dismiss();
    };
  }, []);
  useEffect(() => {
    if (!resendAfter) return;
    const timer = setTimeout(
      () => setResendAfter((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [resendAfter]);

  const disabled = busy || fetchStatus === "fetching" || !signIn;
  const showEmail = step === "password" || step === "reset-email";
  const showPassword = step === "password" || step === "new-password";
  const showCode =
    step === "email-code" ||
    step === "authenticator-code" ||
    step === "reset-code";
  const canSubmit =
    step !== "complete" &&
    (!showEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) &&
    (!showPassword || password.length > 0) &&
    (!showCode || /^\d{6}$/.test(code));

  async function run(work: () => Promise<void>) {
    if (locked.current || !signIn || fetchStatus === "fetching") return;
    locked.current = true;
    setBusy(true);
    setError(null);
    Keyboard.dismiss();
    try {
      await work();
    } catch (failure) {
      if (alive.current) setError(emailSignInError(failure));
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }

  async function advance() {
    const next = await continueEmailSignIn(signIn);
    if (!alive.current) return;
    setStep(next);
    setPassword("");
    setCode("");
    if (next === "email-code") setResendAfter(30);
  }

  async function sendResetCode() {
    await requireClerkSuccess(signIn.reset());
    try {
      await requireClerkSuccess(signIn.create({ identifier: email.trim() }));
      await requireClerkSuccess(signIn.resetPasswordEmailCode.sendCode());
    } catch (failure) {
      // Do not reveal whether an arbitrary email has an account/password.
      const failureCode =
        failure && typeof failure === "object" && "code" in failure
          ? failure.code
          : undefined;
      if (
        !["form_identifier_not_found", "strategy_for_user_invalid"].includes(
          String(failureCode),
        )
      )
        throw failure;
    }
    if (alive.current) {
      setStep("reset-code");
      setCode("");
      setResendAfter(30);
    }
  }

  function submit() {
    if (!canSubmit) return;
    void run(async () => {
      if (step === "reset-email") {
        await sendResetCode();
        return;
      }
      if (step === "password") {
        await requireClerkSuccess(
          signIn.password({ emailAddress: email.trim(), password }),
        );
      } else if (step === "reset-code") {
        await requireClerkSuccess(
          signIn.resetPasswordEmailCode.verifyCode({ code }),
        );
      } else if (step === "new-password") {
        await requireClerkSuccess(
          signIn.resetPasswordEmailCode.submitPassword({ password }),
        );
      } else if (step === "authenticator-code") {
        await requireClerkSuccess(signIn.mfa.verifyTOTP({ code }));
      } else if (step === "email-code") {
        await requireClerkSuccess(signIn.mfa.verifyEmailCode({ code }));
      }
      await advance();
    });
  }

  function startOver() {
    void run(async () => {
      await requireClerkSuccess(signIn.reset());
      if (alive.current) {
        setStep("password");
        setPassword("");
        setCode("");
        setResendAfter(0);
      }
    });
  }

  const copy = COPY[step];
  return (
    <>
      <StatusBar style="dark" />
      <OnboardingFormScreen
        artworkSource={artwork}
        title={copy.title}
        description={copy.description}
        onBack={() => {
          Keyboard.dismiss();
          router.back();
        }}
        backAccessibilityHint="Returns to Apple and Google sign-in"
        footer={
          <Button
            size="lg"
            forceSolid
            loading={disabled || step === "complete"}
            disabled={disabled || !canSubmit}
            onPress={submit}
          >
            {copy.action}
          </Button>
        }
      >
        {showEmail && (
          <Input
            label="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            editable={!disabled}
          />
        )}
        {showPassword && (
          <Input
            label={step === "new-password" ? "New password" : "Password"}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={
              step === "new-password" ? "new-password" : "current-password"
            }
            textContentType={
              step === "new-password" ? "newPassword" : "password"
            }
            editable={!disabled}
            onSubmitEditing={submit}
          />
        )}
        {showCode && (
          <Input
            label="Verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            editable={!disabled}
            onSubmitEditing={submit}
          />
        )}
        {error && (
          <Text
            className="mb-4 text-base leading-6 text-coral"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        )}
        {step === "password" && (
          <Button
            variant="ghost"
            disabled={disabled}
            onPress={() => {
              Keyboard.dismiss();
              setError(null);
              setPassword("");
              setStep("reset-email");
            }}
          >
            Forgot password?
          </Button>
        )}
        {(step === "email-code" || step === "reset-code") && (
          <Button
            variant="ghost"
            disabled={disabled || resendAfter > 0}
            onPress={() =>
              void run(async () => {
                if (step === "reset-code") await sendResetCode();
                else {
                  await requireClerkSuccess(signIn.mfa.sendEmailCode());
                  if (alive.current) setResendAfter(30);
                }
              })
            }
          >
            {resendAfter > 0 ? `Resend code in ${resendAfter}s` : "Resend code"}
          </Button>
        )}
        {step !== "password" && step !== "complete" && (
          <View className="mt-2">
            <Button variant="ghost" disabled={disabled} onPress={startOver}>
              Back to sign in
            </Button>
          </View>
        )}
      </OnboardingFormScreen>
    </>
  );
}
