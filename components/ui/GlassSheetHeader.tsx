import { themeColors } from "@/lib/theme";
import { X } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Button } from "./Button";

interface GlassSheetHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  tone?: "coral" | "teal" | "neutral" | "danger";
  onClose: () => void;
  closeAccessibilityLabel: string;
  closeDisabled?: boolean;
}

const iconWellColors = {
  coral: {
    backgroundColor: themeColors.coralSoft,
    borderColor: "rgba(201, 74, 74, 0.12)",
  },
  teal: {
    backgroundColor: themeColors.tealSoft,
    borderColor: "rgba(41, 125, 118, 0.12)",
  },
  neutral: {
    backgroundColor: themeColors.surface,
    borderColor: themeColors.separator,
  },
  danger: {
    backgroundColor: "#FDECEC",
    borderColor: "rgba(180, 35, 24, 0.12)",
  },
} as const;

/**
 * A shared hierarchy for glass-sheet titles, supporting context, and dismissal.
 * The action stays quiet so the sheet's primary task remains visually dominant.
 */
export function GlassSheetHeader({
  title,
  description,
  icon,
  tone = "coral",
  onClose,
  closeAccessibilityLabel,
  closeDisabled = false,
}: GlassSheetHeaderProps) {
  return (
    <View className="mb-6 flex-row items-start">
      {icon ? (
        <View
          className="mr-3 h-11 w-11 items-center justify-center rounded-2xl border"
          style={iconWellColors[tone]}
        >
          {icon}
        </View>
      ) : null}

      <View className="min-w-0 flex-1 pr-2">
        <Text
          className="text-2xl tracking-tight text-ink"
          style={{ fontFamily: "Nunito_900Black" }}
        >
          {title}
        </Text>
        {description ? (
          <Text className="mt-1 text-[15px] leading-5 text-ink-secondary">
            {description}
          </Text>
        ) : null}
      </View>

      <Button
        variant="ghost"
        size="sm"
        iconOnly
        onPress={onClose}
        disabled={closeDisabled}
        className="-mr-1 border border-separator bg-surface"
        accessibilityLabel={closeAccessibilityLabel}
        accessibilityHint="Dismisses this sheet"
      >
        <X size={20} color={themeColors.secondaryInk} strokeWidth={2} />
      </Button>
    </View>
  );
}
