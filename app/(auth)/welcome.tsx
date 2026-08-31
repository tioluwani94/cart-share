import { useCallback, useState } from "react";
import { useOAuth } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { YazioWelcome } from "@/components/welcome/YazioWelcome";
import type { WelcomeActionId } from "@/lib/welcomeActions";

WebBrowser.maybeCompleteAuthSession();

export default function WelcomeScreen() {
  const [loadingActionId, setLoadingActionId] =
    useState<WelcomeActionId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { startOAuthFlow: startGoogleOAuth } = useOAuth({
    strategy: "oauth_google",
  });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({
    strategy: "oauth_apple",
  });

  const redirectUrl = Linking.createURL("/(auth)/welcome");

  const completeOAuth = useCallback(
    async (
      actionId: WelcomeActionId,
      startOAuthFlow: typeof startGoogleOAuth | typeof startAppleOAuth,
    ) => {
      try {
        setLoadingActionId(actionId);
        setError(null);
        const { createdSessionId, setActive } = await startOAuthFlow({
          redirectUrl,
        });

        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
        }
      } catch (oauthError) {
        console.error("OAuth error:", oauthError);
        setError("Something went wrong. Please try again.");
      } finally {
        setLoadingActionId(null);
      }
    },
    [redirectUrl],
  );

  const handleWelcomeAction = useCallback(
    (actionId: WelcomeActionId) => {
      const startOAuthFlow =
        actionId === "yazio.continue-google"
          ? startGoogleOAuth
          : startAppleOAuth;
      void completeOAuth(actionId, startOAuthFlow);
    },
    [completeOAuth, startAppleOAuth, startGoogleOAuth],
  );

  return (
    <YazioWelcome
      onActionPress={handleWelcomeAction}
      loadingActionId={loadingActionId}
      error={error}
    />
  );
}
