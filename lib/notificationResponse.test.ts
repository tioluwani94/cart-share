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
  it.each(["restock_review"] as const)(
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
  it("opens the scheduled shop rather than starting a restock review", () => {
    const response = parseRestockNotificationResponse({
      identifier: "scheduled-shop",
      data: { url: "ourpantry://restock-review", kind: "shop_reminder" },
    })!;
    expect(getNotificationDestination(response.kind, response.identifier)).toBe("/(tabs)/shop");
  });
  it("routes learning notifications to the household memory review", () => {
    expect(getNotificationDestination("product_learning")).toBe(
      "/(tabs)/pantry?focus=learning&source=notification",
    );
  });
});

describe("household activity notification entry", () => {
  it.each(["list_activity", "shop_completed"] as const)("validates recipient and household for %s", (kind) => {
    const data = { url: "ourpantry://household-activity", kind, listId: "list1", householdId: "household1", recipientClerkId: "clerk1" };
    const response = parseRestockNotificationResponse({ identifier: "delivery1", data });
    expect(response).toEqual({ identifier: "delivery1", kind, listId: "list1", householdId: "household1", recipientClerkId: "clerk1" });
    expect(parseRestockNotificationResponse({ identifier: "delivery1", data: { ...data, recipientClerkId: undefined } })).toBeNull();
    expect(parseRestockNotificationResponse({ identifier: "delivery1", data: { ...data, listId: "../settings" } })).toBeNull();
    expect(getNotificationDestination(kind, "delivery1", "list1")).toBe(kind === "list_activity" ? "/list/list1" : "/(tabs)/analytics");
  });
});
