import type { ReactNode } from "react";
import { View } from "react-native";

/** Width insets preserve visible top edges even for tall/Dynamic Type cards. */
export function QuickCheckStack({
  remaining,
  children,
}: {
  remaining: number;
  children: ReactNode;
}) {
  const layers = Math.min(2, Math.max(0, remaining - 1));
  return (
    <View testID="quick-check-stack" style={{ paddingTop: layers * 10 }}>
      <View>
        {Array.from({ length: layers }, (_, index) => layers - index).map(
          (depth) => (
            <View
              key={depth}
              testID={`quick-check-stack-layer-${depth}`}
              pointerEvents="none"
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="absolute rounded-3xl border border-[#E6DBC3]"
              style={{
                top: -depth * 10,
                bottom: depth * 10,
                left: depth * 10,
                right: depth * 10,
                backgroundColor: depth === 1 ? "#FFF4DA" : "#F3EBD9",
              }}
            />
          ),
        )}
        {children}
      </View>
    </View>
  );
}
