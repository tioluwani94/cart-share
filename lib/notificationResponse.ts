export type NotificationKind =
  | "restock_review"
  | "shop_reminder"
  | "product_learning"
  | "list_activity"
  | "shop_completed";

export interface RestockNotificationResponse {
  identifier: string;
  kind: NotificationKind;
  listId?: string;
  householdId?: string;
  recipientClerkId?: string;
}

export function getNotificationDestination(
  kind: NotificationKind,
  identifier?: string,
  listId?: string,
): string {
  if (kind === "list_activity")
    return listId ? `/list/${encodeURIComponent(listId)}` : "/(tabs)/shop";
  if (kind === "shop_completed") return "/(tabs)/analytics";
  return kind === "product_learning"
    ? "/(tabs)/pantry?focus=learning&source=notification"
    : `/(tabs)?source=notification${identifier ? `&notificationId=${encodeURIComponent(identifier)}` : ""}`;
}

export function parseRestockNotificationResponse({
  data,
  identifier,
}: {
  data: Record<string, unknown>;
  identifier: string;
}): RestockNotificationResponse | null {
  if (
    data.url === "ourpantry://household-activity" &&
    (data.kind === "list_activity" || data.kind === "shop_completed") &&
    typeof data.listId === "string" &&
    /^[a-zA-Z0-9_-]+$/.test(data.listId) &&
    typeof data.householdId === "string" &&
    data.householdId.length > 0 &&
    typeof data.recipientClerkId === "string" &&
    data.recipientClerkId.length > 0
  ) {
    return {
      identifier,
      kind: data.kind,
      listId: data.listId,
      householdId: data.householdId,
      recipientClerkId: data.recipientClerkId,
    };
  }
  if (
    data.url === "ourpantry://restock-review" &&
    (data.kind === "restock_review" || data.kind === "shop_reminder")
  ) {
    return { identifier, kind: data.kind };
  }
  if (
    (data.url === "ourpantry://pantry?focus=learning&source=notification" ||
      data.url ===
        "ourpantry://tracked-products?focus=learning&source=notification") &&
    data.kind === "product_learning"
  ) {
    return { identifier, kind: data.kind };
  }
  return null;
}
