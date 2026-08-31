import { Button } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAnalytics } from "@/lib/AnalyticsContext";
import { cn } from "@/lib/cn";
import { registerForPushNotifications } from "@/lib/pushNotifications";
import { useMutation, useQuery } from "convex/react";
import { getCalendars } from "expo-localization";
import { useRouter } from "expo-router";
import { Bell, Check, Minus, Plus, ShieldCheck } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const starterProducts = [
  { displayName: "Milk", cadenceDays: 7, category: "Dairy" },
  { displayName: "Bread", cadenceDays: 7, category: "Bakery" },
  { displayName: "Eggs", cadenceDays: 14, category: "Dairy" },
  { displayName: "Bananas", cadenceDays: 7, category: "Produce" },
  { displayName: "Pasta", cadenceDays: 30, category: "Pantry" },
  { displayName: "Toilet roll", cadenceDays: 21, category: "Household" },
];

type ShoppingMode = "in_store" | "online" | "both";

export default function RestockSetupScreen() {
  const router = useRouter();
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
  const registerDevice = useMutation(api.notifications.registerDevice);
  const recalculateReminders = useMutation(
    api.notifications.recalculateForHousehold,
  );
  const [step, setStep] = useState(0);
  const [peopleServed, setPeopleServed] = useState(2);
  const [cadenceDays, setCadenceDays] = useState<number | undefined>(7);
  const [shoppingMode, setShoppingMode] = useState<ShoppingMode>("in_store");
  const [selectedListId, setSelectedListId] =
    useState<Id<"lists"> | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set(),
  );
  const [shareAnalytics, setShareAnalytics] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const planningTimeZone =
    getCalendars()[0]?.timeZone ?? "Europe/London";

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

  const finish = async (enableNotifications: boolean) => {
    if (!household?._id) return;
    setIsFinishing(true);
    setError(null);
    try {
      let activeListId = selectedListId ?? lists?.[0]?._id;
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
            "defaultQuantity" in product
              ? product.defaultQuantity
              : undefined,
          defaultUnit:
            "defaultUnit" in product ? product.defaultUnit : undefined,
          cadenceDays: product.cadenceDays,
          lastPurchasedAt:
            "lastPurchasedAt" in product
              ? product.lastPurchasedAt
              : undefined,
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
      await updatePreferences({
        analyticsConsent: shareAnalytics ? "granted" : "denied",
        notificationTimeZone: planningTimeZone,
      });
      analytics.setConsent(shareAnalytics ? "granted" : "denied");
      analytics.track("activation completed", {
        household_id: household._id,
        market: "GB",
        household_size_bucket:
          peopleServed <= 2 ? "1-2" : peopleServed <= 4 ? "3-4" : "5+",
        cadence_bucket: cadenceDays ? `${cadenceDays}_days` : "variable",
        shopping_mode: shoppingMode,
      });

      if (enableNotifications) {
        const registration = await registerForPushNotifications();
        analytics.track("notification permission answered", {
          household_id: household._id,
          answer: registration.status === "granted" ? "granted" : "denied",
        });
        if (registration.status === "granted") {
          await registerDevice({
            token: registration.token,
            platform: registration.platform,
            deviceId: registration.deviceId,
          });
          await updatePreferences({
            restockNotificationsEnabled: true,
            notificationTimeMinutesLocal: 18 * 60,
            notificationTimeZone: planningTimeZone,
          });
          await recalculateReminders({});
        }
      }
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

  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <View className="px-5 pt-3">
        <Text className="text-sm font-semibold text-coral">{step + 1} of 4</Text>
        <Text className="mt-2 text-3xl font-bold text-warm-gray-900">
          {step === 0
            ? "Your grocery rhythm"
            : step === 1
              ? "What comes up often?"
              : step === 2
                ? "Choose your next shop"
                : "Your first plan is ready"}
        </Text>
        <Text className="mt-2 text-base leading-6 text-warm-gray-600">
          {step === 0
            ? "A few starting details help us ask at the right time. You can change them later."
            : step === 1
              ? "Pick only the staples you want us to remember. Three is plenty to begin."
              : step === 2
                ? "Nothing will be merged or archived. This simply becomes the shop we prepare."
                : `${selectedProducts.size} staples will be watched for ${peopleServed} ${peopleServed === 1 ? "person" : "people"}.`}
        </Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerClassName="py-6">
        {step === 0 && (
          <View>
            <Text className="text-base font-semibold text-warm-gray-900">
              People you usually buy for
            </Text>
            <View className="mt-3 flex-row items-center self-start rounded-2xl bg-white p-2">
              <Pressable
                onPress={() => setPeopleServed((value) => Math.max(1, value - 1))}
                className="h-12 w-12 items-center justify-center rounded-full bg-warm-gray-100"
                accessibilityLabel="Decrease people served"
                accessibilityRole="button"
              >
                <Minus size={20} color="#1A1917" />
              </Pressable>
              <Text
                className="w-16 text-center text-2xl font-bold text-warm-gray-900"
                accessibilityLabel={`${peopleServed} people`}
              >
                {peopleServed}
              </Text>
              <Pressable
                onPress={() => setPeopleServed((value) => Math.min(20, value + 1))}
                className="h-12 w-12 items-center justify-center rounded-full bg-warm-gray-100"
                accessibilityLabel="Increase people served"
                accessibilityRole="button"
              >
                <Plus size={20} color="#1A1917" />
              </Pressable>
            </View>

            <Text className="mt-7 text-base font-semibold text-warm-gray-900">
              Usual shopping cadence
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {[
                ["Weekly", 7],
                ["Fortnightly", 14],
                ["Monthly", 30],
                ["It varies", undefined],
              ].map(([label, value]) => (
                <Choice
                  key={label as string}
                  label={label as string}
                  selected={cadenceDays === value}
                  onPress={() => setCadenceDays(value as number | undefined)}
                />
              ))}
            </View>

            <Text className="mt-7 text-base font-semibold text-warm-gray-900">
              How you usually shop
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {[
                ["In store", "in_store"],
                ["Online", "online"],
                ["Both", "both"],
              ].map(([label, value]) => (
                <Choice
                  key={value}
                  label={label}
                  selected={shoppingMode === value}
                  onPress={() => setShoppingMode(value as ShoppingMode)}
                />
              ))}
            </View>
            <Text className="mt-6 text-sm leading-5 text-warm-gray-500">
              Household size only improves the starting plan. Your purchase history
              and corrections will take over as better evidence.
            </Text>
          </View>
        )}

        {step === 1 && (
          <View className="gap-2">
            {suggestions.map((product) => {
              const selected = selectedProducts.has(product.displayName);
              return (
                <Pressable
                  key={product.displayName}
                  onPress={() => toggleProduct(product.displayName)}
                  className={cn(
                    "min-h-14 flex-row items-center justify-between rounded-xl border px-4 py-3",
                    selected
                      ? "border-coral bg-coral/10"
                      : "border-warm-gray-200 bg-white",
                  )}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-semibold text-warm-gray-900">
                      {product.displayName}
                    </Text>
                    <Text className="mt-1 text-sm text-warm-gray-500">
                      Usually every {product.cadenceDays} days
                    </Text>
                  </View>
                  {selected && <Check size={20} color="#C94A4A" />}
                </Pressable>
              );
            })}
          </View>
        )}

        {step === 2 && (
          <View className="gap-2">
            {lists.map((list) => (
              <Pressable
                key={list._id}
                onPress={() => setSelectedListId(list._id)}
                className={cn(
                  "min-h-16 flex-row items-center justify-between rounded-xl border px-4 py-3",
                  selectedListId === list._id
                    ? "border-coral bg-coral/10"
                    : "border-warm-gray-200 bg-white",
                )}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedListId === list._id }}
              >
                <View>
                  <Text className="text-base font-semibold text-warm-gray-900">
                    {list.name}
                  </Text>
                  <Text className="mt-1 text-sm text-warm-gray-500">
                    {list.totalItems} items
                  </Text>
                </View>
                {selectedListId === list._id && (
                  <Check size={20} color="#C94A4A" />
                )}
              </Pressable>
            ))}
            {lists.length === 0 && (
              <View className="rounded-xl bg-white p-5">
                <Text className="font-semibold text-warm-gray-900">
                  We'll create a list called Next shop
                </Text>
                <Text className="mt-1 text-sm text-warm-gray-500">
                  You can rename it whenever you like.
                </Text>
              </View>
            )}
          </View>
        )}

        {step === 3 && (
          <View>
            <View className="rounded-2xl bg-white p-5">
              <Text className="text-xl font-bold text-warm-gray-900">
                {lists.find((list) => list._id === selectedListId)?.name ??
                  lists[0]?.name ??
                  "Next shop"}
              </Text>
              <Text className="mt-2 text-warm-gray-600">
                We'll collect uncertain restocks into one calm review instead of
                asking about every product separately.
              </Text>
            </View>

            <View className="mt-4 rounded-2xl bg-teal/10 p-5">
              <View className="flex-row items-center">
                <Bell size={21} color="#297D76" />
                <Text className="ml-2 text-base font-semibold text-warm-gray-900">
                  One useful reminder
                </Text>
              </View>
              <Text className="mt-2 leading-5 text-warm-gray-600">
                We can let you know when a restock review is ready, plus one reminder
                before the shop if it is still unresolved.
              </Text>
            </View>

            <Pressable
              onPress={() => setShareAnalytics((value) => !value)}
              className="mt-4 min-h-14 flex-row items-start rounded-2xl bg-white p-4"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: shareAnalytics }}
            >
              <View
                className={cn(
                  "mt-0.5 h-6 w-6 items-center justify-center rounded-md border",
                  shareAnalytics
                    ? "border-coral bg-coral"
                    : "border-warm-gray-300",
                )}
              >
                {shareAnalytics && <Check size={16} color="#FFFFFF" />}
              </View>
              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <ShieldCheck size={18} color="#57534E" />
                  <Text className="ml-2 font-semibold text-warm-gray-900">
                    Share anonymous beta usage
                  </Text>
                </View>
                <Text className="mt-1 text-sm leading-5 text-warm-gray-500">
                  Helps improve the first beta. Product names, receipts, notes and exact
                  spending are never included. This is optional.
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        {error && <Text className="mt-4 text-center text-coral">{error}</Text>}
      </ScrollView>

      <View className="border-t border-warm-gray-200 bg-white px-5 pb-4 pt-3">
        {step < 3 ? (
          <View className="flex-row gap-3">
            {step > 0 && (
              <Button
                variant="outline"
                onPress={() => setStep((value) => value - 1)}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              onPress={() => setStep((value) => value + 1)}
              className="flex-1"
            >
              Continue
            </Button>
          </View>
        ) : (
          <View>
            <Button
              onPress={() => void finish(true)}
              loading={isFinishing}
              disabled={isFinishing}
              className="w-full"
            >
              Remind me when it's ready
            </Button>
            <Pressable
              onPress={() => void finish(false)}
              disabled={isFinishing}
              className="min-h-12 items-center justify-center"
              accessibilityRole="button"
            >
              <Text className="font-semibold text-warm-gray-600">Not now</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "min-h-12 items-center justify-center rounded-xl border px-4",
        selected
          ? "border-coral bg-coral/10"
          : "border-warm-gray-200 bg-white",
      )}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Text
        className={cn(
          "font-semibold",
          selected ? "text-coral" : "text-warm-gray-700",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
