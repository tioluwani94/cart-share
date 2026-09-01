import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import milk from "@/assets/welcome/ourpantry/01-milk.png";
import apple from "@/assets/welcome/ourpantry/02-apple.png";
import bread from "@/assets/welcome/ourpantry/03-bread.png";
import list from "@/assets/welcome/ourpantry/04-list.png";
import check from "@/assets/welcome/ourpantry/05-check.png";
import pantryMark from "@/assets/welcome/ourpantry/pantry-mark.png";
import splashMark from "@/assets/welcome/ourpantry/splash-mark.png";
import {
  resolveWelcomeActionPress,
  type WelcomeActionId,
  type WelcomeActionPressHandler,
} from "@/lib/welcomeActions";
import { WELCOME_TIMELINE } from "@/lib/welcomeTimeline";
import { ProviderLogo, type WelcomeProvider } from "./ProviderLogo";
import { ReferenceCanvas } from "./ReferenceCanvas";

export const WELCOME_IMAGE_ASSETS = [
  splashMark,
  pantryMark,
  milk,
  apple,
  bread,
  list,
  check,
];

export const OUR_PANTRY_WELCOME_SCREEN_ID = "ourpantry";

const CROSSFADE_EASING = Easing.bezier(0.23, 1, 0.32, 1);

export interface OurPantryWelcomeProps {
  autoplay?: boolean;
  replayKey?: number | string;
  onActionPress?: WelcomeActionPressHandler;
  onPrimary?: () => void;
  onSecondary?: () => void;
  loadingActionId?: WelcomeActionId | null;
  error?: string | null;
}

interface AssetPlacement {
  source: number;
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: number;
  fromX: number;
  fromY: number;
}

const ASSETS: readonly AssetPlacement[] = [
  {
    source: milk,
    left: 66,
    top: 286,
    width: 86,
    height: 105,
    rotate: -11,
    fromX: -68,
    fromY: -42,
  },
  {
    source: apple,
    left: 474,
    top: 344,
    width: 96,
    height: 96,
    rotate: 10,
    fromX: 74,
    fromY: -36,
  },
  {
    source: bread,
    left: 43,
    top: 520,
    width: 112,
    height: 89,
    rotate: -8,
    fromX: -76,
    fromY: 28,
  },
  {
    source: list,
    left: 489,
    top: 512,
    width: 88,
    height: 105,
    rotate: 9,
    fromX: 78,
    fromY: 30,
  },
  {
    source: check,
    left: 276,
    top: 563,
    width: 88,
    height: 88,
    rotate: 0,
    fromX: 0,
    fromY: 56,
  },
] as const;

function LaunchArtwork() {
  return (
    <View style={{ position: "absolute", inset: 0 }}>
      <View
        style={{
          position: "absolute",
          right: -98,
          top: 4,
          width: 340,
          height: 340,
          borderRadius: 170,
          backgroundColor: "rgba(255, 177, 111, 0.18)",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: -198,
          bottom: -85,
          width: 460,
          height: 460,
          borderRadius: 230,
          backgroundColor: "rgba(107, 95, 146, 0.20)",
        }}
      />
      <Image
        source={splashMark}
        contentFit="contain"
        style={{ position: "absolute", left: 178, top: 454, width: 284, height: 284 }}
      />
      <Text
        accessibilityRole="header"
        style={{
          position: "absolute",
          top: 705,
          width: 640,
          color: "#FFF9F0",
          fontFamily: "Nunito_900Black",
          fontSize: 70,
          letterSpacing: -2,
          textAlign: "center",
        }}
      >
        OurPantry
      </Text>
      <Text
        style={{
          position: "absolute",
          top: 805,
          width: 640,
          color: "rgba(255, 249, 240, 0.86)",
          fontFamily: "Nunito_800ExtraBold",
          fontSize: 25,
          textAlign: "center",
        }}
      >
        Groceries feel lighter together.
      </Text>
    </View>
  );
}

