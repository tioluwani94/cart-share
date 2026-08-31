import { resolveWelcomeActionPress } from "./welcomeActions";

describe("OurPantry welcome actions", () => {
  it.each(
    ["ourpantry.continue-google", "ourpantry.continue-apple"] as const,
  )(
    "routes the semantic action %s through the public callback",
    (actionId) => {
      const onActionPress = jest.fn();
      const onLegacyPress = jest.fn();

      resolveWelcomeActionPress(actionId, onActionPress, onLegacyPress)?.();

      expect(onActionPress).toHaveBeenCalledWith(actionId);
      expect(onLegacyPress).not.toHaveBeenCalled();
    },
  );

  it("keeps the matching legacy callback available", () => {
    const onLegacyPress = jest.fn();

    resolveWelcomeActionPress(
      "ourpantry.continue-google",
      undefined,
      onLegacyPress,
    )?.();

    expect(onLegacyPress).toHaveBeenCalledTimes(1);
  });
});
