import { Easing, FadeIn } from "react-native-reanimated";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * Receipt states replace one another in place, so a short crossfade explains
 * the change without competing with the native screen transition.
 */
export const RECEIPT_STATE_ENTER = FadeIn.duration(180).easing(EASE_OUT);
