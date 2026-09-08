import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { QuickCheckSection } from "../components/restocks/QuickCheckSection";
import type { Id } from "../convex/_generated/dataModel";

jest.mock("expo-router", () => ({
  useFocusEffect: (fn: () => void) => {
    const React = jest.requireActual("react");
    React.useEffect(fn, [fn]);
  },
}));
jest.mock("@/components/ui", () => {
  const { View, Text, Pressable } = jest.requireActual("react-native");
  return {
    Button: ({ children, ...props }: any) => (
      <Pressable {...props}>
        <Text>{children}</Text>
      </Pressable>
    ),
    ProgressBar: (props: any) => <View testID="progress" {...props} />,
    EmptyStateCard: ({ title, description, actionLabel, onAction }: any) => (
      <View>
        <Text>{title}</Text>
        <Text>{description}</Text>
        <Pressable testID="empty-action" onPress={onAction}>
          <Text>{actionLabel}</Text>
        </Pressable>
      </View>
    ),
  };
});
jest.mock("../components/restocks/QuickCheckCard", () => {
  const { View } = jest.requireActual("react-native");
  return { QuickCheckCard: (props: any) => <View testID="card" {...props} /> };
});

type Props = React.ComponentProps<typeof QuickCheckSection>;
const product = "product" as Id<"householdProducts">;
function props(): Props {
  return {
    review: {
      setupCompleted: true,
      household: {
        _id: "house" as Id<"households">,
        marketCountryCode: "GB",
        locale: "en-GB",
        currencyCode: "GBP",
        planningTimeZone: "Europe/London",
        peopleServed: 2,
        shoppingCadenceDays: 7,
        preferredShoppingMode: "in_store",
      },
      activeList: {
        _id: "list" as Id<"lists">,
        name: "Groceries",
        plannedFor: undefined,
        shoppingMode: "in_store",
        tripBudgetPence: undefined,
        totalItems: 0,
        completedItems: 0,
        plannedTotalPence: 0,
      },
      candidates: [
        {
          productId: product,
          householdProductId: product,
          displayName: "Milk",
          cadenceDays: 7,
          reviewAt: 0,
          expectedDueAt: 0,
          purchaseObservationCount: 1,
          isAdded: false,
          defaultQuantity: undefined,
          defaultUnit: undefined,
          lastPurchasedAt: undefined,
        },
      ],
      trackedProductCount: 1,
      activeProductCount: 1,
      learningProductCount: 0,
      possibleRegularCount: 0,
      candidateCount: 1,
    },
    hiddenIds: new Set(),
    error: null,
    isOnline: true,
    makeDecision: jest.fn(async () => ({ saved: true })),
    undoDecision: jest.fn(async () => true),
    onShop: jest.fn(),
    onPantry: jest.fn(),
  };
}
describe("native Quick check", () => {
  let tree: ReactTestRenderer;
  function choose(choice: "add" | "still_have_some") {
    return (
      tree.root.findByProps({ testID: "card" }).props.onDecision as (
        choice: string,
      ) => Promise<void>
    )(choice);
  }
  function pressEmpty() {
    (
      tree.root.findByProps({ testID: "empty-action" }).props
        .onPress as () => void
    )();
  }
  afterEach(() => {
    if (tree) act(() => tree.unmount());
  });
  function mount(p: Props) {
    act(() => {
      tree = TestRenderer.create(<QuickCheckSection {...p} />);
    });
  }
  it("advances only after a saved choice and navigates View list to Shop", async () => {
    const p = props();
    mount(p);
    await act(async () => {
      await choose("add");
    });
    expect(p.makeDecision).toHaveBeenCalledWith(product, "add");
    expect(tree.root.findByProps({ testID: "progress" }).props.value).toBe(1);
    act(pressEmpty);
    expect(p.onShop).toHaveBeenCalledTimes(1);
    expect(p.onPantry).not.toHaveBeenCalled();
  });
  it("keeps the card available after a failed save", async () => {
    const p = props();
    p.makeDecision = jest.fn(async () => ({ saved: false }));
    mount(p);
    await act(async () => {
      await choose("add");
    });
    expect(tree.root.findByProps({ testID: "card" }).props.name).toBe("Milk");
    expect(tree.root.findByProps({ testID: "progress" }).props.value).toBe(0);
  });
  it("passes the shrinking queue to the stack without a duplicate View list button", async () => {
    const p = props();
    const first = p.review.candidates[0];
    p.review.candidates = ["Milk", "Bread", "Eggs", "Rice"].map(
      (name, index) => ({
        ...first,
        displayName: name,
        productId: `product-${index}` as Id<"householdProducts">,
        householdProductId: `product-${index}` as Id<"householdProducts">,
      }),
    );
    mount(p);
    for (const remaining of [4, 3, 2, 1]) {
      expect(tree.root.findByProps({ testID: "card" }).props.remaining).toBe(
        remaining,
      );
      expect(tree.root.findAllByProps({ children: "View list" })).toHaveLength(
        0,
      );
      await act(async () => {
        await choose("still_have_some");
      });
    }
    expect(tree.root.findAllByProps({ testID: "card" })).toHaveLength(0);
    expect(tree.root.findByProps({ testID: "empty-action" })).toBeTruthy();
  });
  it("renders no quiet placeholder when there are no products due", () => {
    const p = props();
    p.review.candidates = [];
    p.review.trackedProductCount = 5;
    p.review.activeProductCount = 5;
    mount(p);
    expect(tree.root.findAllByProps({ testID: "empty-action" })).toHaveLength(
      0,
    );
    expect(tree.root.findAllByProps({ testID: "card" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "progress" })).toHaveLength(0);
  });
  it("does not enable adding when there is no Next shop", () => {
    const p = props();
    p.review.activeList = null;
    mount(p);
    expect(tree.root.findByProps({ testID: "card" }).props.canAdd).toBe(false);
  });
  it("routes the new-household action to Pantry without a progress bar", () => {
    const p = props();
    p.review.candidates = [];
    p.review.trackedProductCount = 0;
    p.review.activeProductCount = 0;
    mount(p);
    expect(tree.root.findAllByProps({ testID: "progress" })).toHaveLength(0);
    act(pressEmpty);
    expect(p.onPantry).toHaveBeenCalledTimes(1);
    expect(p.onShop).not.toHaveBeenCalled();
  });
  it("restores the card and progress when safe Undo succeeds", async () => {
    const p = props();
    p.makeDecision = jest.fn(async () => ({
      saved: true,
      undoId: "undo" as Id<"restockUndoRecords">,
      undoExpiresAt: Date.now() + 300000,
    }));
    mount(p);
    await act(async () => {
      await choose("still_have_some");
    });
    await act(async () => {
      (
        tree.root.findAllByProps({
          accessibilityLabel: "Undo choice for Milk",
        })[0].props.onPress as () => void
      )();
    });
    expect(p.undoDecision).toHaveBeenCalledWith("undo");
    expect(tree.root.findByProps({ testID: "card" }).props.name).toBe("Milk");
    expect(tree.root.findByProps({ testID: "progress" }).props.value).toBe(0);
  });
  it("does not overwrite the current card while a household update removes it during saving", async () => {
    const p = props();
    let resolve!: (value: { saved: boolean }) => void;
    p.makeDecision = jest.fn(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    mount(p);
    let saving!: Promise<void>;
    act(() => {
      saving = choose("add");
    });
    act(() =>
      tree.update(<QuickCheckSection {...p} hiddenIds={new Set([product])} />),
    );
    expect(tree.root.findByProps({ testID: "card" }).props.busy).toBe(true);
    await act(async () => {
      resolve({ saved: true });
      await saving;
    });
    expect(tree.root.findAllByProps({ testID: "card" })).toHaveLength(0);
  });
});
