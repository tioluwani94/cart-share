import { routeOwnsForegroundQueue } from "./offlineQueueOwnership";

describe("routeOwnsForegroundQueue", () => {
  it.each([
    ["list", undefined],
    ["restock-review", undefined],
    ["(tabs)", undefined],
    ["(tabs)", "index"],
    ["(tabs)", "shop"],
  ])("lets %s/%s own its interactive queue", (rootSegment, childSegment) => {
    expect(routeOwnsForegroundQueue(rootSegment, childSegment)).toBe(true);
  });

  it.each([
    ["(tabs)", "analytics"],
    ["settings", undefined],
    ["receipt-confirm", undefined],
  ])("keeps background replay for %s/%s", (rootSegment, childSegment) => {
    expect(routeOwnsForegroundQueue(rootSegment, childSegment)).toBe(false);
  });
});
