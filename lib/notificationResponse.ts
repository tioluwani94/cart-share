export type NotificationKind = "restock_review" | "shop_reminder";

export interface RestockNotificationResponse {
  identifier: string;
  kind: NotificationKind;
}

export function parseRestockNotificationResponse({
  data,
  identifier,
}: {
  data: Record<string, unknown>;
  identifier: string;
}): RestockNotificationResponse | null {
  if (data.url !== "cartshare://restock-review") return null;
  if (data.kind !== "restock_review" && data.kind !== "shop_reminder") {
    return null;
  }
  return { identifier, kind: data.kind };
}
