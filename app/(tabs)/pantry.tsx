import groceryRhythmArtwork from "@/assets/empty-states/grocery-rhythm.png";
import {
  CollapsibleTabHeader,
  TabLargeTitle,
  useCollapsibleHeader,
} from "@/components/navigation/CollapsibleTabHeader";
import {
  Button,
  EmptyStateCard,
  GlassBottomSheet,
  GlassBottomSheetScrollView,
  GlassSheetHeader,
  type GlassBottomSheetRef,
  Input,
  UserAvatar,
  useToast,
} from "@/components/ui";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAnalytics } from "@/lib/AnalyticsContext";
import { cn } from "@/lib/cn";
import { PantryShelf } from "@/components/pantry/PantryShelf";
import { PantrySearchInput, type PantrySearchInputRef } from "@/components/pantry/PantrySearchInput";
import { PantryShopAction } from "@/components/pantry/PantryShopAction";
import {
  buildPantryShelves,
  type PantryFilter,
  type PantryShelf as PantryShelfData,
} from "@/lib/pantryCatalogue";
import { useCachedRestockReview } from "@/lib/useCachedRestockReview";
import { usePantryScrollReset } from "@/lib/usePantryScrollReset";
import {
  dismissKeyboardForOutsideTouch,
  keyboardDismissScrollProps,
} from "@/lib/keyboard";
import { themeColors } from "@/lib/theme";
import { getLearningProductCopy } from "@/lib/trackedProducts";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useUser } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import {
  Pause,
  Play,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList,
) as typeof FlashList;

interface TrackedProduct {
  _id: Id<"householdProducts">;
  displayName: string;
  category?: string;
  defaultQuantity?: number;
  defaultUnit?: string;
  cadenceDays: number;
  purchaseObservationCount: number;
  status: "learning" | "active" | "paused";
}

