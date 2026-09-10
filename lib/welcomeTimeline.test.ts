import {
  WELCOME_TIMELINE,
  getWelcomePresentation,
  isWelcomeInteractive,
} from "./welcomeTimeline";

describe("OurPantry welcome timeline", () => {
  it("keeps the authored launch, crossfade, spring, and final-state timings", () => {
    expect(WELCOME_TIMELINE).toEqual({
      crossfadeStartMs: 567,
      crossfadeEndMs: 800,
      assetStartsMs: [1167, 1233, 1300, 1367, 1467],
      assetEndsMs: [1410, 1490, 1540, 1620, 1733],
      springEndMs: 1733,
      finalSwapMs: 1733,
    });
  });

  it("enables visible actions while the artwork continues", () => {
    expect(isWelcomeInteractive(799)).toBe(false);
    expect(isWelcomeInteractive(800)).toBe(true);
  });

  it("shows the static final state immediately when autoplay is disabled", () => {
    expect(
      getWelcomePresentation({
        autoplay: false,
        reduceMotion: false,
        elapsedMs: 0,
      }),
    ).toEqual({ showFinalState: true, actionsEnabled: true });
  });

  it("shows the static final state immediately when reduced motion is enabled", () => {
    expect(
      getWelcomePresentation({
        autoplay: true,
        reduceMotion: true,
        elapsedMs: 0,
      }),
    ).toEqual({ showFinalState: true, actionsEnabled: true });
  });
});
