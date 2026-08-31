import { themeColors } from "@/lib/theme";
import { ChevronLeft, X } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

interface PageHeaderProps {
  title: string;
  onBack: () => void;
  appearance?: "light" | "overlay";
  leadingIcon?: "back" | "close";
  backLabel?: string;
}

export function PageHeader({
  title,
  onBack,
  appearance = "light",
  leadingIcon = "back",
  backLabel = "Back",
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
      <Pressable
        onPress={onBack}
        className="h-12 w-12 items-center justify-center rounded-full active:opacity-50"
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
      >
        <Icon
          size={leadingIcon === "close" ? 23 : 28}
          color={foreground}
          strokeWidth={2.25}
        />
      </Pressable>

      <Text
        className={`flex-1 text-center text-lg font-semibold ${
          appearance === "overlay" ? "text-white" : "text-ink"
        }`}
        numberOfLines={1}
      >
        {title}
      </Text>

      <View className="h-12 w-12" />
    </View>
  );
}
