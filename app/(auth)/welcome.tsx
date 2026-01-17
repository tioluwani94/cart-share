import { useCallback, useState } from "react";
import { View, Text, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useOAuth } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
  FadeInUp,
} from "react-native-reanimated";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";

import { Button } from "@/components/ui";
import { AnimatedGroceryIcons } from "@/components/welcome/AnimatedGroceryIcons";

// Required for OAuth redirects to work properly
WebBrowser.maybeCompleteAuthSession();

/**
 * Branded loading spinner with coral/teal gradient rotation effect
 */
function LoadingSpinner() {
  const rotation = useSharedValue(0);

  rotation.value = withRepeat(
    withTiming(360, { duration: 1000, easing: Easing.linear }),
    -1,
    false
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View className="items-center justify-center py-8">
      <Animated.View
        style={animatedStyle}
        className="h-12 w-12 rounded-full border-4 border-warm-gray-200 border-t-coral"
      />
      <Text className="mt-4 text-base text-warm-gray-500">
        Getting things ready...
      </Text>
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const convex = useConvex();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startOAuthFlow: startGoogleOAuth } = useOAuth({
    strategy: "oauth_google",
  });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({
    strategy: "oauth_apple",
  });

  // Redirect URL for OAuth callback
  const redirectUrl = Linking.createURL("/(auth)/welcome");

  /**
   * Check if user has a household and navigate accordingly.
   * Waits briefly for auth to propagate to Convex before checking.
   */
  const navigateAfterSignIn = useCallback(async () => {
    // Small delay to allow Convex to receive the auth token
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const household = await convex.query(api.households.getCurrentHousehold);
      if (household) {
        // User already has a household, go to home
        router.replace("/(tabs)");
      } else {
        // New user without household, go to setup
        router.replace("/household-setup");
      }
    } catch (err) {
      // If query fails (e.g., user not yet synced), default to household setup
      console.log("Household check failed, defaulting to setup:", err);
      router.replace("/household-setup");
    }
  }, [convex, router]);

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { createdSessionId, setActive } = await startGoogleOAuth({
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        await navigateAfterSignIn();
      }
    } catch (err) {
      console.error("OAuth error:", err);
      setError("Something went wrong. Please try again!");
    } finally {
      setIsLoading(false);
    }
  }, [startGoogleOAuth, redirectUrl, navigateAfterSignIn]);

  const handleAppleSignIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { createdSessionId, setActive } = await startAppleOAuth({
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        await navigateAfterSignIn();
      }
    } catch (err) {
      console.error("OAuth error:", err);
      setError("Something went wrong. Please try again!");
    } finally {
      setIsLoading(false);
    }
  }, [startAppleOAuth, redirectUrl, navigateAfterSignIn]);

  return (
    <SafeAreaView className="flex-1 bg-background-light">
      {/* Decorative gradient background */}
      <View className="absolute inset-0 bg-gradient-to-b from-coral/5 via-transparent to-teal/5" />

      <View className="flex-1 px-6">
        {/* Top section with animated icons */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(200)}
          className="mt-12 items-center"
        >
          <AnimatedGroceryIcons />
        </Animated.View>

        {/* Main content */}
        <View className="flex-1 items-center justify-center">
          {/* Logo and headline */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(400)}
            className="items-center"
          >
            <Text className="text-5xl font-bold tracking-tight text-coral">
              CartShare
            </Text>
            <Text className="mt-4 text-center text-2xl font-semibold text-warm-gray-800">
              Shop smarter, together
            </Text>
          </Animated.View>

          {/* Value proposition */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(600)}
            className="mt-6 items-center"
          >
            <Text className="text-center text-lg leading-7 text-warm-gray-600">
              The fun way for couples to manage{"\n"}grocery lists and split the
              shopping
            </Text>
          </Animated.View>

          {/* Features list with personality */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(800)}
            className="mt-8 space-y-3"
          >
            <FeatureItem emoji="📝" text="Real-time shared lists" />
            <FeatureItem emoji="📸" text="Scan receipts instantly" />
            <FeatureItem emoji="📊" text="Track spending together" />
          </Animated.View>
        </View>

        {/* Bottom section with auth */}
        <Animated.View
          entering={FadeIn.duration(600).delay(1000)}
          className="mb-8"
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              {error && (
                <View className="mb-4 rounded-xl bg-coral/10 p-3">
                  <Text className="text-center text-sm text-coral">{error}</Text>
                </View>
              )}

              <Button
                onPress={handleGoogleSignIn}
                size="lg"
                className="w-full"
                accessibilityLabel="Continue with Google"
              >
                <View className="flex-row items-center">
                  <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-white">
                    <Text className="text-sm font-bold text-warm-gray-700">
                      G
                    </Text>
                  </View>
                  <Text className="text-lg font-semibold text-white">
                    Continue with Google
                  </Text>
                </View>
              </Button>

              {/* Apple Sign-In - styled per Apple HIG */}
              <Button
                onPress={handleAppleSignIn}
                size="lg"
                variant="outline"
                className="mt-3 w-full border-2 border-warm-gray-900 bg-warm-gray-900"
                accessibilityLabel="Continue with Apple"
              >
                <View className="flex-row items-center">
                  <View className="mr-3 items-center justify-center">
                    <Text className="text-xl text-white"></Text>
                  </View>
                  <Text className="text-lg font-semibold text-white">
                    Continue with Apple
                  </Text>
                </View>
              </Button>

              <Text className="mt-6 text-center text-sm text-warm-gray-400">
                By continuing, you agree to our Terms of Service
              </Text>
            </>
          )}
        </Animated.View>
      </View>

      {/* Decorative food elements at bottom */}
      <View className="absolute bottom-0 left-0 right-0 h-32 opacity-10">
        <View className="absolute bottom-4 left-8">
          <Text className="text-6xl">🍊</Text>
        </View>
        <View className="absolute bottom-8 right-12">
          <Text className="text-5xl">🥦</Text>
        </View>
        <View className="absolute bottom-2 right-32">
          <Text className="text-4xl">🍇</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

/**
 * Feature item with emoji and text
 */
function FeatureItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View className="flex-row items-center">
      <Text className="mr-3 text-2xl">{emoji}</Text>
      <Text className="text-base text-warm-gray-700">{text}</Text>
    </View>
  );
}
