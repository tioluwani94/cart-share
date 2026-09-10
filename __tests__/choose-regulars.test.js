import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import ChooseRegularsScreen from "../app/choose-regulars";

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

let mockOnline = true;
let mockProducts = [];
let mockFrom = "plan";
const mockAdd = jest.fn();
const mockToast = jest.fn();
const mockRouter = {
  back: jest.fn(),
  canGoBack: () => true,
  replace: jest.fn(),
  dismissTo: jest.fn(),
};
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ from: mockFrom }),
}));
jest.mock("@/lib/useNetworkStatus", () => ({ useIsOnline: () => mockOnline }));
jest.mock("@/convex/_generated/api", () => ({
  api: {
    restocks: {
      listProducts: "products",
      getActivationSuggestions: "history",
      addRegulars: "add",
    },
  },
}));
jest.mock("convex/react", () => ({
  useQuery: (query, args) =>
    args === "skip" ? undefined : query === "products" ? mockProducts : [],
  useMutation: () => mockAdd,
}));
jest.mock("@/components/ui", () => {
  const React = require("react");
  const { View, Pressable, Text } = require("react-native");
  return {
    PageHeader: (props) => <View testID="header" {...props} />,
    usePageHeaderHeight: () => 110,
    useToast: () => ({ showToast: mockToast }),
    Button: ({ children, ...props }) => (
      <Pressable testID="save" {...props}>
        <Text>{children}</Text>
      </Pressable>
    ),
  };
});
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: require("react-native").View,
  useSafeAreaInsets: () => ({ top: 59, right: 0, bottom: 34, left: 0 }),
}));

describe("standalone regulars picker", () => {
  let tree;
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnline = true;
    mockProducts = [];
    mockFrom = "plan";
    mockAdd.mockResolvedValue({ addedCount: 1 });
  });
  afterEach(() => act(() => tree?.unmount()));
  const mount = () =>
    act(() => {
      tree = TestRenderer.create(<ChooseRegularsScreen />);
    });
  const card = (name) =>
    tree.root
      .findAllByProps({ accessibilityLabel: name })
      .find((node) => node.props.accessibilityRole === "checkbox");
  const save = () =>
    tree.root
      .findAllByProps({ testID: "save" })
      .find((node) => node.props.onPress);
  it("opens directly on the same product cards as activation and saves only selected regulars", async () => {
    mount();
    expect(save().props.disabled).toBe(true);
    expect(
      tree.root.findAllByProps({ accessibilityLabel: "Setup progress" }),
    ).toHaveLength(0);
    expect(
      tree.root.findAllByProps({ testID: "regulars-product-artwork-Milk" })
        .length,
    ).toBeGreaterThan(0);
    act(() => card("Milk").props.onPress());
    expect(card("Milk").props.accessibilityState.checked).toBe(true);
    await act(async () => save().props.onPress());
    expect(mockAdd).toHaveBeenCalledWith({
      products: [
        expect.objectContaining({ displayName: "Milk", cadenceDays: 7 }),
      ],
    });
    expect(mockRouter.dismissTo).toHaveBeenCalledWith("/(tabs)");
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: "1 regular added to Pantry" }),
    );
  });
  it("returns Pantry entrants to Pantry and allows leaving without saving", async () => {
    mockFrom = "pantry";
    mount();
    act(() => tree.root.findByProps({ testID: "header" }).props.onBack());
    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockAdd).not.toHaveBeenCalled();
    act(() => card("Bread").props.onPress());
    await act(async () => save().props.onPress());
    expect(mockRouter.dismissTo).toHaveBeenCalledWith("/(tabs)/pantry");
  });
  it("keeps selections after failure and prevents a duplicate in-flight save", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    let reject;
    mockAdd.mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    mount();
    act(() => card("Milk").props.onPress());
    act(() => {
      save().props.onPress();
      save().props.onPress();
    });
    expect(mockAdd).toHaveBeenCalledTimes(1);
    await act(async () => reject(new Error("failed")));
    expect(card("Milk").props.accessibilityState.checked).toBe(true);
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    await act(async () => save().props.onPress());
    expect(mockAdd).toHaveBeenCalledTimes(2);
    console.error.mockRestore();
  });
  it("disables existing tracked/paused products and never submits them", async () => {
    mockProducts = [
      { displayName: "Milk", status: "active" },
      { displayName: "Bread", status: "paused" },
    ];
    mount();
    expect(card("Milk").props.disabled).toBe(true);
    expect(card("Bread").props.disabled).toBe(true);
    act(() => card("Eggs").props.onPress());
    await act(async () => save().props.onPress());
    expect(
      mockAdd.mock.calls[0][0].products.map((product) => product.displayName),
    ).toEqual(["Eggs"]);
  });
  it("preserves choices across reconnect and cannot save offline", async () => {
    mount();
    act(() => card("Milk").props.onPress());
    mockOnline = false;
    act(() => tree.update(<ChooseRegularsScreen />));
    expect(save().props.disabled).toBe(true);
    await act(async () => save().props.onPress());
    expect(mockAdd).not.toHaveBeenCalled();
    mockOnline = true;
    act(() => tree.update(<ChooseRegularsScreen />));
    expect(card("Milk").props.accessibilityState.checked).toBe(true);
  });
});
