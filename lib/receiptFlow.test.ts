import type { Id } from "@/convex/_generated/dataModel";
import { getReceiptCaptureRoute } from "./receiptFlow";

describe("receipt capture flow", () => {
  it("keeps the originating list ID in the camera route", () => {
    const listId = "list_123" as Id<"lists">;

    expect(getReceiptCaptureRoute(listId)).toEqual({
      pathname: "/scan-receipt",
      params: { listId },
    });
  });
});
