export const LIST_ITEM_ACTION_BUTTON_WIDTH = 70;
export const LIST_ITEM_SWIPE_OPEN = -(LIST_ITEM_ACTION_BUTTON_WIDTH * 2);

const EDGE_RESISTANCE = 0.12;
const VELOCITY_PROJECTION_SECONDS = 0.08;

/**
 * Keep a swipe attached to the finger while adding restrained resistance once
 * the complete action tray has been revealed.
 */
export function getListItemSwipePosition(
  gestureStartX: number,
  translationX: number,
): number {
  "worklet";
  const proposedPosition = gestureStartX + translationX;

  if (proposedPosition < LIST_ITEM_SWIPE_OPEN) {
    return (
      LIST_ITEM_SWIPE_OPEN +
      (proposedPosition - LIST_ITEM_SWIPE_OPEN) * EDGE_RESISTANCE
    );
  }

  return Math.min(0, proposedPosition);
}

/**
 * Project a short distance in the direction of release velocity, then choose
 * the nearest stable state. This keeps short intentional flicks responsive
 * without making slow drags feel threshold-driven.
 */
export function getListItemSwipeSnapTarget(
  positionX: number,
  velocityX: number,
): 0 | typeof LIST_ITEM_SWIPE_OPEN {
  "worklet";
  const projectedPosition =
    positionX + velocityX * VELOCITY_PROJECTION_SECONDS;

  return projectedPosition < LIST_ITEM_SWIPE_OPEN / 2
    ? LIST_ITEM_SWIPE_OPEN
    : 0;
}
