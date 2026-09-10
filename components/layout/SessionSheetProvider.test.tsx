import React, { useEffect } from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { SessionSheetProvider } from "./SessionSheetProvider";
let mockUserId: string | null = "first-account";
const mockUnmount = jest.fn();
jest.mock("@clerk/expo", () => ({ useAuth: () => ({ userId: mockUserId }) }));
jest.mock("@gorhom/bottom-sheet", () => ({
  BottomSheetModalProvider: ({ children }: React.PropsWithChildren) => children,
}));
function PortalContent() {
  useEffect(() => () => mockUnmount(), []);
  return null;
}
it("discards sheet content when an account signs out or is replaced", () => {
  let tree!: ReactTestRenderer;
  const content = (
    <SessionSheetProvider>
      <PortalContent />
    </SessionSheetProvider>
  );
  act(() => {
    tree = TestRenderer.create(content);
  });
  act(() => {
    mockUserId = null;
    tree.update(
      <SessionSheetProvider>
        <PortalContent />
      </SessionSheetProvider>,
    );
  });
  expect(mockUnmount).toHaveBeenCalledTimes(1);
  act(() => {
    mockUserId = "second-account";
    tree.update(
      <SessionSheetProvider>
        <PortalContent />
      </SessionSheetProvider>,
    );
  });
  expect(mockUnmount).toHaveBeenCalledTimes(2);
  act(() => tree.unmount());
});
