import { dismissKeyboardForOutsideTouch } from "@/lib/keyboard";
import type { ReactNode } from "react";
import { View } from "react-native";

interface KeyboardDismissBoundaryProps {
  children: ReactNode;
}

/**
 * App-level escape hatch for focused fields. Interactive children keep their
 * normal behavior; tapping the surrounding surface releases keyboard focus.
 */
export function KeyboardDismissBoundary({
  children,
}: KeyboardDismissBoundaryProps) {
  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={dismissKeyboardForOutsideTouch}
    >
      {children}
    </View>
  );
}
