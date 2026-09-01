import { themeColors } from "@/lib/theme";
import { ChevronLeft, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Button } from "./Button";

interface PageHeaderProps {
  title: string;
  onBack: () => void;
  appearance?: "light" | "overlay";
  leadingIcon?: "back" | "close";
  backLabel?: string;
  trailing?: ReactNode;
}

export function PageHeader({
  title,
  onBack,
  appearance = "light",
  leadingIcon = "back",
  backLabel = "Back",
  trailing,
}: PageHeaderProps) {
  const foreground =
    appearance === "overlay" ? themeColors.surface : themeColors.ink;
  const Icon = leadingIcon === "close" ? X : ChevronLeft;

  return (
    <View
      className={`min-h-14 flex-row items-center px-2 ${
        appearance === "light" ? "bg-background-light" : "bg-black/30"
      }`}
    >
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        onPress={onBack}
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
  );
}