function WelcomeShell({
  interactive,
  onActionPress,
  onPrimary,
  onSecondary,
  loadingActionId,
  error,
}: {
  interactive: boolean;
} & Pick<
  OurPantryWelcomeProps,
  | "onActionPress"
  | "onPrimary"
  | "onSecondary"
  | "loadingActionId"
  | "error"
>) {
  const isBusy = Boolean(loadingActionId);
  const providerOrder: WelcomeProvider[] =
    Platform.OS === "ios" ? ["apple", "google"] : ["google", "apple"];

  return (
    <View style={{ position: "absolute", inset: 0 }}>
      <View
        style={{
          position: "absolute",
          right: -86,
          top: -36,
          width: 332,
          height: 332,
          borderRadius: 166,
          backgroundColor: "rgba(255, 177, 111, 0.16)",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: -172,
          top: 480,
          width: 420,
          height: 420,
          borderRadius: 210,
          backgroundColor: "rgba(107, 95, 146, 0.16)",
        }}
      />
      <Image
        source={pantryMark}
        contentFit="contain"
        style={{ position: "absolute", left: 149, top: 166, width: 342, height: 430 }}
      />
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 679,
          width: 640,
          height: 706,
          borderTopLeftRadius: 56,
          borderTopRightRadius: 56,
          backgroundColor: "#FFF9F2",
        }}
      >
        <Text
          accessibilityRole="header"
          style={{
            marginTop: 58,
            color: "#2A2724",
            fontFamily: "Nunito_900Black",
            fontSize: 59,
            lineHeight: 72,
            letterSpacing: -2.2,
            paddingTop: 4,
            paddingBottom: 4,
            textAlign: "center",
          }}
        >
          Less thinking.{"\n"}Better stocked.
        </Text>
        <Text
          style={{
            marginTop: 27,
            color: "#68615B",
            fontSize: 24,
            lineHeight: 36,
            textAlign: "center",
          }}
        >
          Plan together, restock on time,{"\n"}and shop without the mental load.
        </Text>

        {providerOrder.map((provider, index) => {
          const isGoogle = provider === "google";
          const actionId: WelcomeActionId = isGoogle
            ? "ourpantry.continue-google"
            : "ourpantry.continue-apple";
          const label = isGoogle
            ? "Continue with Google"
            : "Continue with Apple";

          return (
            <WelcomeButton
              key={provider}
              provider={provider}
              label={label}
              accessibilityLabel={label}
              disabled={!interactive || isBusy}
              loading={interactive && loadingActionId === actionId}
              placeholder={!interactive}
              onPress={
                interactive
                  ? resolveWelcomeActionPress(
                      actionId,
                      onActionPress,
                      isGoogle ? onPrimary : onSecondary,
                    )
                  : undefined
              }
              style={
                isGoogle
                  ? {
                      marginTop: index === 0 ? 76 : 21,
                      backgroundColor: "#FFFFFF",
                      borderWidth: 2,
                      borderColor: "#D8D4CE",
                    }
                  : {
                      marginTop: index === 0 ? 76 : 21,
                      backgroundColor: "#000000",
                    }
              }
              textColor={isGoogle ? "#2A2724" : "#FFFFFF"}
            />
          );
        })}
        {error ? (
          <Text
            accessibilityRole="alert"
            style={{
              marginTop: 19,
              paddingHorizontal: 40,
              color: "#B72F36",
              fontSize: 18,
              lineHeight: 23,
              textAlign: "center",
            }}
          >
            {error}
          </Text>
        ) : null}
        <Text
          style={{
            marginTop: error ? 17 : 51,
            color: "#8B827B",
            fontSize: 18,
            textAlign: "center",
          }}
        >
          By continuing, you agree to our Terms and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

