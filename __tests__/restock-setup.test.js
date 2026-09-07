import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import RestockSetupScreen from "../app/restock-setup";
import { pantryArtwork } from "../lib/pantryArtwork";

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View } = require("react-native");
  const transition = {
    duration: () => transition,
    easing: () => transition,
    withInitialValues: () => transition,
  };

  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component) => Component,
    },
    cubicBezier: () => jest.fn(),
    Easing: { bezier: () => jest.fn() },
    FadeIn: transition,
    FadeInLeft: transition,
    FadeInRight: transition,
    ZoomIn: transition,
    useAnimatedStyle: (factory) => factory(),
    useReducedMotion: () => false,
    useSharedValue: (initialValue) => {
      const value = React.useRef(initialValue);
      return React.useMemo(
        () => ({
          get: () => value.current,
          set: (nextValue) => {
            value.current = nextValue;
          },
        }),
        [value],
      );
    },
    withTiming: (value) => value,
  };
});

const mockReplace = jest.fn();
const mockCompleteSetup = jest.fn();
const mockCreateList = jest.fn();
const mockUpdatePreferences = jest.fn();
const mockRegisterDevice = jest.fn();
const mockRecalculateReminders = jest.fn();
const mockAnalytics = {
  setConsent: jest.fn(),
  track: jest.fn(),
};

jest.mock("@/convex/_generated/api", () => ({
  api: {
    households: { getCurrentHousehold: "getCurrentHousehold" },
    lists: { getByHousehold: "getLists", create: "createList" },
    restocks: {
      getActivationSuggestions: "getActivationSuggestions",
      completeSetup: "completeSetup",
    },
    notifications: {
      updatePreferences: "updatePreferences",
      registerDevice: "registerDevice",
      recalculateForHousehold: "recalculateForHousehold",
    },
  },
}));

jest.mock("convex/react", () => ({
  useQuery: (query) => {
    if (query === "getCurrentHousehold") {
      return { _id: "household_1" };
    }
    if (query === "getLists") {
      return [{ _id: "list_1", name: "Weekly shop", totalItems: 3 }];
    }
    if (query === "getActivationSuggestions") return [];
    return undefined;
  },
  useMutation: (mutation) => {
    if (mutation === "completeSetup") return mockCompleteSetup;
    if (mutation === "createList") return mockCreateList;
    if (mutation === "updatePreferences") return mockUpdatePreferences;
    if (mutation === "registerDevice") return mockRegisterDevice;
    if (mutation === "recalculateForHousehold") {
      return mockRecalculateReminders;
    }
    return jest.fn();
  },
}));

jest.mock("@/components/ui", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  return {
    Button: ({ children, onPress, accessibilityLabel, ...props }) => (
      <Pressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        {...props}
      >
        {typeof children === "string" ? <Text>{children}</Text> : children}
      </Pressable>
    ),
    GlassSegmentedControl: () => <View />,
    ProgressBar: ({
      value,
      max,
      min = 0,
      accessibilityLabel,
      accessibilityText,
    }) => (
      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min,
          max,
          now: value,
          ...(accessibilityText ? { text: accessibilityText } : {}),
        }}
      />
    ),
  };
});

jest.mock("@/lib/AnalyticsContext", () => ({
  useAnalytics: () => mockAnalytics,
}));

jest.mock("@/lib/pushNotifications", () => ({
  registerForPushNotifications: jest.fn(),
}));

jest.mock("expo-localization", () => ({
  getCalendars: () => [{ timeZone: "Europe/London" }],
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaView: ({ children, ...props }) => (
      <View {...props}>{children}</View>
    ),
    useSafeAreaInsets: () => ({ top: 59, right: 0, bottom: 34, left: 0 }),
  };
});

jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Icon = () => <View />;
  return {
    Bell: Icon,
    Check: Icon,
    ChevronLeft: Icon,
    Minus: Icon,
    Plus: Icon,
    ShieldCheck: Icon,
  };
});

function getSetupProgress(renderer) {
  return renderer.root
    .findAllByProps({ accessibilityLabel: "Setup progress" })
    .find((node) => node.props.accessibilityValue);
}

