import { ProductChoice } from "@/components/pantry/ProductChoice";
import {
  Button,
  PageHeader,
  usePageHeaderHeight,
  useToast,
} from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { keyboardDismissScrollProps } from "@/lib/keyboard";
import { normalizeProductName } from "@/lib/productMemory";
import { getRegularSuggestions } from "@/lib/regularSuggestions";
import { useIsOnline } from "@/lib/useNetworkStatus";
import { useMutation, useQuery } from "convex/react";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function ChooseRegularsScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const destination = (
    from === "pantry" ? "/(tabs)/pantry" : "/(tabs)"
  ) as Href;
  const headerHeight = usePageHeaderHeight();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const isOnline = useIsOnline();
  const history = useQuery(
    api.restocks.getActivationSuggestions,
    isOnline ? {} : "skip",
  );
  const products = useQuery(api.restocks.listProducts, isOnline ? {} : "skip");
  const addRegulars = useMutation(api.restocks.addRegulars);
  const suggestions = useMemo(
    () => getRegularSuggestions(history ?? []),
    [history],
  );
  const existingProducts = useMemo(
    () =>
      new Map(
        (products ?? []).map((product) => [
          normalizeProductName(product.displayName),
          product,
        ]),
      ),
    [products],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const selectedSuggestions = suggestions.filter((product) => {
    const existing = existingProducts.get(
      normalizeProductName(product.displayName),
    );
    return (
      selected.has(product.displayName) &&
      (!existing || existing.status === "learning")
    );
  });
  const ready = isOnline && history !== undefined && products !== undefined;
  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace(destination);
  const save = async () => {
    if (!ready || selectedSuggestions.length === 0 || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await addRegulars({
        products: selectedSuggestions.map((product) => ({
          displayName: product.displayName,
          category: product.category,
          cadenceDays: product.cadenceDays,
          defaultQuantity: product.defaultQuantity,
          defaultUnit: product.defaultUnit,
          lastPurchasedAt: product.lastPurchasedAt,
          purchaseObservationCount: product.purchaseObservationCount,
        })),
      });
      if (!mounted.current) return;
      showToast({
        message:
          result.addedCount > 0
            ? `${result.addedCount} ${result.addedCount === 1 ? "regular added" : "regulars added"} to Pantry`
            : "Your household has already updated these regulars",
        tone: "success",
      });
      router.dismissTo(destination);
    } catch (caughtError) {
      console.error("Couldn't add regulars:", caughtError);
      if (mounted.current)
        setError("We couldn’t save your regulars. Please try again.");
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background-light"
      edges={["left", "right"]}
    >
      <PageHeader
        title="Choose regulars"
        onBack={goBack}
        backLabel={from === "pantry" ? "Back to Pantry" : "Back to Plan"}
      />
      <ScrollView
        {...keyboardDismissScrollProps}
        className="flex-1"
        contentContainerStyle={{
          paddingTop: headerHeight + 24,
          paddingHorizontal: 24,
          paddingBottom: 28,
        }}
        scrollIndicatorInsets={{ top: headerHeight }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="text-[34px] leading-[40px] tracking-tight text-warm-gray-900"
          style={{ fontFamily: "Nunito_900Black" }}
        >
          What should we remember first?
        </Text>
        <Text className="mt-2 text-base leading-6 text-warm-gray-600">
          Pick a few staples. You can add more later.
        </Text>
        {!isOnline ? (
          <Text
            className="mt-7 text-base leading-6 text-ink-secondary"
            accessibilityRole="alert"
          >
            Connect to the internet to choose regulars. Your selections will
            stay here while you reconnect.
          </Text>
        ) : !ready ? (
          <ActivityIndicator
            className="mt-7"
            size="large"
            color="#C94A4A"
            accessibilityLabel="Loading regulars"
          />
        ) : (
          <View className="mt-7 flex-row flex-wrap justify-between gap-y-3">
            {suggestions.map((product) => {
              const existing = existingProducts.get(
                normalizeProductName(product.displayName),
              );
              const unavailable =
                existing?.status === "active" || existing?.status === "paused";
              return (
                <ProductChoice
                  key={product.displayName}
                  label={product.displayName}
                  selected={
                    existing?.status === "active" ||
                    (!unavailable && selected.has(product.displayName))
                  }
                  disabled={saving || unavailable}
                  detail={
                    existing?.status === "active"
                      ? "Already in Pantry"
                      : existing?.status === "paused"
                        ? "Paused · manage in Pantry"
                        : undefined
                  }
                  testIDPrefix="regulars"
                  onPress={() => {
                    setSelected((current) => {
                      const next = new Set(current);
                      if (next.has(product.displayName))
                        next.delete(product.displayName);
                      else next.add(product.displayName);
                      return next;
                    });
                  }}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
      <View
        className="border-t border-warm-gray-200 bg-white px-6 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {error && (
          <Text
            className="mb-3 text-center text-red-700"
            accessibilityRole="alert"
          >
            {error}
          </Text>
        )}
        <Button
          onPress={() => void save()}
          disabled={!ready || selectedSuggestions.length === 0 || saving}
          loading={saving}
          size="lg"
          className="w-full"
          forceSolid
          accessibilityLabel={
            selectedSuggestions.length
              ? `Add ${selectedSuggestions.length} regulars to Pantry`
              : "Select regulars to add"
          }
        >
          {selectedSuggestions.length === 0
            ? "Add regulars"
            : `Add ${selectedSuggestions.length} ${selectedSuggestions.length === 1 ? "regular" : "regulars"}`}
        </Button>
      </View>
    </SafeAreaView>
  );
}