export default function PantryScreen() {
  const router = useRouter();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { onScroll, scrollY } = useCollapsibleHeader();
  const { focus, source } = useLocalSearchParams<{
    focus?: string;
    source?: string;
  }>();
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

  const [search, setSearch] = useState("");
  const searchInputRef = useRef<PantrySearchInputRef>(null);
  const pantryListRef =
    useRef<FlashListRef<PantryShelfData<TrackedProduct>>>(null);
  const { resetScroll, onCommitLayoutEffect } =
    usePantryScrollReset(pantryListRef);
  const [filter, setFilter] = useState<PantryFilter>(
    focus === "learning" ? "learning" : "all",
  );
  const { data: review } = useCachedRestockReview(user?.id, household?._id);
  useEffect(() => {
    if (focus === "learning") setFilter("learning");
  }, [focus]);
  const shelves = useMemo(
    () => buildPantryShelves(products ?? [], filter, search),
    [products, filter, search],
  );
  const learningProductCount = useMemo(
    () =>
      products?.filter((product) => product.status === "learning").length ?? 0,
    [products],
  );
  const possibleRegularCount = useMemo(
    () =>
      products?.filter(
        (product) =>
          product.status === "learning" &&
          product.purchaseObservationCount >= 2,
      ).length ?? 0,
    [products],
  );
  const pausedProductCount = useMemo(
    () =>
      products?.filter((product) => product.status === "paused").length ?? 0,
    [products],
  );

  const openEditor = useCallback((product: TrackedProduct) => {
    Keyboard.dismiss();
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

  const saveChanges = useCallback(
    async (nextStatus?: "active" | "paused") => {
      if (!editingProduct) return;
      Keyboard.dismiss();
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
          status: nextStatus,
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
        if (editingProduct.status === "learning" && nextStatus) {
          analytics.track("possible regular reviewed", {
            household_id: household?._id,
            market: household?.marketCountryCode,
            decision: nextStatus === "active" ? "track" : "not_regular",
            source:
              source === "notification"
                ? "notification"
                : source === "plan"
                  ? "plan"
                  : "tracked_products",
          });
        }

        editorSheetRef.current?.dismiss();
        showToast({
          message:
            nextStatus === "active"
              ? "Product added to your restock rhythm"
              : nextStatus === "paused"
                ? "Marked as not a regular"
                : "Product rhythm updated",
          tone: "success",
        });
      } catch (error) {
        console.error("Couldn't update the tracked product:", error);
        setFormError("We couldn't save those changes. Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [
      analytics,
      cadence,
      category,
      editingProduct,
      household?._id,
      household?.marketCountryCode,
      quantity,
      recalculateReminders,
      showToast,
      source,
      unit,
      updateProduct,
    ],
  );

  const setTrackingStatus = useCallback(
    async (status: "active" | "paused") => {
      if (!editingProduct) return;
      Keyboard.dismiss();
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
        showToast({
          message:
            status === "active"
              ? "Product added to your restock rhythm"
              : editingProduct.status === "learning"
                ? "Marked as not a regular"
                : "Product tracking paused",
          tone: "success",
        });
      } catch (error) {
        console.error("Couldn't change product tracking:", error);
        setFormError("We couldn't change tracking. Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [
      analytics,
      editingProduct,
      household?._id,
      household?.marketCountryCode,
      recalculateReminders,
      showToast,
      updateProduct,
    ],
  );

  const toggleTracking = useCallback(() => {
    if (!editingProduct) return;
    void setTrackingStatus(
      editingProduct.status === "active" ? "paused" : "active",
    );
  }, [editingProduct, setTrackingStatus]);

  return (
    <View
      className="flex-1 bg-background-light"
      onStartShouldSetResponderCapture={dismissKeyboardForOutsideTouch}
    >
      {products === undefined ? (
        <View
          className="flex-1"
          style={{ paddingTop: insets.top, paddingBottom: tabBarHeight }}
        >
          <TabLargeTitle
            title="Pantry"
            subtitle="Your household's grocery rhythm"
            scrollY={scrollY}
          />
          <View className="flex-1 items-center justify-center pb-20">
            <ActivityIndicator size="large" color={themeColors.coral} />
            <Text className="mt-3 text-ink-secondary">
              Loading your grocery rhythm…
            </Text>
          </View>
        </View>
      ) : (
        <AnimatedFlashList
          {...keyboardDismissScrollProps}
          ref={pantryListRef}
          maintainVisibleContentPosition={{ disabled: true }}
          onCommitLayoutEffect={onCommitLayoutEffect}
          data={shelves}
          keyExtractor={(row) => row.key}
          contentContainerStyle={{
            paddingTop: insets.top,
            paddingBottom: tabBarHeight + 24,
          }}
          scrollIndicatorInsets={{
            top: insets.top + 56,
            bottom: tabBarHeight,
          }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <TabLargeTitle
                title="Pantry"
                subtitle="Your household's grocery rhythm"
                scrollY={scrollY}
              />
              <View className="px-6">
                <PantrySearchInput
                  ref={searchInputRef}
                  onChangeText={setSearch}
                  onClear={resetScroll}
                />
                <ScrollView
                  horizontal
                  {...keyboardDismissScrollProps}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
                >
                  {(["all", "learning", "paused"] as const).map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => {
                        Keyboard.dismiss();
                        resetScroll();
                        setFilter(value);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: filter === value }}
                      className={cn(
                        "min-h-12 items-center justify-center rounded-full px-4 py-2",
                        filter === value ? "bg-ink" : "bg-warm-gray-100",
                      )}
                    >
                      <Text
                        className={cn(
                          "text-sm font-semibold",
                          filter === value
                            ? "text-white"
                            : "text-ink-secondary",
                        )}
                      >
                        {value === "all"
                          ? "All shelves"
                          : value === "learning"
                            ? `Learning · ${learningProductCount}`
                            : `Paused · ${pausedProductCount}`}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {learningProductCount > 0 && filter !== "paused" && (
                  <View className="mb-5 flex-row rounded-2xl bg-yellow/10 p-4">
                    <Sparkles size={20} color={themeColors.warningInk} />
                    <Text className="ml-3 flex-1 text-sm leading-5 text-ink-secondary">
                      {focus === "learning" && possibleRegularCount > 0
                        ? "Review the regulars noticed in your completed shops. Reminders start only when you choose to track them."
                        : "Learning products only become reminders after you choose to track them."}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View className="px-6">
              <EmptyStateCard
                variant="surface"
                title={
                  products.length === 0
                    ? "Your pantry is ready to learn"
                    : "No products here"
                }
                description={
                  products.length === 0
                    ? "Choose the regular products your household wants OurPantry to remember."
                    : "Try another name, or show all your shelves."
                }
                artworkSource={
                  products.length === 0 ? groceryRhythmArtwork : undefined
                }
                actionLabel={
                  products.length === 0 ? "Choose products" : "Show all shelves"
                }
                onAction={() => {
                  Keyboard.dismiss();
                  if (products.length === 0)
                    router.push("/choose-regulars?from=pantry" as Href);
                  else {
                    resetScroll();
                    searchInputRef.current?.clear();
                    setFilter("all");
                  }
                }}
                className="mt-4"
              />
            </View>
          }
          ListFooterComponent={
            products.length > 0 ? (
              <View className="px-6">
                <Text className="mt-5 text-center text-xs leading-5 text-ink-secondary">
                  Completed shops help your pantry learn. This is a memory of
                  what you buy, not a count of what's left.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <PantryShelf shelf={item} onPress={openEditor} />
          )}
        />
      )}

      <CollapsibleTabHeader
        title="Pantry"
        scrollY={scrollY}
        rightAction={
          <UserAvatar
            name={user?.fullName ?? "You"}
            imageUrl={user?.imageUrl}
            size={48}
            showTooltip={false}
            onPress={() => router.push("/settings" as Href)}
            accessibilityLabel="Open settings"
          />
        }
      />

      <PantryShopAction
        product={editingProduct}
        listId={review?.activeList?._id}
        householdId={household?._id}
        disabled={isSaving}
      >
        {(shopAction) => (
          <GlassBottomSheet
            ref={editorSheetRef}
            snapPoints={["88%"]}
            dismissible={!isSaving}
            onDismiss={handleEditorClosed}
          >
            <GlassBottomSheetScrollView
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingBottom: 40,
              }}
            >
              <GlassSheetHeader
                title={editingProduct?.displayName ?? "Edit product"}
                description={
                  editingProduct?.status === "learning"
                    ? "OurPantry noticed this in completed shops. Confirm it before it joins your restock reminders."
                    : "Adjust reminder timing and defaults. This rhythm is a reminder, not a claim that the product has run out."
                }
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

              {shopAction}
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
                  {editingProduct.status === "learning"
                    ? getLearningProductCopy(
                        editingProduct.purchaseObservationCount,
                      ).detail
                    : editingProduct.purchaseObservationCount === 0
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

              {editingProduct?.status === "learning" ? (
                <>
                  <Button
                    onPress={() => void saveChanges("active")}
                    loading={isSaving}
                    disabled={isSaving}
                    className="mt-6 w-full"
                    accessibilityLabel={`Track ${editingProduct.displayName} as a regular product`}
                  >
                    Track this product
                  </Button>
                  <Button
                    variant="tonal"
                    onPress={() => void saveChanges("paused")}
                    disabled={isSaving}
                    className="mt-3 w-full"
                    accessibilityLabel={`Mark ${editingProduct.displayName} as not a regular product`}
                  >
                    Not a regular
                  </Button>
                </>
              ) : (
                <>
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
                      editingProduct?.status === "active"
                        ? "tonal"
                        : "secondary"
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
                </>
              )}
            </GlassBottomSheetScrollView>
          </GlassBottomSheet>
        )}
      </PantryShopAction>
    </View>
  );
}
