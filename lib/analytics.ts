export type AnalyticsConsent = "granted" | "denied" | undefined;

type CommonProperties = {
  household_id?: string;
  market?: string;
  platform?: string;
  app_version?: string;
};

export interface AnalyticsEvents {
  "activation started": CommonProperties;
  "activation completed": CommonProperties & {
    household_size_bucket: string;
    cadence_bucket: string;
    shopping_mode: string;
  };
  "activation skipped": CommonProperties & { step: string };
  "notification permission answered": CommonProperties & {
    answer: "granted" | "denied" | "provisional";
  };
  "restock review shown": CommonProperties & {
    candidate_count_bucket: string;
    source: "plan" | "notification";
  };
  "restock decision made": CommonProperties & {
    decision: "add" | "still_have_some" | "not_this_time" | "stop_tracking";
    source: "plan" | "notification";
  };
  "shopping item added": CommonProperties & { source: "manual" | "restock" };
  "shop started": CommonProperties & { mode: "physical" | "online" };
  "shop completed": CommonProperties & {
    item_count_bucket: string;
    total_present: boolean;
    receipt_present: boolean;
  };
  "receipt attached": CommonProperties & { source: "camera" | "library" };
  "notification scheduled": CommonProperties & {
    kind: "restock_review" | "shop_reminder";
  };
  "notification sent": CommonProperties & {
    kind: "restock_review" | "shop_reminder";
    delivery_result: "accepted" | "failed";
  };
  "notification opened": CommonProperties & {
    kind: "restock_review" | "shop_reminder";
  };
  "tracked product corrected": CommonProperties & { field: string };
}

export interface AnalyticsAdapter {
  capture(event: string, properties: Record<string, unknown>): void;
  identify(userId: string, properties: Record<string, unknown>): void;
  reset(): void;
  optIn(): void;
  optOut(): void;
  flush?(): Promise<void>;
}

const commonPropertyNames = [
  "household_id",
  "market",
  "platform",
  "app_version",
] as const;

const eventPropertyNames: {
  [EventName in keyof AnalyticsEvents]: readonly string[];
} = {
  "activation started": commonPropertyNames,
  "activation completed": [
    ...commonPropertyNames,
    "household_size_bucket",
    "cadence_bucket",
    "shopping_mode",
  ],
  "activation skipped": [...commonPropertyNames, "step"],
  "notification permission answered": [...commonPropertyNames, "answer"],
  "restock review shown": [
    ...commonPropertyNames,
    "candidate_count_bucket",
    "source",
  ],
  "restock decision made": [
    ...commonPropertyNames,
    "decision",
    "source",
  ],
  "shopping item added": [...commonPropertyNames, "source"],
  "shop started": [...commonPropertyNames, "mode"],
  "shop completed": [
    ...commonPropertyNames,
    "item_count_bucket",
    "total_present",
    "receipt_present",
  ],
  "receipt attached": [...commonPropertyNames, "source"],
  "notification scheduled": [...commonPropertyNames, "kind"],
  "notification sent": [
    ...commonPropertyNames,
    "kind",
    "delivery_result",
  ],
  "notification opened": [...commonPropertyNames, "kind"],
  "tracked product corrected": [...commonPropertyNames, "field"],
};

function assertAllowedProperties(
  event: keyof AnalyticsEvents,
  properties: Record<string, unknown>,
): void {
  const allowed = new Set(eventPropertyNames[event]);
  const prohibited = Object.keys(properties).filter((key) => !allowed.has(key));
  if (prohibited.length > 0) {
    throw new Error(
      `Analytics event ${event} contains prohibited properties: ${prohibited.join(", ")}`,
    );
  }
}

export function createAnalytics(adapter: AnalyticsAdapter) {
  let consent: AnalyticsConsent;

  return {
    getConsent(): AnalyticsConsent {
      return consent;
    },
    setConsent(nextConsent: Exclude<AnalyticsConsent, undefined>): void {
      consent = nextConsent;
      if (nextConsent === "granted") adapter.optIn();
      else adapter.optOut();
    },
    identify(userId: string, householdId: string): void {
      if (consent !== "granted") return;
      adapter.identify(userId, { household_id: householdId });
    },
    track<EventName extends keyof AnalyticsEvents>(
      event: EventName,
      properties: AnalyticsEvents[EventName],
    ): void {
      assertAllowedProperties(event, properties);
      if (consent !== "granted") return;
      adapter.capture(event, properties);
    },
    async reset(): Promise<void> {
      if (consent === "granted") await adapter.flush?.();
      adapter.reset();
      adapter.optOut();
      consent = undefined;
    },
  };
}

export type Analytics = ReturnType<typeof createAnalytics>;
