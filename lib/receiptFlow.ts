import type { Id } from "@/convex/_generated/dataModel";

export function getReceiptCaptureRoute(listId: Id<"lists">) {
  return {
    pathname: "/scan-receipt",
    params: { listId },
  } as const;
}
