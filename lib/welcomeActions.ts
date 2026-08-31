export type WelcomeActionId =
  | "yazio.continue-google"
  | "yazio.continue-apple";

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