function WelcomeButton({
  provider,
  label,
  accessibilityLabel,
  disabled,
  loading,
  placeholder,
  onPress,
  style,
  textColor,
}: {
  provider: WelcomeProvider;
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  loading: boolean;
  placeholder: boolean;
  onPress?: () => void;
  style: object;
  textColor: string;
}) {
  const contentNode = loading ? (
    <ActivityIndicator
      testID={`${provider}-auth-loading`}
      color={provider === "google" ? "#2A2724" : "#FFFFFF"}
      size="small"
    />
  ) : (
    <View
      pointerEvents="none"
      style={{ flexDirection: "row", alignItems: "center" }}
    >
      <ProviderLogo provider={provider} size={30} />
      <Text
        style={{
          marginLeft: 17,
          color: textColor,
          fontFamily: "Nunito_800ExtraBold",
          fontSize: 27,
        }}
      >
        {label}
      </Text>
    </View>
  );

  return (
    <View
      style={[
        {
          alignSelf: "center",
          width: 516,
          height: 82,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: 41,
        },
        style,
      ]}
    >
      <Pressable
        accessibilityElementsHidden={placeholder}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled, busy: loading }}
        accessible={!placeholder}
        disabled={disabled}
        onPress={disabled ? undefined : onPress}
        style={({ pressed }) => ({
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? "rgba(42, 39, 36, 0.10)" : "transparent",
        })}
      >
        {contentNode}
      </Pressable>
    </View>
  );
}

function StaticFinalArtwork({
  onActionPress,
  onPrimary,
  onSecondary,
  loadingActionId,
  error,
}: Pick<
  OurPantryWelcomeProps,
  | "onActionPress"
  | "onPrimary"
  | "onSecondary"
  | "loadingActionId"
  | "error"
>) {
  return (
    <View testID="ourpantry-welcome-final" style={{ position: "absolute", inset: 0 }}>
      <WelcomeShell
        interactive
        onActionPress={onActionPress}
        onPrimary={onPrimary}
        onSecondary={onSecondary}
        loadingActionId={loadingActionId}
        error={error}
      />
      {ASSETS.map((asset) => (
        <View
          key={`${asset.left}-${asset.top}`}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: asset.left,
            top: asset.top,
            width: asset.width,
            height: asset.height,
            transform: [{ rotate: `${asset.rotate}deg` }],
          }}
        >
          <Image source={asset.source} contentFit="contain" style={{ width: "100%", height: "100%" }} />
        </View>
      ))}
    </View>
  );
}

