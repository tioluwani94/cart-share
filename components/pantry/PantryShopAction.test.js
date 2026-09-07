/* eslint-env jest */
/* eslint-disable @typescript-eslint/no-var-requires -- Jest mock factories are hoisted. */
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { PantryShopAction } from "./PantryShopAction";

// Gorhom's root portal host is above the screen-scoped account/offline/toast
// providers. Render its contents separately to test that boundary explicitly.
const mockProvider = React.createContext(null);
const mockAddItem = jest.fn(async () => {});
const mockRemoveItem = jest.fn(async () => {});
jest.mock("@/lib/useShoppingList", () => ({
  useShoppingList: () => {
    const React = require("react");
    if (!React.useContext(mockProvider))
      throw new Error("Missing offline provider");
    return {
      items: [],
      addItem: mockAddItem,
      removeItem: mockRemoveItem,
      isLoading: false,
    };
  },
}));
jest.mock("@/components/ui", () => ({
  useToast: () => {
    const React = require("react");
    if (!React.useContext(mockProvider))
      throw new Error("Missing toast provider");
    return { showToast: jest.fn() };
  },
  Button: "Button",
}));

it("resolves scoped hooks before handing the action to a root-hosted sheet", async () => {
  let portalContent;
  let controller;
  act(() => {
    controller = TestRenderer.create(
      <mockProvider.Provider value="household">
        <PantryShopAction
          listId="list"
          householdId="household"
          product={{ displayName: "Bread" }}
        >
          {(action) => {
            portalContent = action;
            return null;
          }}
        </PantryShopAction>
      </mockProvider.Provider>,
    );
  });
  expect(portalContent).toBeTruthy();
  let sheet;
  act(() => {
    sheet = TestRenderer.create(portalContent);
  });
  const button = sheet.root.findByType("Button");
  await act(async () => {
    await button.props.onPress();
  });
  expect(mockAddItem).toHaveBeenCalledWith("Bread", expect.any(Object));
  act(() => {
    sheet.unmount();
    controller.unmount();
  });
});

it("keeps the product editor available when there is no active shop", () => {
  let renderer;
  act(() => {
    renderer = TestRenderer.create(
      <PantryShopAction product={null}>
        {(action) => (
          <React.Fragment>
            {action}
            <React.Fragment>Product editor</React.Fragment>
          </React.Fragment>
        )}
      </PantryShopAction>,
    );
  });
  expect(renderer.toJSON()).toBe("Product editor");
  act(() => renderer.unmount());
});
