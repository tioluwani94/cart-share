import {
  Button,
  GlassBottomSheet,
  GlassBottomSheetScrollView,
  type GlassBottomSheetRef,
  Input,
  PageHeader,
  Toast,
} from "@/components/ui";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAnalytics } from "@/lib/AnalyticsContext";
import { themeColors } from "@/lib/theme";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  PackageCheck,
  Pause,
  Play,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface TrackedProduct {
  _id: Id<"householdProducts">;
  displayName: string;
  category?: string;
  defaultQuantity?: number;
  defaultUnit?: string;
  cadenceDays: number;
  purchaseObservationCount: number;
  status: "active" | "paused";
}

function productAmount(product: TrackedProduct): string {
  if (product.defaultQuantity === undefined) return "Amount optional";
  return `${product.defaultQuantity}${
    product.defaultUnit ? ` ${product.defaultUnit}` : ""
  }`;
}

export default function TrackedProductsScreen() {
  const router = useRouter();
  const analytics = useAnalytics();
  const household = useQuery(api.households.getCurrentHousehold);
  const products = useQuery(api.restocks.listProducts);
  const updateProduct = useMutation(api.restocks.updateProduct);
  const recalculateReminders = useMutation(
    api.notifications.recalculateForHousehold,
  );
  const editorSheetRef = useRef<GlassBottomSheetRef>(null);
  const [editingProduct, setEditingProduct] =
    useState<TrackedProduct | null>(null);
  const [cadence, setCadence] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  const activeProducts = useMemo(
    () => products?.filter((product) => product.status === "active") ?? [],
    [products],
  );
  const pausedProducts = useMemo(
    () => products?.filter((product) => product.status === "paused") ?? [],
    [products],
  );

  const openEditor = useCallback((product: TrackedProduct) => {
    setEditingProduct(product);
    setCadence(String(product.cadenceDays));
    setQuantity(
      product.defaultQuantity === undefined
        ? ""
        : String(product.defaultQuantity),
    );
    setUnit(product.defaultUnit ?? "");
    setCategory(product.category ?? "");
    setFormError(null);
    requestAnimationFrame(() => editorSheetRef.current?.expand());
  }, []);

  const closeEditor = useCallback(() => {
    if (isSaving) return;
    editorSheetRef.current?.close();
  }, [isSaving]);

  const handleEditorClosed = useCallback(() => {
    setEditingProduct(null);
    setFormError(null);
  }, []);

  const saveChanges = useCallback(async () => {
    if (!editingProduct) return;
    const cadenceDays = Number(cadence);
    const defaultQuantity = quantity.trim() ? Number(quantity) : null;
    if (!Number.isInteger(cadenceDays) || cadenceDays < 1 || cadenceDays > 180) {
      setFormError("Choose a cadence between 1 and 180 days.");
      return;
    }
    if (
      defaultQuantity !== null &&
      (!Number.isFinite(defaultQuantity) || defaultQuantity <= 0)
    ) {
      setFormError("Quantity must be greater than zero, or left blank.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await updateProduct({
        householdProductId: editingProduct._id,
        cadenceDays,
        defaultQuantity,
        defaultUnit: unit.trim() || null,
        category: category.trim() || null,
      });
      await recalculateReminders({});

      const changedFields = [
        cadenceDays !== editingProduct.cadenceDays && "cadence",
        defaultQuantity !== (editingProduct.defaultQuantity ?? null) &&
          "quantity",
        (unit.trim() || null) !== (editingProduct.defaultUnit ?? null) && "unit",
        (category.trim() || null) !== (editingProduct.category ?? null) &&
          "category",
      ].filter((field): field is string => Boolean(field));
      changedFields.forEach((field) =>
        analytics.track("tracked product corrected", {
          household_id: household?._id,
          market: household?.marketCountryCode,
          field,
        }),
      );

      editorSheetRef.current?.close();
      setShowSavedToast(true);
    } catch (error) {
      console.error("Couldn't update the tracked product:", error);
      setFormError("We couldn't save those changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [
    analytics,
    cadence,
    category,
    editingProduct,
    household?._id,
    household?.marketCountryCode,
    quantity,
    recalculateReminders,
    unit,
    updateProduct,
  ]);

  const toggleTracking = useCallback(async () => {
    if (!editingProduct) return;
    const status = editingProduct.status === "active" ? "paused" : "active";
    setIsSaving(true);
    setFormError(null);
    try {
      await updateProduct({
        householdProductId: editingProduct._id,
        status,
      });
      await recalculateReminders({});
      analytics.track("tracked product corrected", {
        household_id: household?._id,
        market: household?.marketCountryCode,
        field: "status",
      });
      editorSheetRef.current?.close();
      setShowSavedToast(true);
    } catch (error) {
      console.error("Couldn't change product tracking:", error);
      setFormError("We couldn't change tracking. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [
    analytics,
    editingProduct,
    household?._id,
    household?.marketCountryCode,
    recalculateReminders,
    updateProduct,
  ]);

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={["top"]}>
      <PageHeader title="Tracked products" onBack={() => router.back()} />

      {products === undefined ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={themeColors.coral} />
          <Text className="mt-3 text-ink-secondary">
            Loading your grocery rhythm…
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6"
          contentContainerClassName="pb-12 pt-4"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-3xl font-bold tracking-tight text-ink">
            Your grocery rhythm
          </Text>
          <Text className="mt-2 text-base leading-6 text-ink-secondary">
            Adjust when an item comes back for review, or pause anything you no
            longer want us to remember.
          </Text>

          {products.length === 0 ? (
            <View className="mt-10 items-center rounded-2xl border border-separator bg-surface px-6 py-10">
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-coral-soft">
                <SlidersHorizontal size={28} color={themeColors.coral} />
              </View>
              <Text className="mt-4 text-center text-xl font-bold text-ink">
                Nothing is being tracked yet
              </Text>
              <Text className="mt-2 text-center leading-6 text-ink-secondary">
                Products you choose during a restock setup will appear here.
              </Text>
            </View>
          ) : (
            <>
              <ProductSection
                title="Active"
                products={activeProducts}
                onPress={openEditor}
              />
              {pausedProducts.length > 0 && (
                <ProductSection
                  title="Paused"
                  products={pausedProducts}
                  onPress={openEditor}
                  paused
                />
              )}
            </>
          )}
        </ScrollView>
      )}

      <GlassBottomSheet
        ref={editorSheetRef}
        index={-1}
        snapPoints={["88%"]}
        dismissible={!isSaving}
        onClose={handleEditorClosed}
      >
        <GlassBottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-semibold uppercase tracking-wide text-coral">
                Tracked product
              </Text>
              <Text className="mt-1 text-2xl font-bold text-ink">
                {editingProduct?.displayName ?? "Edit product"}
              </Text>
            </View>
            <Pressable
              onPress={closeEditor}
              className="h-11 w-11 items-center justify-center rounded-full bg-warm-gray-100 active:opacity-70"
              accessibilityLabel="Close product editor"
              accessibilityRole="button"
            >
              <X size={20} color={themeColors.secondaryInk} />
            </Pressable>
          </View>
          <Text className="text-2xl font-bold text-ink">Review timing</Text>
          <Text className="mt-2 leading-6 text-ink-secondary">
            This is a reminder rhythm, not a claim that the product has run out.
          </Text>

          <View className="mt-6 rounded-2xl border border-separator bg-surface p-4">
            <Input
              label="Usually needed every (days)"
              value={cadence}
              onChangeText={setCadence}
              keyboardType="number-pad"
              placeholder="e.g. 7"
            />
            <Input
              label="Usual quantity (optional)"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              placeholder="e.g. 2"
            />
            <Input
              label="Unit (optional)"
              value={unit}
              onChangeText={setUnit}
              placeholder="e.g. litres"
              autoCapitalize="none"
            />
            <Input
              label="Category (optional)"
              value={category}
              onChangeText={setCategory}
              placeholder="e.g. Dairy"
              containerClassName="mb-0"
            />
          </View>

          {editingProduct && (
            <Text className="mt-3 text-sm leading-5 text-ink-secondary">
              {editingProduct.purchaseObservationCount === 0
                ? "No completed-shop history yet. Your chosen timing is the starting point."
                : `${editingProduct.purchaseObservationCount} completed ${
                    editingProduct.purchaseObservationCount === 1
                      ? "shop supports"
                      : "shops support"
                  } this rhythm.`}
            </Text>
          )}

          {formError && (
            <Text
              className="mt-4 text-sm leading-5 text-red-700"
              accessibilityRole="alert"
            >
              {formError}
            </Text>
          )}

          <Button
            onPress={() => void saveChanges()}
            loading={isSaving}
            disabled={isSaving}
            className="mt-6 w-full"
          >
            Save changes
          </Button>
          <Button
            variant={
              editingProduct?.status === "active" ? "tonal" : "secondary"
            }
            onPress={() => void toggleTracking()}
            disabled={isSaving}
            className="mt-3 w-full"
            accessibilityLabel={
              editingProduct?.status === "active"
                ? "Pause product tracking"
                : "Resume product tracking"
            }
          >
            {editingProduct?.status === "active" ? (
              <Pause size={18} color={themeColors.coral} />
            ) : (
              <Play size={18} color={themeColors.surface} />
            )}
            <Text
              className={`ml-2 font-semibold ${
                editingProduct?.status === "active"
                  ? "text-coral"
                  : "text-white"
              }`}
            >
              {editingProduct?.status === "active"
                ? "Pause tracking"
                : "Resume tracking"}
            </Text>
          </Button>
        </GlassBottomSheetScrollView>
      </GlassBottomSheet>

      <Toast
        visible={showSavedToast}
        message="Product rhythm updated"
        onDismiss={() => setShowSavedToast(false)}
      />
    </SafeAreaView>
  );
}

function ProductSection({
  title,
  products,
  onPress,
  paused = false,
}: {
  title: string;
  products: TrackedProduct[];
  onPress: (product: TrackedProduct) => void;
  paused?: boolean;
}) {
  if (products.length === 0) return null;

  return (
    <View className="mt-7">
      <Text className="mb-2 text-base font-semibold text-ink">{title}</Text>
      <View className="overflow-hidden rounded-2xl border border-separator bg-surface">
        {products.map((product, index) => (
          <Pressable
            key={product._id}
            onPress={() => onPress(product)}
            className={`min-h-20 flex-row items-center px-4 py-3 active:bg-warm-gray-50 ${
              index > 0 ? "border-t border-separator" : ""
            }`}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${product.displayName}, every ${product.cadenceDays} days${
              paused ? ", tracking paused" : ""
            }`}
          >
            <View
              className={`h-11 w-11 items-center justify-center rounded-xl ${
                paused ? "bg-warm-gray-100" : "bg-teal-soft"
              }`}
            >
              <PackageCheck
                size={21}
                color={paused ? themeColors.secondaryInk : themeColors.teal}
              />
            </View>
            <View className="ml-3 flex-1 pr-3">
              <View className="flex-row items-center">
                <Text
                  className={`flex-shrink text-base font-semibold ${
                    paused ? "text-ink-secondary" : "text-ink"
                  }`}
                  numberOfLines={1}
                >
                  {product.displayName}
                </Text>
                {paused && (
                  <View className="ml-2 rounded-full bg-warm-gray-100 px-2 py-0.5">
                    <Text className="text-xs font-semibold text-ink-secondary">
                      Paused
                    </Text>
                  </View>
                )}
              </View>
              <Text className="mt-0.5 text-sm text-ink-secondary">
                Every {product.cadenceDays} days · {productAmount(product)}
              </Text>
            </View>
            <ChevronRight size={20} color={themeColors.secondaryInk} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