export function OurPantryWelcome({
  autoplay = true,
  replayKey = 0,
  onActionPress,
  onPrimary,
  onSecondary,
  loadingActionId = null,
  error = null,
}: OurPantryWelcomeProps) {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = autoplay && !reduceMotion;
  const [showFinalState, setShowFinalState] = useState(!shouldAnimate);
  const reveal = useSharedValue(shouldAnimate ? 0 : 1);
  const assetOne = useSharedValue(shouldAnimate ? 0 : 1);
  const assetTwo = useSharedValue(shouldAnimate ? 0 : 1);
  const assetThree = useSharedValue(shouldAnimate ? 0 : 1);
  const assetFour = useSharedValue(shouldAnimate ? 0 : 1);
  const assetFive = useSharedValue(shouldAnimate ? 0 : 1);
  const assetValues = useMemo(
    () => [assetOne, assetTwo, assetThree, assetFour, assetFive],
    [assetFive, assetFour, assetOne, assetThree, assetTwo],
  );

  useEffect(() => {
    cancelAnimation(reveal);
    assetValues.forEach(cancelAnimation);

    if (!shouldAnimate) {
      reveal.set(1);
      assetValues.forEach((value) => value.set(1));
      setShowFinalState(true);
      return;
    }

    setShowFinalState(false);
    reveal.set(0);
    assetValues.forEach((value) => value.set(0));
    reveal.set(
      withDelay(
        WELCOME_TIMELINE.crossfadeStartMs,
        withTiming(1, {
          duration:
            WELCOME_TIMELINE.crossfadeEndMs -
            WELCOME_TIMELINE.crossfadeStartMs,
          easing: CROSSFADE_EASING,
        }),
      ),
    );
    assetValues.forEach((value, index) => {
      value.set(
        withDelay(
          WELCOME_TIMELINE.assetStartsMs[index],
          withSpring(1, {
            duration:
              WELCOME_TIMELINE.assetEndsMs[index] -
              WELCOME_TIMELINE.assetStartsMs[index],
            dampingRatio: 0.8,
          }),
        ),
      );
    });

    const finalStateTimer = setTimeout(
      () => setShowFinalState(true),
      WELCOME_TIMELINE.finalSwapMs,
    );
    return () => clearTimeout(finalStateTimer);
  }, [assetValues, replayKey, reveal, shouldAnimate]);

  const launchStyle = useAnimatedStyle(() => ({ opacity: 1 - reveal.get() }));
  const shellStyle = useAnimatedStyle(() => ({ opacity: reveal.get() }));
  const assetStyles = [
    useAnimatedStyle(() => ({
      opacity: assetOne.get(),
      transform: [
        { translateX: ASSETS[0].fromX * (1 - assetOne.get()) },
        { translateY: ASSETS[0].fromY * (1 - assetOne.get()) },
        { scale: 0.45 + assetOne.get() * 0.55 },
        { rotate: `${ASSETS[0].rotate}deg` },
      ],
    })),
    useAnimatedStyle(() => ({
      opacity: assetTwo.get(),
      transform: [
        { translateX: ASSETS[1].fromX * (1 - assetTwo.get()) },
        { translateY: ASSETS[1].fromY * (1 - assetTwo.get()) },
        { scale: 0.45 + assetTwo.get() * 0.55 },
        { rotate: `${ASSETS[1].rotate}deg` },
      ],
    })),
    useAnimatedStyle(() => ({
      opacity: assetThree.get(),
      transform: [
        { translateX: ASSETS[2].fromX * (1 - assetThree.get()) },
        { translateY: ASSETS[2].fromY * (1 - assetThree.get()) },
        { scale: 0.45 + assetThree.get() * 0.55 },
        { rotate: `${ASSETS[2].rotate}deg` },
      ],
    })),
    useAnimatedStyle(() => ({
      opacity: assetFour.get(),
      transform: [
        { translateX: ASSETS[3].fromX * (1 - assetFour.get()) },
        { translateY: ASSETS[3].fromY * (1 - assetFour.get()) },
        { scale: 0.45 + assetFour.get() * 0.55 },
        { rotate: `${ASSETS[3].rotate}deg` },
      ],
    })),
    useAnimatedStyle(() => ({
      opacity: assetFive.get(),
      transform: [
        { translateX: ASSETS[4].fromX * (1 - assetFive.get()) },
        { translateY: ASSETS[4].fromY * (1 - assetFive.get()) },
        { scale: 0.45 + assetFive.get() * 0.55 },
        { rotate: `${ASSETS[4].rotate}deg` },
      ],
    })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#D95758" }}>
      <StatusBar animated={false} style="light" />
      <ReferenceCanvas>
        {showFinalState ? (
          <StaticFinalArtwork
            onActionPress={onActionPress}
            onPrimary={onPrimary}
            onSecondary={onSecondary}
            loadingActionId={loadingActionId}
            error={error}
          />
        ) : (
          <View
            testID="ourpantry-welcome-animated"
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ position: "absolute", inset: 0 }}
          >
            <Animated.View style={[{ position: "absolute", inset: 0 }, launchStyle]}>
              <LaunchArtwork />
            </Animated.View>
            <Animated.View style={[{ position: "absolute", inset: 0 }, shellStyle]}>
              <WelcomeShell interactive={false} />
            </Animated.View>
            {ASSETS.map((asset, index) => (
              <Animated.View
                key={`${asset.left}-${asset.top}`}
                style={[
                  {
                    position: "absolute",
                    left: asset.left,
                    top: asset.top,
                    width: asset.width,
                    height: asset.height,
                  },
                  assetStyles[index],
                ]}
              >
                <Image
                  source={asset.source}
                  contentFit="contain"
                  style={{ width: "100%", height: "100%" }}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </ReferenceCanvas>
    </View>
  );
}
