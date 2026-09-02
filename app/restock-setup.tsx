import { ActivationProgress } from "@/components/onboarding/ActivationProgress";
import { Button } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { useAnalytics } from "@/lib/AnalyticsContext";
import { cn } from "@/lib/cn";
import { keyboardDismissScrollProps } from "@/lib/keyboard";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { getCalendars } from "expo-localization";
import { useRouter } from "expo-router";
import { Check, Minus, Plus } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated, {
  cubicBezier,
  Easing,
  FadeIn,
  FadeInLeft,
  FadeInRight,
  useReducedMotion,
  ZoomIn,
} from "react-native-reanimated";

import cadenceFortnightlyIcon from "@/assets/onboarding/choices/cadence-fortnightly.png";
import cadenceMonthlyIcon from "@/assets/onboarding/choices/cadence-monthly.png";
import cadenceVariableIcon from "@/assets/onboarding/choices/cadence-variable.png";
import cadenceWeeklyIcon from "@/assets/onboarding/choices/cadence-weekly.png";
import shopBothIcon from "@/assets/onboarding/choices/shop-both.png";
import shopInStoreIcon from "@/assets/onboarding/choices/shop-in-store.png";
import shopOnlineIcon from "@/assets/onboarding/choices/shop-online.png";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const MOTION_EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const PRESS_DURATION_MS = "120ms";
const PRESS_EASING = cubicBezier(0.23, 1, 0.32, 1);
const STEP_ENTER_FORWARD = FadeInRight.duration(220)
  .easing(MOTION_EASE_OUT)
  .withInitialValues({ opacity: 0, transform: [{ translateX: 12 }] });
const STEP_ENTER_BACK = FadeInLeft.duration(220)
  .easing(MOTION_EASE_OUT)
  .withInitialValues({ opacity: 0, transform: [{ translateX: -12 }] });
const STEP_ENTER_REDUCED = FadeIn.duration(140).easing(MOTION_EASE_OUT);
const CHECK_ENTER = ZoomIn.duration(160)
  .easing(MOTION_EASE_OUT)
  .withInitialValues({ opacity: 0, transform: [{ scale: 0.95 }] });
const CHECK_ENTER_REDUCED = FadeIn.duration(140).easing(MOTION_EASE_OUT);

const starterProducts = [
  { displayName: "Milk", cadenceDays: 7, category: "Dairy" },
  { displayName: "Bread", cadenceDays: 7, category: "Bakery" },
  { displayName: "Eggs", cadenceDays: 14, category: "Dairy" },
  { displayName: "Bananas", cadenceDays: 7, category: "Produce" },
  { displayName: "Pasta", cadenceDays: 30, category: "Pantry" },
  { displayName: "Toilet roll", cadenceDays: 21, category: "Household" },
];

const setupCopy = [
  {
    title: "How many people do you shop for?",
    helper: "An estimate is fine — you can change this later.",
  },
  {
    title: "How often is your main grocery shop?",
    helper: "Choose the rhythm that feels closest.",
  },
  {
    title: "How do you usually shop?",
    helper: "We'll shape your list around the way you shop.",
  },
  {
    title: "What should we remember first?",
    helper: "Pick a few staples. You can add more later.",
  },
] as const;

type ShoppingMode = "in_store" | "online" | "both";

