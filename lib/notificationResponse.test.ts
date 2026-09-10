import {
  getNotificationDestination,
  parseRestockNotificationResponse,
} from "./notificationResponse";

describe("parseRestockNotificationResponse", () => {
  it.each(["restock_review", "shop_reminder"] as const)(
    "accepts the private restock deep link for %s",
    (kind) => {
      expect(
        parseRestockNotificationResponse({
          identifier: "notification_1",
          data: { url: "ourpantry://restock-review", kind },
        }),
      ).toEqual({ identifier: "notification_1", kind });
    },
  );

  it("opens possible regulars from a product-learning notification", () => {
    expect(
      parseRestockNotificationResponse({
        identifier: "notification_learning_1",
        data: {
          url: "ourpantry://pantry?focus=learning&source=notification",
          kind: "product_learning",
        },
      }),
    ).toEqual({
      identifier: "notification_learning_1",
      kind: "product_learning",
    });
  });

  it("keeps already-delivered tracked-products notifications compatible", () => {
    expect(
      parseRestockNotificationResponse({
        identifier: "notification_learning_legacy",
        data: {
          url: "ourpantry://tracked-products?focus=learning&source=notification",
          kind: "product_learning",
        },
      }),
    ).toEqual({
      identifier: "notification_learning_legacy",
      kind: "product_learning",
    });
  });

  it("rejects a reminder without a kind", () => {
    expect(
      parseRestockNotificationResponse({
        identifier: "notification_2",
        data: { url: "ourpantry://restock-review" },
      }),
    ).toBeNull();
  });

  it("ignores unknown URLs and kinds", () => {
    expect(
      parseRestockNotificationResponse({
        identifier: "notification_3",
        data: { url: "ourpantry://settings", kind: "restock_review" },
      }),
    ).toBeNull();
    expect(
      parseRestockNotificationResponse({
        identifier: "notification_4",
        data: { url: "ourpantry://restock-review", kind: "other" },
      }),
    ).toBeNull();
  });
});

describe("getNotificationDestination", () => {
  it.each(["restock_review", "shop_reminder"] as const)(
    "routes old %s notification payloads to Plan with an entry identifier",
    (kind) => {
      const response = parseRestockNotificationResponse({
        identifier: "delivery/1?",
        data: { url: "ourpantry://restock-review", kind },
      })!;
      expect(
        getNotificationDestination(response.kind, response.identifier),
      ).toBe("/(tabs)?source=notification&notificationId=delivery%2F1%3F");
      expect(getNotificationDestination(kind)).toBe(
        "/(tabs)?source=notification",
      );
    },
  );
  it("routes learning notifications to the household memory review", () => {
    expect(getNotificationDestination("product_learning")).toBe(
      "/(tabs)/pantry?focus=learning&source=notification",
    );
  });
});
