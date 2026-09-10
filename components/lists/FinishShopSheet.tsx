import { forwardRef } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Camera, Check, PoundSterling, Receipt } from "lucide-react-native";
import { useRouter } from "expo-router";
import {
  GlassBottomSheet,
  GlassBottomSheetScrollView,
  GlassSheetHeader,
  type GlassBottomSheetRef,
} from "@/components/ui";
import type { Id } from "@/convex/_generated/dataModel";
import {
  getManualReceiptEntryRoute,
  getReceiptCaptureRoute,
} from "@/lib/receiptFlow";
import { themeColors } from "@/lib/theme";

interface FinishShopSheetProps {
  listId: Id<"lists">;
  completedCount: number;
  totalCount: number;
  canFinish: boolean;
  canScanReceipt: boolean;
  isFinishing: boolean;
  finishUnavailableMessage: string | null;
  finishError: string | null;
  onClose: () => void;
  onFinishWithoutReceipt: () => Promise<void>;
}

/** One finish flow for the Next shop and every other shopping list. */
export const FinishShopSheet = forwardRef<
  GlassBottomSheetRef,
  FinishShopSheetProps
>(function FinishShopSheet(
  {
    listId,
    completedCount,
    totalCount,
    canFinish,
    canScanReceipt,
    isFinishing,
    finishUnavailableMessage,
    finishError,
    onClose,
    onFinishWithoutReceipt,
  },
  ref,
) {
  const router = useRouter();
  return (
    <GlassBottomSheet ref={ref} snapPoints={["72%"]} dismissible={!isFinishing}>
      <GlassBottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 40,
          paddingTop: 8,
        }}
      >
        <GlassSheetHeader
          title="Finish this shop"
          description={
            canScanReceipt
              ? "Add what you spent, or skip it for now. Your list stays available until the trip saves."
              : "Adding spend needs a connection. You can finish without it and sync later."
          }
          icon={<Check size={21} color={themeColors.coral} strokeWidth={2.5} />}
          onClose={() => onClose()}
          closeDisabled={isFinishing}
          closeAccessibilityLabel="Close finish shop options"
        />

        <View className="-mt-1 flex-row items-center">
          <Text className="font-heading text-lg text-ink">
            {completedCount}
          </Text>
          <Text className="ml-1 text-sm font-semibold text-ink-secondary">
            purchased
          </Text>
          <View className="mx-3 h-1 w-1 rounded-full bg-warm-gray-400" />
          <Text className="font-heading text-lg text-ink">
            {Math.max(0, totalCount - completedCount)}
          </Text>
          <Text className="ml-1 text-sm font-semibold text-ink-secondary">
            left
          </Text>
        </View>

        <Pressable
          onPress={() => {
            onClose();
            router.push(getReceiptCaptureRoute(listId));
          }}
          disabled={!canScanReceipt}
          pressRetentionOffset={12}
          className="mt-5 min-h-20 flex-row items-center rounded-2xl border border-white/25 bg-coral p-4 active:opacity-90 disabled:opacity-50"
          accessibilityLabel="Scan a receipt"
          accessibilityRole="button"
        >
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-white/20">
            <Camera size={22} color={themeColors.surface} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-white">Scan receipt</Text>
            <Text className="mt-0.5 text-sm text-white/80">
              Check the total before saving
            </Text>
          </View>
        </Pressable>

        <Text className="mb-2 mt-5 text-[15px] font-semibold leading-5 text-ink">
          Other ways to finish
        </Text>
        <View className="overflow-hidden rounded-2xl border border-separator bg-surface">
          <Pressable
            onPress={() => {
              onClose();
              router.push(getManualReceiptEntryRoute(listId));
            }}
            disabled={!canScanReceipt}
            pressRetentionOffset={12}
            className="min-h-20 flex-row items-center px-4 py-3 active:bg-white/45 disabled:opacity-50"
            accessibilityLabel="Enter shopping total"
            accessibilityHint="Opens a form to add the total, store, and payment source"
            accessibilityRole="button"
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-teal-soft">
              <PoundSterling size={22} color={themeColors.teal} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-ink">
                Enter total
              </Text>
              <Text className="mt-0.5 text-sm text-ink-secondary">
                Add spend without taking a photo
              </Text>
            </View>
          </Pressable>

          <View className="mx-4 h-px bg-separator" />

          <Pressable
            onPress={() => void onFinishWithoutReceipt()}
            disabled={!canFinish}
            pressRetentionOffset={12}
            className="min-h-20 flex-row items-center px-4 py-3 active:bg-white/45 disabled:opacity-50"
            accessibilityLabel="Finish without a receipt"
            accessibilityRole="button"
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-warm-gray-100">
              {isFinishing ? (
                <ActivityIndicator color={themeColors.secondaryInk} />
              ) : (
                <Receipt size={22} color={themeColors.secondaryInk} />
              )}
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-ink">
                Skip for now
              </Text>
              <Text className="mt-0.5 text-sm text-ink-secondary">
                Save the trip without financial details
              </Text>
            </View>
          </Pressable>
        </View>

        <Text className="mt-5 text-sm leading-5 text-ink-secondary">
          We'll use purchased recurring products to prepare the next shop.
        </Text>

        {finishUnavailableMessage && (
          <Text className="mt-3 text-sm text-yellow-800">
            {finishUnavailableMessage}
          </Text>
        )}
        {finishError && (
          <Text className="mt-3 text-sm text-red-600">{finishError}</Text>
        )}
      </GlassBottomSheetScrollView>
    </GlassBottomSheet>
  );
});
