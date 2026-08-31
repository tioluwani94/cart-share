import {
  calculateMonthlyRemaining,
  calculatePlanVariance,
  calculatePlannedTotal,
} from "./budget";

describe("household budget calculations", () => {
  it("calculates planned list spend from item estimates and quantities", () => {
    expect(
      calculatePlannedTotal([
        { estimatedPricePence: 125, quantity: 2 },
        { estimatedPricePence: 349 },
        { quantity: 4 },
      ]),
    ).toBe(599);
  });

  it("reports monthly remaining and plan-versus-actual in pence", () => {
    expect(calculateMonthlyRemaining(40_000, 12_345)).toBe(27_655);
    expect(calculatePlanVariance(5_000, 4_250)).toEqual({
      differencePence: 750,
      status: "under",
    });
    expect(calculatePlanVariance(5_000, 5_600)).toEqual({
      differencePence: 600,
      status: "over",
    });
  });
});
