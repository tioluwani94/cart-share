import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import LegacyRestockReviewRedirect from "../app/restock-review";

let mockParams: { source?: string; notificationId?: string } = {};
const mockRedirect = jest.fn();
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  Redirect: (props: { href: string }) => {
    mockRedirect(props.href);
    return null;
  },
}));

describe("legacy restock links", () => {
  it.each([
    [{}, "/(tabs)"],
    [{ source: "plan" }, "/(tabs)"],
    [{ source: "notification" }, "/(tabs)?source=notification"],
    [
      { source: "notification", notificationId: "old/link" },
      "/(tabs)?source=notification&notificationId=old%2Flink",
    ],
  ])("redirects %j to Plan", (params, destination) => {
    mockParams = params;
    mockRedirect.mockClear();
    let tree!: ReturnType<typeof TestRenderer.create>;
    act(() => {
      tree = TestRenderer.create(<LegacyRestockReviewRedirect />);
    });
    expect(mockRedirect).toHaveBeenLastCalledWith(destination);
    act(() => tree.unmount());
  });
});