describe("RestockSetupScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompleteSetup.mockResolvedValue({ success: true });
    mockUpdatePreferences.mockResolvedValue({ success: true });
  });

  it("uses catalogue images with top-right checkboxes and preserves selected products", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<RestockSetupScreen />);
    });
    for (let step = 0; step < 3; step += 1) {
      await act(async () =>
        renderer.root
          .findByProps({ accessibilityLabel: "Continue setup" })
          .props.onPress(),
      );
    }
    const milkImage = renderer.root.findByProps({
      testID: "activation-product-artwork-Milk",
    });
    expect(milkImage.props.source).toBe(pantryArtwork.milk.source);
    expect(milkImage.props.contentFit).toBe("contain");
    expect(milkImage.props.accessible).toBe(false);
    expect(
      renderer.root.findByProps({
        testID: "activation-product-artwork-Toilet roll",
      }).props.source,
    ).toBe(pantryArtwork.fallback.source);
    const checkbox = renderer.root.findByProps({
      testID: "activation-product-checkbox-Milk",
    });
    expect(checkbox.props.className).toContain("absolute right-3 top-3");
    expect(checkbox.props.pointerEvents).toBe("none");
    const milk = () =>
      renderer.root.findByProps({ accessibilityLabel: "Milk" });
    expect(milk().props.accessibilityRole).toBe("checkbox");
    expect(milk().props.accessibilityState.checked).toBe(false);
    await act(async () => milk().props.onPress());
    expect(milk().props.accessibilityState.checked).toBe(true);
    await act(async () => milk().props.onPress());
    expect(milk().props.accessibilityState.checked).toBe(false);
    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Bread" })
        .props.onPress(),
    );
    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Go back one setup step" })
        .props.onPress(),
    );
    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Continue setup" })
        .props.onPress(),
    );
    expect(
      renderer.root.findByProps({ accessibilityLabel: "Bread" }).props
        .accessibilityState.checked,
    ).toBe(true);
    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: "Build my grocery plan" })
        .props.onPress(),
    );
    expect(mockCompleteSetup.mock.calls[0][0].products).toEqual([
      expect.objectContaining({
        displayName: "Bread",
        category: "Bakery",
        cadenceDays: 7,
      }),
    ]);
    act(() => renderer.unmount());
  });

  it("keeps activation focused without a skip action and puts back in the header", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<RestockSetupScreen />);
    });

    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: "Set up grocery rhythm later",
      }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: "Go back one setup step",
      }),
    ).toHaveLength(0);

    await act(async () => {
      renderer.root
        .findByProps({ accessibilityLabel: "Continue setup" })
        .props.onPress();
    });

    const back = renderer.root.findByProps({
      accessibilityLabel: "Go back one setup step",
    });
    await act(async () => {
      back.props.onPress();
    });

    expect(getSetupProgress(renderer).props.accessibilityValue.now).toBe(1);
  });

  it("presents one short setup question at a time with progress", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<RestockSetupScreen />);
    });

    expect(getSetupProgress(renderer).props).toEqual(
      expect.objectContaining({
        accessibilityValue: { min: 1, max: 4, now: 1, text: "Step 1 of 4" },
      }),
    );
    expect(
      renderer.root.findAllByProps({ children: "Step 1 of 4" }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({
        children: "How many people do you shop for?",
      }),
    ).toBeTruthy();
    expect(() =>
      renderer.root.findByProps({ children: "Usual shopping cadence" }),
    ).toThrow();

    await act(async () => {
      renderer.root
        .findByProps({ accessibilityLabel: "Continue setup" })
        .props.onPress();
    });

    expect(
      renderer.root.findByProps({
        children: "How often is your main grocery shop?",
      }),
    ).toBeTruthy();
    expect(getSetupProgress(renderer).props.accessibilityValue.now).toBe(2);

    await act(async () => {
      renderer.root
        .findByProps({ accessibilityLabel: "Continue setup" })
        .props.onPress();
    });

    expect(
      renderer.root.findByProps({ accessibilityLabel: "In store" }).props
        .accessibilityState,
    ).toEqual({ selected: true });
    expect(
      renderer.root.findByProps({ accessibilityLabel: "Online" }).props
        .accessibilityRole,
    ).toBe("radio");
  });

  it("builds the plan without requesting notifications or deciding analytics consent", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<RestockSetupScreen />);
    });

    for (let index = 0; index < 3; index += 1) {
      await act(async () => {
        renderer.root
          .findByProps({ accessibilityLabel: "Continue setup" })
          .props.onPress();
      });
    }

    await act(async () => {
      await renderer.root
        .findByProps({ accessibilityLabel: "Build my grocery plan" })
        .props.onPress();
    });

    expect(mockCompleteSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        activeListId: "list_1",
        peopleServed: 2,
        shoppingCadenceDays: 7,
        preferredShoppingMode: "in_store",
      }),
    );
    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      notificationTimeZone: "Europe/London",
    });
    expect(mockUpdatePreferences).not.toHaveBeenCalledWith(
      expect.objectContaining({ analyticsConsent: expect.anything() }),
    );
    expect(mockRegisterDevice).not.toHaveBeenCalled();
    expect(mockAnalytics.setConsent).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/notification-setup",
      params: {
        cadence_bucket: "7_days",
        created_starter_list: "0",
        household_size_bucket: "1-2",
        origin: "activation",
        shopping_mode: "in_store",
      },
    });
  });
});
