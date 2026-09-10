import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import PlanScreen from "../app/(tabs)/index";

let mockFocused = true;
let mockParams: { source?: string; notificationId?: string } = {};
const mockTrack = jest.fn();
const mockScrollTo = jest.fn();
const mockActions = jest.fn();
const mockHiddenIds = new Set();
const mockRouter = {
  push: jest.fn(),
  navigate: jest.fn(),
  setParams: jest.fn((params) => {
    mockParams = { ...mockParams, ...params };
  }),
};
const mockReviewData = {
  household: { _id: "house", marketCountryCode: "GB" },
  activeList: { _id: "list", name: "Next shop" },
  candidates: [{ householdProductId: "milk", isAdded: false }],
};
let mockReview: typeof mockReviewData | undefined = mockReviewData;
let mockReviewFromCache = false;
let mockOnline = true;

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));
jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => mockFocused,
}));
jest.mock("@react-navigation/bottom-tabs", () => ({
  useBottomTabBarHeight: () => 60,
}));
jest.mock("@clerk/expo", () => ({ useUser: () => ({ user: { id: "user" } }) }));
jest.mock("convex/react", () => ({ useMutation: () => jest.fn() }));
jest.mock("@/lib/AnalyticsContext", () => ({
  useAnalytics: () => ({ track: mockTrack }),
}));
jest.mock("@/lib/useCachedQuery", () => ({
  useCachedHousehold: () => ({ data: { _id: "house" } }),
  useCachedLists: () => ({ data: [], isFromCache: false, isLoading: false }),
}));
jest.mock("@/lib/useCachedRestockReview", () => ({
  useCachedRestockReview: () => ({
    data: mockReview,
    isOnline: mockOnline,
    isFromCache: mockReviewFromCache,
  }),
}));
jest.mock("@/lib/useRestockDecisionActions", () => ({
  useRestockDecisionActions: (options: unknown) => {
    mockActions(options);
    return {
      hiddenProductIds: mockHiddenIds,
      error: null,
      makeDecision: jest.fn(),
      undoDecision: jest.fn(),
    };
  },
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: jest.requireActual("react-native").View,
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("react-native-reanimated", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: {
      ScrollView: React.forwardRef(function MockScrollView(
        props: object,
        ref: React.Ref<unknown>,
      ) {
        React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
        return <View {...props} />;
      }),
    },
  };
});
jest.mock("@/components/navigation/CollapsibleTabHeader", () => ({
  CollapsibleTabHeader: () => null,
  TabLargeTitle: () => null,
  useCollapsibleHeader: () => ({ onScroll: jest.fn(), scrollY: 0 }),
}));
jest.mock("@/components/lists", () => ({ CreateListSheet: () => null }));
jest.mock("@/components/ui", () => ({ UserAvatar: () => null }));
jest.mock("@/components/restocks/NextShopChooser", () => ({
  NextShopChooser: () => null,
}));
jest.mock("@/components/restocks/NextShopCard", () => ({
  NextShopCard: () => null,
}));
jest.mock("@/components/restocks/OtherPlansSection", () => ({
  OtherPlansSection: () => null,
}));
jest.mock("@/components/restocks/NextShopScheduleSheet", () => ({
  NextShopScheduleSheet: () => null,
}));
jest.mock("@/components/restocks/QuickCheckSection", () => ({
  QuickCheckSection: (props: object) => {
    const { View } = jest.requireActual("react-native");
    return <View testID="quick-check" {...props} />;
  },
}));

describe("Plan notification landing", () => {
  let tree: ReactTestRenderer;
  beforeEach(() => {
    jest.clearAllMocks();
    mockFocused = true;
    mockParams = {};
    mockReview = mockReviewData;
    mockReviewFromCache = false;
    mockOnline = true;
  });
  afterEach(() => {
    act(() => tree?.unmount());
  });
  const mount = () =>
    act(() => {
      tree = TestRenderer.create(<PlanScreen />);
    });
  const refresh = () => act(() => tree.update(<PlanScreen />));
  const check = () => tree.root.findByProps({ testID: "quick-check" });
  const notify = (notificationId: string) => {
    mockParams = { source: "notification", notificationId };
    refresh();
  };

  it("handles a cold notification after review data arrives", () => {
    mockParams = { source: "notification", notificationId: "first" };
    mockReview = undefined;
    mount();
    expect(mockTrack).not.toHaveBeenCalled();
    mockReview = mockReviewData;
    refresh();
    expect(check().props.fromNotification).toBe(true);
    expect(mockActions).toHaveBeenLastCalledWith(
      expect.objectContaining({ source: "notification", enableUndo: true }),
    );
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      "restock review shown",
      expect.objectContaining({
        source: "notification",
        candidate_count_bucket: "1-3",
      }),
    );
  });

  it("opens regular selection directly from the new-household action", () => {
    mount();
    act(() => (check().props.onChooseRegulars as () => void)());
    expect(mockRouter.push).toHaveBeenCalledWith("/choose-regulars?from=plan");
  });

  it("starts a fresh check and scrolls to it for each notification while Plan is already open", () => {
    mount();
    const normalCheck = check();
    notify("first");
    const firstCheck = check();
    expect(firstCheck).not.toBe(normalCheck);
    expect(firstCheck.props.fromNotification).toBe(true);
    notify("second");
    expect(check()).not.toBe(firstCheck);
    expect(mockScrollTo).toHaveBeenCalledTimes(2);
    expect(mockTrack.mock.calls.map((call) => call[1].source)).toEqual([
      "plan",
      "notification",
      "notification",
    ]);
  });

  it("consumes route parameters and stops notification attribution after leaving Plan", () => {
    mockParams = { source: "notification", notificationId: "first" };
    mount();
    expect(mockParams.source).toBeUndefined();
    mockFocused = false;
    refresh();
    mockFocused = true;
    refresh();
    expect(check().props.fromNotification).toBe(false);
    expect(mockActions).toHaveBeenLastCalledWith(
      expect.objectContaining({ source: "plan" }),
    );
    expect(mockTrack.mock.calls.map((call) => call[1].source)).toEqual([
      "notification",
      "plan",
    ]);
  });

  it("waits for current data before tracking the review and ignores later rerenders", () => {
    mockParams = { source: "notification", notificationId: "first" };
    mockReviewFromCache = true;
    mount();
    expect(mockTrack).not.toHaveBeenCalled();
    expect(check().props.isReviewFromCache).toBe(true);
    mockReviewFromCache = false;
    mockReview = { ...mockReviewData, candidates: [] };
    refresh();
    refresh();
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      "restock review shown",
      expect.objectContaining({
        candidate_count_bucket: "0",
        source: "notification",
      }),
    );
  });

  it("keeps offline review decisions and notification attribution available", () => {
    mockOnline = false;
    mockReviewFromCache = true;
    mockParams = { source: "notification", notificationId: "offline" };
    mount();
    expect(check().props.isOnline).toBe(false);
    expect(check().props.fromNotification).toBe(true);
    expect(mockActions).toHaveBeenLastCalledWith(
      expect.objectContaining({ source: "notification" }),
    );
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });
});
