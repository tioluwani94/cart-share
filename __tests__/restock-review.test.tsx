import React, { type ReactNode } from "react";
import type { PressableProps } from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import RestockReviewScreen from "../app/restock-review";

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockTrack = jest.fn();
const mockMakeDecision = jest.fn();
const mockFlashList = jest.fn();

const milkCandidate = {
  householdProductId: "product_1",
  displayName: "Milk",
  cadenceDays: 7,
  expectedDueAt: Date.UTC(2026, 8, 5),
  isAdded: false,
};
const mockReview = {
  activeList: null as null | { _id: string; name: string },
  candidateCount: 1,
  trackedProductCount: 1,
  household: {
    locale: "en-GB",
    marketCountryCode: "GB",
    planningTimeZone: "Europe/London",
  },
  candidates: [milkCandidate],
};

jest.mock("@shopify/flash-list", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  const renderOptionalComponent = (
    component: React.ElementType | ReactNode,
  ) => {
    if (!component) return null;
    return React.isValidElement(component)
      ? component
      : React.createElement(component as React.ElementType);
  };

  return {
    FlashList: (props: {
      data: typeof mockReview.candidates;
      renderItem: (input: {
        item: (typeof mockReview.candidates)[number];
        index: number;
      }) => ReactNode;
      ListHeaderComponent?: React.ElementType | ReactNode;
      ListEmptyComponent?: React.ElementType | ReactNode;
      ListFooterComponent?: React.ElementType | ReactNode;
    }) => {
      mockFlashList(props);
      return (
        <View>
          {renderOptionalComponent(props.ListHeaderComponent)}
          {props.data.length === 0
            ? renderOptionalComponent(props.ListEmptyComponent)
            : props.data.map((item, index) => (
                <React.Fragment key={item.householdProductId}>
                  {props.renderItem({ item, index })}
                </React.Fragment>
              ))}
          {renderOptionalComponent(props.ListFooterComponent)}
        </View>
      );
    },
  };
});

jest.mock("@/components/ui", () => {
  const { Pressable, Text } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    Button: ({
      children,
      ...props
    }: PressableProps & { children?: ReactNode }) => (
      <Pressable {...props}>
        {typeof children === "string" ? <Text>{children}</Text> : children}
      </Pressable>
    ),
  };
});

jest.mock("@/lib/AnalyticsContext", () => ({
  useAnalytics: () => ({ track: mockTrack }),
}));

jest.mock("@/lib/useCachedQuery", () => ({
  useCachedHousehold: () => ({ data: { _id: "household_1" } }),
}));

jest.mock("@/lib/useCachedRestockReview", () => ({
  useCachedRestockReview: () => ({ data: mockReview, isFromCache: false }),
}));

jest.mock("@/lib/useRestockDecisionActions", () => ({
  useRestockDecisionActions: () => ({
    error: null,
    hiddenProductIds: new Set(),
    makeDecision: mockMakeDecision,
    pendingProductIds: new Set(),
  }),
}));

jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ userId: "clerk_1" }),
}));

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => true,
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}));

jest.mock("lucide-react-native", () => {
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  const Icon = () => <View />;
  return new Proxy({}, { get: () => Icon });
});

describe("RestockReviewScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReview.activeList = null;
    mockReview.candidateCount = 1;
    mockReview.candidates = [{ ...milkCandidate }];
  });

  it("keeps Add unavailable when there is no Next shop", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<RestockReviewScreen />);
    });

    const add = renderer.root.findByProps({
      accessibilityLabel: "Choose a Next shop before adding Milk",
    });
    expect(add.props.disabled).toBe(true);
  });

  it("returns to Plan deterministically instead of relying on stack history", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<RestockReviewScreen />);
    });

    act(() => {
      const onPress = renderer.root.findByProps({
        accessibilityLabel: "Back to Plan",
      }).props.onPress as () => void;
      onPress();
    });

    expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("treats a product added by another member as resolved", () => {
    mockReview.activeList = {
      _id: "list_1",
      name: "Weekly shop",
    };
    mockReview.candidates[0].isAdded = true;
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<RestockReviewScreen />);
    });

    expect(
      renderer.root.findByProps({
        accessibilityLabel: "0 things need a quick check",
      }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ children: "Already in Next shop" }),
    ).toBeTruthy();
    expect(() =>
      renderer.root.findByProps({
        accessibilityLabel: "Milk already added to shop",
      }),
    ).toThrow();
    expect(mockTrack).toHaveBeenCalledWith("restock review shown", {
      candidate_count_bucket: "0",
      market: "GB",
      source: "plan",
    });

    act(() => {
      mockReview.candidates[0].isAdded = false;
      (
        renderer as ReactTestRenderer & {
          update: (element: React.ReactElement) => void;
        }
      ).update(<RestockReviewScreen />);
    });
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it("virtualizes a long household review without dropping candidates", () => {
    mockReview.activeList = {
      _id: "list_1",
      name: "Weekly shop",
    };
    mockReview.candidates = Array.from({ length: 12 }, (_, index) => ({
      ...milkCandidate,
      householdProductId: `product_${index}`,
      displayName: `Product ${index}`,
    }));
    mockReview.candidateCount = mockReview.candidates.length;

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<RestockReviewScreen />);
    });

    expect(mockFlashList).toHaveBeenCalledWith(
      expect.objectContaining({ data: mockReview.candidates }),
    );
    mockReview.candidates.forEach((candidate) => {
      expect(
        renderer.root.findByProps({
          accessibilityLabel: `Add ${candidate.displayName} to shop`,
        }),
      ).toBeTruthy();
    });
  });
});
