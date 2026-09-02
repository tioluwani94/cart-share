import groceryRhythmArtwork from "@/assets/empty-states/grocery-rhythm.png";
import {
  Button,
  EmptyStateCard,
  GlassBottomSheet,
  GlassBottomSheetScrollView,
  GlassSheetHeader,
  type GlassBottomSheetRef,
  Input,
  PageHeader,
  usePageHeaderHeight,
  useToast,
} from "@/components/ui";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAnalytics } from "@/lib/AnalyticsContext";
import { cn } from "@/lib/cn";
import { keyboardDismissScrollProps } from "@/lib/keyboard";
import { themeColors } from "@/lib/theme";
import {
  buildTrackedProductRows,
  type TrackedProductRow,
} from "@/lib/trackedProducts";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  PackageCheck,
  Pause,
  Play,
  SlidersHorizontal,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
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
  const pageHeaderHeight = usePageHeaderHeight();
  const { showToast } = useToast();
  const analytics = useAnalytics();
  const household = useQuery(api.households.getCurrentHousehold);
  const products = useQuery(api.restocks.listProducts);
  const updateProduct = useMutation(api.restocks.updateProduct);
  const recalculateReminders = useMutation(
    api.notifications.recalculateForHousehold,
  );
  const editorSheetRef = useRef<GlassBottomSheetRef>(null);
  const [editingProduct, setEditingProduct] = useState<TrackedProduct | null>(
    null,
  );
  const [cadence, setCadence] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const productRows = useMemo(
    () => buildTrackedProductRows(products ?? []),
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
    requestAnimationFrame(() => editorSheetRef.current?.present());
  }, []);

  const closeEditor = useCallback(() => {
    if (isSaving) return;
    editorSheetRef.current?.dismiss();
  }, [isSaving]);

  const handleEditorClosed = useCallback(() => {
    setEditingProduct(null);
    setFormError(null);
  }, []);

  const saveChanges = useCallback(async () => {
    if (!editingProduct) return;
    const cadenceDays = Number(cadence);
    const defaultQuantity = quantity.trim() ? Number(quantity) : null;
    if (
      !Number.isInteger(cadenceDays) ||
      cadenceDays < 1 ||
      cadenceDays > 180
    ) {
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
        (unit.trim() || null) !== (editingProduct.defaultUnit ?? null) &&
          "unit",
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

      editorSheetRef.current?.dismiss();
      showToast({ message: "Product rhythm updated", tone: "success" });
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
    showToast,
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
      editorSheetRef.current?.dismiss();
      showToast({ message: "Product rhythm updated", tone: "success" });
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
    showToast,
    updateProduct,
  ]);

  return (
    <SafeAreaView
      className="flex-1 bg-background-light"
      edges={["left", "right", "bottom"]}
    >
      <PageHeader title="Tracked products" onBack={() => router.back()} />

      {products === undefined ? (
        <View
          className="flex-1 items-center justify-center"
          style={{ paddingTop: pageHeaderHeight }}
        >
          <ActivityIndicator size="large" color={themeColors.coral} />
          <Text className="mt-3 text-ink-secondary">
            Loading your grocery rhythm…
          </Text>
        </View>
      ) : (
        <FlashList
          {...keyboardDismissScrollProps}
          data={productRows}
          keyExtractor={(row) => row.key}
          getItemType={(row) => row.type}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: pageHeaderHeight + 16,
            paddingBottom: 48,
          }}
          scrollIndicatorInsets={{ top: pageHeaderHeight }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <Text className="text-3xl font-heading tracking-tight text-ink">
                Your grocery rhythm
              </Text>
              <Text className="mt-2 text-base leading-6 text-ink-secondary">
                Adjust when an item comes back for review, or pause anything you
                no longer want us to remember.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyStateCard
              title="Nothing is being tracked yet"
              description="Products you choose during a restock setup will appear here."
              artworkSource={groceryRhythmArtwork}
              className="mt-10"
            />
          }
          renderItem={({ item: row }) => {
            if (row.type === "section") {
              return (
                <Text className="mb-2 mt-7 text-base font-semibold text-ink">
                  {row.title}
                </Text>
              );
            }

            return <TrackedProductListItem row={row} onPress={openEditor} />;
          }}
        />
      )}

      <GlassBottomSheet
        ref={editorSheetRef}
        snapPoints={["88%"]}
        dismissible={!isSaving}
        onDismiss={handleEditorClosed}
      >
        <GlassBottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        >
          <GlassSheetHeader
            title={editingProduct?.displayName ?? "Edit product"}
            description="Adjust reminder timing and defaults. This rhythm is a reminder, not a claim that the product has run out."
            icon={
              <SlidersHorizontal
                size={21}
                color={themeColors.coral}
                strokeWidth={2}
              />
            }
            onClose={closeEditor}
            closeDisabled={isSaving}
            closeAccessibilityLabel="Close product editor"
          />

          <View className="mt-6">
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

    </SafeAreaView>
  );
}

type TrackedProductItemRow = Extract<
  TrackedProductRow<TrackedProduct>,
  { type: "product" }
>;

function TrackedProductListItem({
  row,
  onPress,
}: {
  row: TrackedProductItemRow;
  onPress: (product: TrackedProduct) => void;
}) {
  const { firstInSection, lastInSection, paused, product } = row;

  return (
    <Pressable
      onPress={() => onPress(product)}
      className={cn(
        "min-h-20 flex-row items-center border-x border-t border-separator bg-surface px-4 py-3 active:bg-warm-gray-50",
        firstInSection && "rounded-t-2xl",
        lastInSection && "rounded-b-2xl border-b",
      )}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${product.displayName}, every ${product.cadenceDays} days${
        paused ? ", tracking paused" : ""
      }`}
    >
      <View
        className={cn(
          "h-11 w-11 items-center justify-center rounded-xl",
          paused ? "bg-warm-gray-100" : "bg-teal-soft",
        )}
      >
        <PackageCheck
          size={21}
          color={paused ? themeColors.secondaryInk : themeColors.teal}
        />
      </View>
      <View className="ml-3 min-w-0 flex-1 pr-3">
        <View className="flex-row items-start">
          <Text
            className={cn(
              "min-w-0 flex-1 text-base font-semibold",
              paused ? "text-ink-secondary" : "text-ink",
            )}
            numberOfLines={2}
          >
            {product.displayName}
          </Text>
          {paused && (
            <View className="ml-2 shrink-0 rounded-full bg-warm-gray-100 px-2 py-0.5">
              <Text className="text-xs font-semibold text-ink-secondary">
                Paused
              </Text>
            </View>
          )}
        </View>
        <Text
          className="mt-0.5 text-sm leading-5 text-ink-secondary"
          numberOfLines={2}
        >
          Every {product.cadenceDays} days · {productAmount(product)}
        </Text>
      </View>
      <ChevronRight size={20} color={themeColors.secondaryInk} />
    </Pressable>
  );
}
