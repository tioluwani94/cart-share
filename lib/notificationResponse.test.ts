import { parseRestockNotificationResponse } from "./notificationResponse";

describe("parseRestockNotificationResponse", () => {
  it.each(["restock_review", "shop_reminder"] as const)(
    "accepts the private restock deep link for %s",
    (kind) => {
      expect(
        parseRestockNotificationResponse({
          identifier: "notification_1",
          data: { url: "cartshare://restock-review", kind },
        }),
      ).toEqual({ identifier: "notification_1", kind });
    },
  );

  it("rejects a reminder without a kind", () => {
    expect(
      parseRestockNotificationResponse({
        identifier: "notification_2",
        data: { url: "cartshare://restock-review" },
      }),
    ).toBeNull();
  });

  it("ignores unknown URLs and kinds", () => {
    expect(
      parseRestockNotificationResponse({
        identifier: "notification_3",
        data: { url: "cartshare://settings", kind: "restock_review" },
      }),
    ).toBeNull();
    expect(
      parseRestockNotificationResponse({
        identifier: "notification_4",
        data: { url: "cartshare://restock-review", kind: "other" },
      }),
    ).toBeNull();
  });
});
