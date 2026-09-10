import { useCallback, useState } from "react";
import { useSSO } from "@clerk/expo";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { OurPantryWelcome } from "@/components/welcome/OurPantryWelcome";
import { OUR_PANTRY_URLS } from "@/lib/legalUrls";
import { emailSignInErrorCode } from "@/lib/emailSignIn";
import { oauthSignInError } from "@/lib/oauthSignIn";
import { redirectPath } from "@/lib/oauthConfig.json";
import type { WelcomeActionId } from "@/lib/welcomeActions";

WebBrowser.maybeCompleteAuthSession();

export default function WelcomeScreen() {
  const router = useRouter();
  const [loadingActionId, setLoadingActionId] =
    useState<WelcomeActionId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { startSSOFlow } = useSSO();

  // Keep the callback compatible with distributed builds and Clerk's allowlist.
  const redirectUrl = Linking.createURL(redirectPath);

  const completeOAuth = useCallback(
    async (
      actionId: WelcomeActionId,
      strategy: "oauth_google" | "oauth_apple",
    ) => {
      try {
        setLoadingActionId(actionId);
        setError(null);
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          redirectUrl,
        });

        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
        }
      } catch (oauthError) {
        console.error("OAuth sign-in failed", {
          strategy,
          code: emailSignInErrorCode(oauthError) ?? "unknown",
        });
        setError(oauthSignInError(oauthError));
      } finally {
        setLoadingActionId(null);
      }
    },
    [redirectUrl, startSSOFlow],
  );

  const handleWelcomeAction = useCallback(
    (actionId: WelcomeActionId) => {
      if (actionId === "ourpantry.sign-in-email") {
        router.push("/(auth)/sign-in");
        return;
      }
      const strategy =
        actionId === "ourpantry.continue-google"
          ? "oauth_google"
          : "oauth_apple";
      void completeOAuth(actionId, strategy);
    },
    [completeOAuth, router],
  );

  const openLegalPage = useCallback(async (url: string) => {
    try {
      setError(null);
      await Linking.openURL(url);
    } catch (linkError) {
      console.error("Could not open legal page:", linkError);
      setError("We couldn't open that page. Please try again.");
    }
  }, []);

  return (
    <OurPantryWelcome
      onActionPress={handleWelcomeAction}
      onTermsPress={() => void openLegalPage(OUR_PANTRY_URLS.terms)}
      onPrivacyPress={() => void openLegalPage(OUR_PANTRY_URLS.privacy)}
      loadingActionId={loadingActionId}
      error={error}
    />
  );
}
