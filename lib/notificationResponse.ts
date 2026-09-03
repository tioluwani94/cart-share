export type NotificationKind =
  | "restock_review"
  | "shop_reminder"
  | "product_learning";

export interface RestockNotificationResponse {
  identifier: string;
  kind: NotificationKind;
}

export function getNotificationDestination(kind: NotificationKind): string {
  return kind === "product_learning"
    ? "/tracked-products?focus=learning&source=notification"
    : "/restock-review?source=notification";
}

export function parseRestockNotificationResponse({
  data,
  identifier,
}: {
  data: Record<string, unknown>;
  identifier: string;
}): RestockNotificationResponse | null {
  if (
    data.url === "ourpantry://restock-review" &&
    (data.kind === "restock_review" || data.kind === "shop_reminder")
  ) {
    return { identifier, kind: data.kind };
  }
  if (
    data.url ===
      "ourpantry://tracked-products?focus=learning&source=notification" &&
    data.kind === "product_learning"
  ) {
    return { identifier, kind: data.kind };
  }
  return null;
}
