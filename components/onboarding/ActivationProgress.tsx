import { ProgressBar } from "@/components/ui";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, View } from "react-native";

interface ActivationProgressProps {
  current: number;
  total: number;
  onBack?: () => void;
}

export function ActivationProgress({
  current,
  total,
  onBack,
}: ActivationProgressProps) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.min(Math.max(1, current), safeTotal);
  const progressLabel = `Step ${safeCurrent} of ${safeTotal}`;

  return (
    <View className="h-11 flex-row items-center">
      {onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={8}
          className="-ml-3 mr-1 h-11 w-11 items-center justify-center rounded-full"
          accessibilityLabel="Go back one setup step"
          accessibilityRole="button"
        >
          <ChevronLeft size={28} strokeWidth={2.25} color="#1A1917" />
        </Pressable>
      )}
      <ProgressBar
        value={safeCurrent}
        max={safeTotal}
        min={1}
        size="regular"
        accessibilityLabel="Setup progress"
        accessibilityText={progressLabel}
      />
    </View>
  );
}
