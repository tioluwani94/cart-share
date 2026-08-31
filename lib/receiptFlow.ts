import type { Id } from "@/convex/_generated/dataModel";
import type { ScreenState } from "@/types";

type PaymentSource = "joint" | Id<"users">;

interface ReceiptSessionInput {
  householdId: Id<"households">;
  totalAmount?: number;
  storeName?: string;
  listId?: Id<"lists">;
  receiptUploadId?: Id<"receiptUploads">;
  paidBy?: PaymentSource;
}

export function getReceiptCaptureRoute(listId: Id<"lists">) {
  return {
    pathname: "/scan-receipt",
    params: { listId },
  } as const;
}

export function getManualReceiptEntryRoute(listId: Id<"lists">) {
  return {
    pathname: "/receipt-confirm",
    params: { entry: "manual", listId },
  } as const;
}

export function getInitialReceiptScreenState(
  entry: string | undefined,
): ScreenState {
  return entry === "manual" ? "manual_entry" : "uploading";
}

export function buildReceiptSessionInput({
  householdId,
  listId,
  paidBy,
  receiptUploadId,
  storeName,
  totalPence,
}: {
  householdId: Id<"households">;
  listId?: Id<"lists">;
  paidBy?: PaymentSource;
  receiptUploadId?: Id<"receiptUploads">;
  storeName: string;
  totalPence?: number;
}): ReceiptSessionInput {
  const normalisedStoreName = storeName.trim();
  return {
    householdId,
    totalAmount:
      totalPence === undefined ? undefined : Math.round(totalPence),
    storeName: normalisedStoreName || undefined,
    listId,
    receiptUploadId,
    paidBy,
  };
}
