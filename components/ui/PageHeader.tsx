import { themeColors } from "@/lib/theme";
import { PAGE_HEADER_ROW_HEIGHT } from "@/lib/navigationGeometry";
import { ProgressiveBlurEdge } from "@/components/navigation/ProgressiveBlurEdge";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "./Button";

export { PAGE_HEADER_ROW_HEIGHT } from "@/lib/navigationGeometry";

export function usePageHeaderHeight() {
  const insets = useSafeAreaInsets();
  return insets.top + PAGE_HEADER_ROW_HEIGHT;
}

interface PageHeaderProps {
  title: string;
  onBack: () => void;
  appearance?: "light" | "overlay";
  leadingIcon?: "back" | "close";
  backLabel?: string;
  backDisabled?: boolean;
  trailing?: ReactNode;
}

export function PageHeader({
  title,
  onBack,
  appearance = "light",
  leadingIcon = "back",
  backLabel = "Back",
  backDisabled = false,
  trailing,
}: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + PAGE_HEADER_ROW_HEIGHT;
  const foreground =
    appearance === "overlay" ? themeColors.surface : themeColors.ink;
  const Icon = leadingIcon === "close" ? X : ChevronLeft;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.header, { height: headerHeight }]}
    >
      <StatusBar style={appearance === "overlay" ? "light" : "dark"} />
      <ProgressiveBlurEdge
        fadeEdge="bottom"
        falloff={64}
        spill={16}
        materialIntensity={appearance === "overlay" ? 24 : 28}
        tint={
          appearance === "overlay"
            ? "systemUltraThinMaterialDark"
            : "systemUltraThinMaterialLight"
        }
        fallbackColor={
          appearance === "overlay" ? "rgba(0, 0, 0, 0.72)" : themeColors.surface
        }
        style={[styles.materialBleed, { top: -insets.top }]}
      />

      <View
        pointerEvents="box-none"
        className="flex-row items-center px-2"
        style={{ height: headerHeight, paddingTop: insets.top }}
      >
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onPress={onBack}
          disabled={backDisabled}
          className="-ml-1"
          accessibilityLabel={backLabel}
          accessibilityHint="Returns to the previous screen"
        >
          <Icon
            size={leadingIcon === "close" ? 23 : 28}
            color={foreground}
            strokeWidth={2.25}
          />
        </Button>

        <Text
          className={`font-heading flex-1 text-center text-lg ${
            appearance === "overlay" ? "text-white" : "text-ink"
          }`}
          numberOfLines={1}
        >
          {title}
        </Text>

        <View className="h-12 w-12 items-center justify-center">
          {trailing}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    overflow: "visible",
  },
  materialBleed: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});
