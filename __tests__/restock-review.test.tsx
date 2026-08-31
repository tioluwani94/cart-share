import React, { type ReactNode } from "react";
import type { PressableProps } from "react-native";
import TestRenderer, {
  act,
  type ReactTestRenderer,
} from "react-test-renderer";

import RestockReviewScreen from "../app/restock-review";

const mockReplace = jest.fn();
const mockTrack = jest.fn();
const mockMakeDecision = jest.fn();

const mockReview = {
  activeList: null,
  candidateCount: 1,
  trackedProductCount: 1,
  household: {
    locale: "en-GB",
    marketCountryCode: "GB",
    planningTimeZone: "Europe/London",
  },
  candidates: [
    {
      householdProductId: "product_1",
      displayName: "Milk",
      cadenceDays: 7,
      expectedDueAt: Date.UTC(2026, 8, 5),
      isAdded: false,
    },
  ],
};

jest.mock("@/components/ui", () => {
  const { Pressable, Text } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
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
  useRouter: () => ({ back: jest.fn(), replace: mockReplace }),
}));

jest.mock("lucide-react-native", () => {
  const { View } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  const Icon = () => <View />;
  return new Proxy({}, { get: () => Icon });
});

describe("RestockReviewScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

});
