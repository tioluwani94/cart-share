import { Button, useToast } from "@/components/ui";
import type { Id } from "@/convex/_generated/dataModel";
import { normalizePantryLabel } from "@/lib/pantryCatalogue";
import { useShoppingList } from "@/lib/useShoppingList";
import { useRef, useState, type ReactNode } from "react";
import { Keyboard, Text, View } from "react-native";

interface PantryShopActionProps {
  listId?: Id<"lists">;
  householdId?: Id<"households">;
  product: {
    displayName: string;
    defaultQuantity?: number;
    defaultUnit?: string;
    category?: string;
  } | null;
  disabled?: boolean;
  children: (action: ReactNode) => ReactNode;
}

/** Resolve account/offline/toast hooks outside Gorhom's root portal host. */
export function PantryShopAction(props: PantryShopActionProps) {
  if (!props.listId || !props.householdId) return props.children(null);
  return (
    <ConnectedPantryShopAction
      {...props}
      listId={props.listId}
      householdId={props.householdId}
    />
  );
}

function ConnectedPantryShopAction({
  listId,
  householdId,
  product,
  disabled,
  children,
}: PantryShopActionProps & {
  listId: Id<"lists">;
  householdId: Id<"households">;
}) {
  const { items, addItem, removeItem, isLoading, hasQueuedCompletion } =
    useShoppingList(listId, householdId);
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const matches =
    items?.filter(
      (item) =>
        normalizePantryLabel(item.name) ===
        normalizePantryLabel(product?.displayName ?? ""),
    ) ?? [];
  const existing =
    matches.length === 1 && !matches[0].isCompleted ? matches[0] : undefined;
  const ambiguous = matches.length > 0 && !existing;
  async function toggleShop() {
    if (
      !product ||
      lock.current ||
      disabled ||
      isLoading ||
      hasQueuedCompletion ||
      ambiguous
    )
      return;
    Keyboard.dismiss();
    lock.current = true;
    setBusy(true);
    try {
      if (existing) await removeItem(existing._id);
      else
        await addItem(product.displayName, {
          quantity: product.defaultQuantity,
          unit: product.defaultUnit,
          category: product.category,
        });
      showToast({
        message: existing
          ? "Removed from your next shop"
          : "Added to your next shop",
        tone: "success",
      });
    } catch {
      showToast({
        message: "Couldn't update your shop. Please try again.",
        tone: "error",
      });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!product) return children(null);
  return children(
    <View className="mt-5">
      <Button
        variant="tonal"
        onPress={toggleShop}
        loading={busy}
        disabled={
          disabled || busy || isLoading || hasQueuedCompletion || ambiguous
        }
        accessibilityLabel={
          ambiguous
            ? `${product.displayName} is already on your shop`
            : `${existing ? "Remove" : "Add"} ${product.displayName} ${existing ? "from" : "to"} your next shop`
        }
      >
        {matches.length
          ? existing
            ? "Remove from next shop"
            : "Already on your shop"
          : "Add to next shop"}
      </Button>
      {hasQueuedCompletion && (
        <Text className="mt-2 text-sm text-ink-secondary">
          Your shop is finishing. You can add products after it syncs.
        </Text>
      )}
    </View>,
  );
}
