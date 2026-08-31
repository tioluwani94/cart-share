export type WelcomeActionId =
  | "ourpantry.continue-google"
  | "ourpantry.continue-apple";

export type WelcomeActionPressHandler = (actionId: WelcomeActionId) => void;

export function resolveWelcomeActionPress(
  actionId: WelcomeActionId,
  onActionPress?: WelcomeActionPressHandler,
  fallback?: () => void,
): (() => void) | undefined {
  if (onActionPress) {
    return () => onActionPress(actionId);
  }

  return fallback;
}