export default function RestockSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const analytics = useAnalytics();
  const household = useQuery(api.households.getCurrentHousehold);
  const lists = useQuery(
    api.lists.getByHousehold,
    household?._id ? { householdId: household._id } : "skip",
  );
  const historySuggestions = useQuery(api.restocks.getActivationSuggestions);
  const completeSetup = useMutation(api.restocks.completeSetup);
  const createList = useMutation(api.lists.create);
  const updatePreferences = useMutation(api.notifications.updatePreferences);
  const [step, setStep] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
  const [peopleServed, setPeopleServed] = useState(2);
  const [cadenceDays, setCadenceDays] = useState<number | undefined>(7);
  const [shoppingMode, setShoppingMode] = useState<ShoppingMode>("in_store");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set(),
  );
  const [isFinishing, setIsFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasTrackedActivationStart = useRef(false);
  const planningTimeZone = getCalendars()[0]?.timeZone ?? "Europe/London";

  useEffect(() => {
    if (!household?._id || hasTrackedActivationStart.current) return;
    hasTrackedActivationStart.current = true;
    analytics.track("activation started", {
      household_id: household._id,
      market: "GB",
      platform: Platform.OS,
    });
  }, [analytics, household?._id]);

  const suggestions = useMemo(() => {
    const history = historySuggestions ?? [];
    const names = new Set(
      history.map((product) => product.displayName.toLocaleLowerCase("en-GB")),
    );
    return [
      ...history,
      ...starterProducts.filter(
        (product) => !names.has(product.displayName.toLocaleLowerCase("en-GB")),
      ),
    ].slice(0, 12);
  }, [historySuggestions]);

  const toggleProduct = (name: string) => {
    setSelectedProducts((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const finish = async () => {
    if (!household?._id) return;
    setIsFinishing(true);
    setError(null);
    try {
      let activeListId = lists?.[0]?._id;
      if (!activeListId) {
        const result = await createList({
          householdId: household._id,
          name: "Next shop",
          category: "Groceries",
        });
        activeListId = result.listId;
      }

      const products = suggestions
        .filter((product) => selectedProducts.has(product.displayName))
        .map((product) => ({
          displayName: product.displayName,
          category: product.category,
          defaultQuantity:
            "defaultQuantity" in product ? product.defaultQuantity : undefined,
          defaultUnit:
            "defaultUnit" in product ? product.defaultUnit : undefined,
          cadenceDays: product.cadenceDays,
          lastPurchasedAt:
            "lastPurchasedAt" in product ? product.lastPurchasedAt : undefined,
          purchaseObservationCount:
            "purchaseObservationCount" in product
              ? product.purchaseObservationCount
              : 0,
        }));

      await completeSetup({
        activeListId,
        peopleServed,
        shoppingCadenceDays: cadenceDays,
        preferredShoppingMode: shoppingMode,
        planningTimeZone,
        products,
      });
      await updatePreferences({ notificationTimeZone: planningTimeZone });

      analytics.track("activation completed", {
        household_id: household._id,
        market: "GB",
        household_size_bucket:
          peopleServed <= 2 ? "1-2" : peopleServed <= 4 ? "3-4" : "5+",
        cadence_bucket: cadenceDays ? `${cadenceDays}_days` : "variable",
        shopping_mode: shoppingMode,
      });
      router.replace("/(tabs)");
    } catch (caughtError) {
      console.error("Couldn't complete restock setup:", caughtError);
      setError("We couldn't save your setup. Please try again.");
    } finally {
      setIsFinishing(false);
    }
  };

  if (!household || lists === undefined || historySuggestions === undefined) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background-light">
        <ActivityIndicator size="large" color="#C94A4A" />
        <Text className="mt-3 text-warm-gray-600">Preparing your setup…</Text>
      </SafeAreaView>
    );
  }

  const currentCopy = setupCopy[step];
  const stepEntering = reduceMotion
    ? STEP_ENTER_REDUCED
    : transitionDirection === 1
      ? STEP_ENTER_FORWARD
      : STEP_ENTER_BACK;
  const goBack = () => {
    setTransitionDirection(-1);
    setStep((value) => Math.max(0, value - 1));
  };
  const goForward = () => {
    setTransitionDirection(1);
    setStep((value) => Math.min(setupCopy.length - 1, value + 1));
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background-light"
      edges={["top", "left", "right"]}
    >
      <View className="px-6 pt-4">
        <ActivationProgress
          current={step + 1}
          total={setupCopy.length}
          onBack={step > 0 ? goBack : undefined}
        />
      </View>

      <Animated.View key={step} entering={stepEntering} style={{ flex: 1 }}>
        <View className="px-6">
          <Text
            className="mt-7 text-[34px] leading-[40px] tracking-tight text-warm-gray-900"
            style={{ fontFamily: "Nunito_900Black" }}
          >
            {currentCopy.title}
          </Text>
          <Text className="mt-2 text-base leading-6 text-warm-gray-600">
            {currentCopy.helper}
          </Text>
        </View>

        <ScrollView
          {...keyboardDismissScrollProps}
          className="flex-1 px-6"
          contentContainerClassName="flex-grow py-7"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && (
            <View className="flex-1 items-center justify-center pb-16">
              <View className="flex-row items-center rounded-full border border-warm-gray-200 bg-white p-2 shadow-warm">
                <Pressable
                  onPress={() =>
                    setPeopleServed((value) => Math.max(1, value - 1))
                  }
                  className="h-14 w-14 items-center justify-center rounded-full bg-warm-gray-100"
                  accessibilityLabel="Decrease household size"
                  accessibilityRole="button"
                >
                  <Minus size={24} color="#1A1917" />
                </Pressable>
                <View className="w-28 items-center">
                  <Text
                    className="text-5xl leading-[56px] text-warm-gray-900"
                    style={{ fontFamily: "Nunito_900Black" }}
                    accessibilityLabel={`${peopleServed} people`}
                  >
                    {peopleServed}
                  </Text>
                  <Text className="text-sm text-warm-gray-500">
                    {peopleServed === 1 ? "person" : "people"}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    setPeopleServed((value) => Math.min(20, value + 1))
                  }
                  className="h-14 w-14 items-center justify-center rounded-full bg-warm-gray-100"
                  accessibilityLabel="Increase household size"
                  accessibilityRole="button"
                >
                  <Plus size={24} color="#1A1917" />
                </Pressable>
              </View>
            </View>
          )}

          {step === 1 && (
            <View className="gap-3">
              <Choice
                label="Weekly"
                iconSource={cadenceWeeklyIcon}
                selected={cadenceDays === 7}
                onPress={() => setCadenceDays(7)}
              />
              <Choice
                label="Every two weeks"
                iconSource={cadenceFortnightlyIcon}
                selected={cadenceDays === 14}
                onPress={() => setCadenceDays(14)}
              />
              <Choice
                label="Monthly"
                iconSource={cadenceMonthlyIcon}
                selected={cadenceDays === 30}
                onPress={() => setCadenceDays(30)}
              />
              <Choice
                label="It varies"
                iconSource={cadenceVariableIcon}
                selected={cadenceDays === undefined}
                onPress={() => setCadenceDays(undefined)}
              />
            </View>
          )}

          {step === 2 && (
            <View className="gap-3">
              <Choice
                label="In store"
                iconSource={shopInStoreIcon}
                selected={shoppingMode === "in_store"}
                onPress={() => setShoppingMode("in_store")}
              />
              <Choice
                label="Online"
                iconSource={shopOnlineIcon}
                selected={shoppingMode === "online"}
                onPress={() => setShoppingMode("online")}
              />
              <Choice
                label="Both"
                iconSource={shopBothIcon}
                selected={shoppingMode === "both"}
                onPress={() => setShoppingMode("both")}
              />
            </View>
          )}

          {step === 3 && (
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {suggestions.map((product) => (
                <ProductChoice
                  key={product.displayName}
                  label={product.displayName}
                  selected={selectedProducts.has(product.displayName)}
                  onPress={() => toggleProduct(product.displayName)}
                />
              ))}
            </View>
          )}

          {error && (
            <Text
              className="mt-5 text-center text-red-700"
              accessibilityRole="alert"
            >
              {error}
            </Text>
          )}
        </ScrollView>
      </Animated.View>

      <View
        className="border-t border-warm-gray-200 bg-white px-6 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Button
          onPress={() => {
            if (step === setupCopy.length - 1) void finish();
            else goForward();
          }}
          disabled={isFinishing}
          loading={isFinishing}
          size="lg"
          className="w-full"
          forceSolid
          accessibilityLabel={
            step === setupCopy.length - 1
              ? "Build my grocery plan"
              : "Continue setup"
          }
        >
          {step === setupCopy.length - 1 ? "Build my plan" : "Continue"}
        </Button>
      </View>
    </SafeAreaView>
  );
}

