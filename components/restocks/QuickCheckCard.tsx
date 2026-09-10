import { Button } from "@/components/ui";
import { pantryArtwork } from "@/lib/pantryArtwork";
import { resolvePantryArtwork } from "@/lib/pantryCatalogue";
import type { RestockDecision } from "@/lib/useRestockDecisionActions";
import { Image } from "expo-image";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { themeColors } from "@/lib/theme";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { QuickCheckStack } from "./QuickCheckStack";

type Choice = Exclude<RestockDecision, "stop_tracking">;

/** Finger-following motion stays entirely on the UI runtime. Buttons never require a gesture. */
export function QuickCheckCard({
  name,
  note,
  explanation,
  remaining,
  canAdd,
  busy,
  onDecision,
}: {
  name: string;
  note: string;
  explanation: string;
  remaining: number;
  canAdd: boolean;
  busy: boolean;
  onDecision: (decision: Choice) => Promise<void>;
}) {
  const reduceMotion = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(320);
  const [showExplanation, setShowExplanation] = useState(false);
  const committing = useRef(false);
  const x = useSharedValue(0);
  const start = useSharedValue(0);
  const committed = useSharedValue(false);
  const artwork = pantryArtwork[resolvePantryArtwork(name)];
  const commit = useCallback(
    async (decision: Choice) => {
      if (committing.current || busy || (decision === "add" && !canAdd)) return;
      committing.current = true;
      try {
        await onDecision(decision);
      } finally {
        committing.current = false;
        committed.set(false);
        x.set(
          reduceMotion ? 0 : withSpring(0, { duration: 400, dampingRatio: 1 }),
        );
      }
    },
    [busy, canAdd, committed, onDecision, reduceMotion, x],
  );
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!busy)
        .maxPointers(1)
        .activeOffsetX([-12, 12])
        .failOffsetY([-12, 12])
        .onStart(() => {
          cancelAnimation(x);
          start.set(x.get());
          committed.set(false);
        })
        .onUpdate((event) => {
          x.set(start.get() + event.translationX);
        })
        .onEnd((event) => {
          const projected = x.get() + event.velocityX * 0.18;
          const right = projected > width * 0.27;
          const left = projected < -width * 0.27;
          if ((right && canAdd) || left) {
            committed.set(true);
            if (!reduceMotion)
              x.set(
                withSpring((right ? 1 : -1) * width * 1.15, {
                  duration: 300,
                  dampingRatio: 1,
                  velocity: event.velocityX,
                  overshootClamping: true,
                }),
              );
            scheduleOnRN(commit, right ? "add" : "still_have_some");
          } else
            x.set(
              reduceMotion
                ? 0
                : withSpring(0, {
                    duration: 400,
                    dampingRatio: 0.8,
                    velocity: event.velocityX,
                  }),
            );
        })
        .onFinalize((_event, success) => {
          if (!success && !committed.get())
            x.set(
              reduceMotion
                ? 0
                : withSpring(0, { duration: 400, dampingRatio: 1 }),
            );
        }),
    [busy, canAdd, commit, committed, reduceMotion, start, width, x],
  );
  const cardStyle = useAnimatedStyle(() => ({
    transform: reduceMotion
      ? []
      : [{ translateX: x.get() }, { rotateZ: `${x.get() / 40}deg` }],
  }));
  const yesStyle = useAnimatedStyle(() => ({
    opacity: canAdd ? Math.min(1, Math.max(0, x.get() / 80)) : 0,
  }));
  const noStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, -x.get() / 80)),
  }));
  return (
    <View
      className="mt-4"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <QuickCheckStack remaining={remaining}>
        {busy && (
          <View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center"
          >
            <ActivityIndicator color={themeColors.coral} />
            <Text
              className="mt-2 text-sm text-ink-secondary"
              accessibilityLiveRegion="polite"
            >
              Saving your choice…
            </Text>
          </View>
        )}
        <GestureDetector gesture={pan}>
          <Animated.View
            testID="quick-check-card"
            style={[{ backgroundColor: "#FFFAEF" }, cardStyle]}
            className="rounded-3xl border border-yellow/40 p-5"
          >
            <Text className="self-center rounded-full bg-teal-soft px-3 py-1 text-center text-xs font-semibold text-teal">
              Worth checking, not running out
            </Text>
            <View
              className="my-3 items-center"
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Image
                source={artwork.source}
                contentFit="contain"
                transition={0}
                style={{ width: 112, height: 112 }}
              />
            </View>
            <Text
              accessibilityRole="header"
              className="text-center text-2xl leading-8 font-heading text-ink"
            >
              Do you need {name.toLocaleLowerCase()}?
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-ink-secondary">
              {note}
            </Text>
            <Pressable
              onPress={() => setShowExplanation((shown) => !shown)}
              accessibilityRole="button"
              accessibilityLabel={`Why ${name} is being suggested`}
              accessibilityState={{ expanded: showExplanation }}
              className="min-h-11 self-center justify-center px-3"
            >
              <Text className="text-sm font-semibold text-coral">
                Why this?
              </Text>
            </Pressable>
            {showExplanation && (
              <Text className="text-center text-sm leading-5 text-ink-secondary">
                {explanation}
              </Text>
            )}
            <View
              className={
                fontScale >= 1.5 ? "mt-5 gap-2" : "mt-5 flex-row gap-2"
              }
            >
              <Button
                variant="outline"
                forceSolid
                disabled={busy}
                className={fontScale >= 1.5 ? "w-full" : "flex-1"}
                onPress={() => void commit("still_have_some")}
                accessibilityLabel={`Still have some ${name}`}
              >
                Still have it
              </Button>
              <Button
                forceSolid
                disabled={busy || !canAdd}
                className={fontScale >= 1.5 ? "w-full" : "flex-1"}
                onPress={() => void commit("add")}
                accessibilityLabel={`Add ${name} to Shop`}
              >
                Need this
              </Button>
            </View>
            <Button
              variant="ghost"
              disabled={busy}
              className="mt-1"
              onPress={() => void commit("not_this_time")}
              accessibilityLabel={`Check ${name} another time`}
            >
              Not sure · ask me later
            </Button>
            {busy && (
              <Text
                accessibilityLiveRegion="polite"
                className="mt-1 text-center text-sm text-ink-secondary"
              >
                Saving your choice…
              </Text>
            )}
            {!canAdd && (
              <Text className="mt-2 text-center text-sm text-ink-secondary">
                Choose a Next shop below before adding products.
              </Text>
            )}
            <View
              pointerEvents="none"
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="absolute left-5 right-5 top-16"
            >
              <Animated.View
                style={yesStyle}
                className="rounded-2xl border border-teal bg-teal-soft px-3 py-3"
              >
                <Text className="text-center font-heading text-lg text-teal">
                  Add to Shop
                </Text>
              </Animated.View>
              <Animated.View
                style={noStyle}
                className="absolute left-0 right-0 rounded-2xl border border-warm-gray-300 bg-white px-3 py-3"
              >
                <Text className="text-center font-heading text-lg text-ink">
                  Still have it
                </Text>
              </Animated.View>
            </View>
          </Animated.View>
        </GestureDetector>
      </QuickCheckStack>
      <View
        className="mt-3 flex-row justify-between"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text className="text-xs text-ink-secondary">← Still have it</Text>
        <Text className="text-xs text-coral">Need this →</Text>
      </View>
    </View>
  );
}
