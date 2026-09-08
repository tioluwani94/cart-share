import { quickCheckEmptyKind, quickCheckProgress } from "./quickCheck";

describe("Quick check state", () => {
  it("keeps a stable denominator when household updates remove or add suggestions", () => {
    expect(
      quickCheckProgress(["milk", "bread", "eggs"], ["bread", "eggs", "rice"]),
    ).toEqual({ total: 3, checked: 1 });
    expect(
      quickCheckProgress(["milk", "bread", "eggs"], ["milk", "bread", "eggs"]),
    ).toEqual({ total: 3, checked: 0 });
  });
  it.each([
    [3, 3, 3, 0, "done"],
    [0, 3, 3, 0, "quiet"],
    [0, 0, 0, 0, "new"],
    [0, 0, 0, 2, "learning"],
    [0, 3, 0, 0, "paused"],
  ] as const)(
    "distinguishes %s/%s/%s/%s as %s",
    (total, tracked, active, learning, expected) => {
      expect(quickCheckEmptyKind({ total, tracked, active, learning })).toBe(
        expected,
      );
    },
  );
});