function Choice({
  label,
  iconSource,
  selected,
  onPress,
}: {
  label: string;
  iconSource: number;
  selected: boolean;
  onPress: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      pressRetentionOffset={16}
      className={cn(
        "min-h-20 flex-row items-center rounded-2xl border py-2 pl-2 pr-5",
        selected
          ? "border-coral bg-coral-soft"
          : "border-warm-gray-200 bg-white",
      )}
      style={{
        opacity: pressed ? 0.84 : 1,
        transform: [{ scale: pressed && !reduceMotion ? 0.98 : 1 }],
        transitionProperty: reduceMotion
          ? ["opacity", "backgroundColor", "borderColor"]
          : ["opacity", "transform", "backgroundColor", "borderColor"],
        transitionDuration: PRESS_DURATION_MS,
        transitionTimingFunction: PRESS_EASING,
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Image
        source={iconSource}
        contentFit="contain"
        transition={reduceMotion ? 0 : 100}
        style={{ width: 64, height: 64 }}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text
        className={cn(
          "ml-2 flex-1 text-base font-semibold",
          selected ? "text-coral" : "text-warm-gray-900",
        )}
      >
        {label}
      </Text>
      <View
        className={cn(
          "h-6 w-6 items-center justify-center rounded-full",
          selected ? "bg-coral" : "border border-warm-gray-300",
        )}
      >
        {selected && (
          <Animated.View
            entering={reduceMotion ? CHECK_ENTER_REDUCED : CHECK_ENTER}
          >
            <Check size={15} color="#FFFFFF" />
          </Animated.View>
        )}
      </View>
    </AnimatedPressable>
  );
}

function ProductChoice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      pressRetentionOffset={16}
      className={cn(
        "min-h-16 w-[48.5%] flex-row items-center justify-between rounded-2xl border px-4 py-3",
        selected
          ? "border-coral bg-coral-soft"
          : "border-warm-gray-200 bg-white",
      )}
      style={{
        opacity: pressed ? 0.84 : 1,
        transform: [{ scale: pressed && !reduceMotion ? 0.98 : 1 }],
        transitionProperty: reduceMotion
          ? ["opacity", "backgroundColor", "borderColor"]
          : ["opacity", "transform", "backgroundColor", "borderColor"],
        transitionDuration: PRESS_DURATION_MS,
        transitionTimingFunction: PRESS_EASING,
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      <Text
        className={cn(
          "mr-2 flex-1 text-base font-semibold",
          selected ? "text-coral" : "text-warm-gray-900",
        )}
        numberOfLines={2}
      >
        {label}
      </Text>
      <View
        className={cn(
          "h-6 w-6 items-center justify-center rounded-full",
          selected ? "bg-coral" : "border border-warm-gray-300",
        )}
      >
        {selected && (
          <Animated.View
            entering={reduceMotion ? CHECK_ENTER_REDUCED : CHECK_ENTER}
          >
            <Check size={15} color="#FFFFFF" />
          </Animated.View>
        )}
      </View>
    </AnimatedPressable>
  );
}
