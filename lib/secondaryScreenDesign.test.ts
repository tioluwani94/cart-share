import fs from "node:fs";

function readSource(path: string) {
  return fs.readFileSync(path, "utf8");
}

describe("secondary screen design system", () => {
  it("keeps Pantry data controllers outside the sheet portal and has no redundant Shop CTA", () => {
    const pantry = readSource("app/(tabs)/pantry.tsx");
    expect(pantry.indexOf("<PantryShopAction")).toBeLessThan(pantry.indexOf("<GlassBottomSheet\n"));
    expect(pantry).not.toContain("Shop for something new");
    expect(pantry).toContain('variant="surface"');
    expect(pantry).toContain("useQuery(api.restocks.listProducts)");
  });
  it("uses the shared progressive page header on secondary routes", () => {
    const receipt = readSource("app/receipt-confirm.tsx");
    const restockReview = readSource("app/restock-review.tsx");
    const listDetail = readSource("app/list/[id].tsx");
    const pageHeader = readSource("components/ui/PageHeader.tsx");

    expect(receipt).toContain("<PageHeader");
    expect(restockReview).toContain("<PageHeader");
    expect(listDetail).toContain("<PageHeader");
    expect(pageHeader).toContain("<ProgressiveBlurEdge");
    expect(pageHeader).toContain('position: "absolute"');
  });

  it("uses the shared progress and sheet hierarchy on list details", () => {
    const listDetail = readSource("app/list/[id].tsx");
    const pantry = readSource("app/(tabs)/pantry.tsx");
    const legacyTrackedProducts = readSource("app/tracked-products.tsx");

    expect(listDetail).toContain("<ProgressBar");
    expect(listDetail).toContain("<GlassSheetHeader");
    expect(pantry).toContain("<GlassSheetHeader");
    expect(pantry).toContain("<TabLargeTitle");
    expect(pantry).toContain("<CollapsibleTabHeader");
    expect(legacyTrackedProducts).toContain("/(tabs)/pantry");
    expect(legacyTrackedProducts).toContain("<Redirect");
    expect(listDetail).toContain("PAGE_HEADER_CONTENT_CLEARANCE = 24");
    expect(listDetail).toContain('density="compact"');
    expect(listDetail).not.toContain(
      'variant="embedded"\n              className="py-12"',
    );
  });

  it("keeps chart labels inside a measured y-axis gutter", () => {
    const chart = readSource("components/analytics/SpendingChart.tsx");

    expect(chart).toContain("width: PADDING_LEFT - 4");
    expect(chart).toContain("const PADDING_RIGHT = 12");
    expect(chart).toContain("const BAR_WIDTH = 32");
    expect(chart).toContain("const CHART_HEADROOM_FACTOR = 1.08");
    expect(chart).toContain("item.totalPence === 0 ? 0");
    expect(chart).toContain("const squareBaseAnimatedProps");
    expect(chart).toContain("Math.min(animatedHeight.get(), CORNER_RADIUS)");
    expect(chart).not.toContain("Math.max(barHeight, 4)");
  });

  it("uses restrained, reduced-motion-aware list creation feedback", () => {
    const createListSheet = readSource("components/lists/CreateListSheet.tsx");
    const success = readSource("components/lists/SuccessCelebration.tsx");

    expect(createListSheet).toContain("SUCCESS_DWELL_MS = 1200");
    expect(createListSheet).toContain("<GlassBottomSheetView");
    expect(success).toContain("useReducedMotion");
    expect(success).toContain("ReduceMotion.System");
    expect(success).toContain("Easing.bezier(0.23, 1, 0.32, 1)");
    expect(success).not.toContain("badgeScale = useSharedValue(0)");
    expect(success).not.toMatch(/duration\(400\)/);
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
    expect(camera).toContain(
      "paddingTop: pageHeaderHeight + CAMERA_HEADER_CLEARANCE",
    );
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

  it("keeps completion feedback restrained and reduced-motion aware", () => {
    const completion = readSource("components/lists/CompletionCelebration.tsx");

    expect(completion).toContain("useReducedMotion");
    expect(completion).toContain("ReduceMotion.System");
    expect(completion).toContain("Easing.bezier(0.23, 1, 0.32, 1)");
    expect(completion).not.toContain("ConfettiParticle");
    expect(completion).not.toContain("withRepeat");
    expect(completion).not.toMatch(/[🎉✨🎊💫🌟⭐🥳🎈]/u);
  });

  it("uses calm upload and partner activity motion", () => {
    const upload = readSource("components/ui/UploadProgressRing.tsx");
    const partnerActivity = readSource(
      "components/lists/PartnerActivityToast.tsx",
    );

    expect(upload).toContain("useReducedMotion");
    expect(upload).toContain("useState(0)");
    expect(upload).not.toContain("pulseScale");
    expect(upload).not.toContain("withRepeat");
    expect(partnerActivity).toContain("useReducedMotion");
    expect(partnerActivity).toContain("PAGE_HEADER_ROW_HEIGHT");
    expect(partnerActivity).not.toContain("expo-haptics");
    expect(partnerActivity).not.toContain("withSpring");
    expect(partnerActivity).not.toContain("FadeIn");
  });

  it("keeps list-card motion direct and velocity aware", () => {
    const listCard = readSource("components/lists/ListCard.tsx");

    expect(listCard).toContain("VELOCITY_PROJECTION_SECONDS");
    expect(listCard).toContain("event.velocityX");
    expect(listCard).toContain("ReduceMotion.System");
    expect(listCard).toContain("EDGE_RESISTANCE");
    expect(listCard).not.toContain("FadeInDown");
    expect(listCard).not.toContain("index * 100");
  });

  it("centers status chips below the bounded pantry shelf artwork", () => {
    const shelf = readSource("components/pantry/PantryShelf.tsx");
    expect(shelf).toContain("min-h-6 items-center justify-center");
    expect(shelf).toContain("overflow-hidden rounded-t-[70px]");
    expect(shelf).toContain('contentFit="contain"');
    expect(shelf).toContain("useReducedMotion");
    expect(shelf).not.toContain("entering=");
  });
});
