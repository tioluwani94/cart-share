import fs from "node:fs";

function readSource(path: string) {
  return fs.readFileSync(path, "utf8");
}

describe("secondary screen design system", () => {
  it("uses the shared page header on secondary routes", () => {
    const receipt = readSource("app/receipt-confirm.tsx");
    const restockReview = readSource("app/restock-review.tsx");
    const listDetail = readSource("app/list/[id].tsx");

    expect(receipt).toContain("<PageHeader");
    expect(restockReview).toContain("<PageHeader");
    expect(listDetail).toContain("<PageHeader");
  });

  it("uses the shared progress and sheet hierarchy on list details", () => {
    const listDetail = readSource("app/list/[id].tsx");
    const trackedProducts = readSource("app/tracked-products.tsx");

    expect(listDetail).toContain("<ProgressBar");
    expect(listDetail).toContain("<GlassSheetHeader");
    expect(trackedProducts).toContain("<GlassSheetHeader");
  });

  it("keeps secondary-state motion short and removes autonomous camera pulsing", () => {
    const receiptMotion = readSource(
      "components/receipt-confirm/receiptStateMotion.ts",
    );
    const camera = readSource("app/scan-receipt.tsx");

    expect(receiptMotion).toContain("FadeIn.duration(180)");
    expect(receiptMotion).toContain("Easing.bezier(0.23, 1, 0.32, 1)");
    expect(camera).not.toContain("guideFrameScale");
    expect(camera).not.toContain("guideFrameOpacity");
  });

  it("does not use emoji artwork on secondary task states", () => {
    const sources = [
      "app/+not-found.tsx",
      "app/list/[id].tsx",
      "components/receipt-confirm/OcrError.tsx",
      "components/receipt-confirm/ScanSuccess.tsx",
      "components/receipt-confirm/SessionSaved.tsx",
      "components/receipt-confirm/UploadError.tsx",
    ]
      .map(readSource)
      .join("\n");

    expect(sources).not.toMatch(/[🎉✨🎊💫🌟⭐🥳🛒📝🔍😅]/u);
  });
});
