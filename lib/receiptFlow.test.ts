import type { Id } from "@/convex/_generated/dataModel";
import {
  buildReceiptSessionInput,
  getInitialReceiptScreenState,
  getManualReceiptEntryRoute,
  getReceiptCaptureRoute,
} from "./receiptFlow";

describe("receipt capture flow", () => {
  it("keeps the originating list ID in the camera route", () => {
    const listId = "list_123" as Id<"lists">;

    expect(getReceiptCaptureRoute(listId)).toEqual({
      pathname: "/scan-receipt",
      params: { listId },
    });
  });

  it("opens direct total entry for the originating list", () => {
    const listId = "list_123" as Id<"lists">;

    expect(getManualReceiptEntryRoute(listId)).toEqual({
      pathname: "/receipt-confirm",
      params: { entry: "manual", listId },
    });
    expect(getInitialReceiptScreenState("manual")).toBe("manual_entry");
    expect(getInitialReceiptScreenState(undefined)).toBe("uploading");
  });

  it("builds a linked session with an optional, normalised store", () => {
    const householdId = "household_123" as Id<"households">;
    const listId = "list_123" as Id<"lists">;
    const payerId = "user_123" as Id<"users">;
    const receiptUploadId = "receipt_123" as Id<"receiptUploads">;

    expect(
      buildReceiptSessionInput({
        householdId,
        listId,
        paidBy: payerId,
        receiptUploadId,
        storeName: "  Tesco Extra  ",
        totalPence: 4567,
      }),
    ).toEqual({
      householdId,
      listId,
      paidBy: payerId,
      receiptUploadId,
      storeName: "Tesco Extra",
      totalAmount: 4567,
    });

    expect(
      buildReceiptSessionInput({
        householdId,
        storeName: "   ",
      }),
    ).toEqual({
      householdId,
      listId: undefined,
      paidBy: undefined,
      receiptUploadId: undefined,
      storeName: undefined,
      totalAmount: undefined,
    });
  });
});
