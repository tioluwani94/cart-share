import fs from "node:fs";

function readSource(path: string) {
  return fs.readFileSync(path, "utf8");
}

describe("glass sheet composition", () => {
  it("uses one shared header hierarchy across list creation and shop finishing", () => {
    const createList = readSource("components/lists/CreateListSheet.tsx");
    const shop = readSource("components/lists/FinishShopSheet.tsx");

    expect(createList).toContain("<GlassSheetHeader");
    expect(shop).toContain("<GlassSheetHeader");
  });

  it("uses the shared hierarchy without reintroducing legacy summary cards", () => {
    const categoryChip = readSource("components/lists/CategoryChip.tsx");
    const shop = readSource("components/lists/FinishShopSheet.tsx");

    expect(categoryChip).toContain("border-separator bg-surface");
    expect(shop).toContain("Other ways to finish");
    expect(shop).not.toContain(
      'className="mt-4 flex-row rounded-2xl bg-warm-gray-100 px-4 py-3"',
    );
  });

  it("uses the shared header hierarchy across every ordinary task sheet", () => {
    const sources = [
      "components/lists/EditItemSheet.tsx",
      "components/lists/ArchiveConfirmDialog.tsx",
      "components/lists/HeaderMenu.tsx",
      "components/ui/UserAvatar.tsx",
      "app/settings.tsx",
    ].map(readSource);

    sources.forEach((source) => expect(source).toContain("<GlassSheetHeader"));
  });

  it("keeps glass as the only translucent layer behind ordinary controls", () => {
    const categoryChip = readSource("components/lists/CategoryChip.tsx");
    const editItem = readSource("components/lists/EditItemSheet.tsx");
    const finishShop = readSource("components/lists/FinishShopSheet.tsx");

    expect(categoryChip).not.toContain("useIsOnGlassSurface");
    expect(categoryChip).not.toContain("bg-white/30");
    expect(editItem).not.toContain("<TextInput");
    expect(finishShop).not.toContain("bg-white/30");
  });

  it("uses semantic icons rather than emoji in sheet confirmations", () => {
    const archive = readSource("components/lists/ArchiveConfirmDialog.tsx");

    expect(archive).not.toMatch(/[📦🗑️⚠️]/u);
    expect(archive).toContain('tone="danger"');
  });

  it("retains the dedicated dark stage for the receipt media viewer", () => {
    const receiptViewer = readSource(
      "components/analytics/ReceiptImageViewer.tsx",
    );

    expect(receiptViewer).toContain('surfaceVariant="solid-dark"');
    expect(receiptViewer).toContain("bg-black");
    expect(receiptViewer).not.toContain("bg-black/95");
  });
});
