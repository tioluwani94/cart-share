import type { PropsWithChildren } from "react";
import { useWindowDimensions, View } from "react-native";

export const WELCOME_REFERENCE_WIDTH = 640;
export const WELCOME_REFERENCE_HEIGHT = 1385;

export function ReferenceCanvas({ children }: PropsWithChildren) {
  const viewport = useWindowDimensions();
  const widthScale = viewport.width / WELCOME_REFERENCE_WIDTH;
  const heightScale = viewport.height / WELCOME_REFERENCE_HEIGHT;
  const relativeDifference =
    Math.abs(widthScale - heightScale) / Math.min(widthScale, heightScale);
  const scale =
    relativeDifference <= 0.02
      ? Math.max(widthScale, heightScale)
      : Math.min(widthScale, heightScale);

  return (
    <View
      testID="ourpantry-welcome-viewport"
      style={{ flex: 1, overflow: "hidden", backgroundColor: "#D95758" }}
    >
      <View
        style={{
          position: "absolute",
          left: (viewport.width - WELCOME_REFERENCE_WIDTH) / 2,
          top: (viewport.height - WELCOME_REFERENCE_HEIGHT) / 2,
          width: WELCOME_REFERENCE_WIDTH,
          height: WELCOME_REFERENCE_HEIGHT,
          transform: [{ scale }],
        }}
      >
        {children}
      </View>
    </View>
  );
}
