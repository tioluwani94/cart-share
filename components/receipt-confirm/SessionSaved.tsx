import { formatAmount } from "@/lib/formatAmount";
import { Check } from "lucide-react-native";
import { Text, View } from "react-native";
import Animated, { FadeInUp, useReducedMotion } from "react-native-reanimated";

interface SessionSavedProps {
  /** Extracted total amount in pence */
  extractedTotal: number | null;
  /** Number of shopping sessions this month */
  monthlySessionCount: number;
}

export const SessionSaved = ({
  extractedTotal,
  monthlySessionCount,
}: SessionSavedProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInUp.springify().damping(90)}
      className="items-center"
    >
      {/* Big animated checkmark */}
      <View className="mb-6 h-28 w-28 items-center justify-center rounded-full bg-teal">
        <Check size={64} color="white" strokeWidth={3} />
      </View>

      {/* Trip saved message */}
      <Text className="text-center text-3xl font-bold text-warm-gray-900">
        Trip saved! 🎉
      </Text>

      {/* Amount saved */}
      {extractedTotal !== null && (
        <Text className="mt-2 text-center text-xl text-warm-gray-600">
          {formatAmount(extractedTotal)}
        </Text>
      )}

      {/* Fun stat - shopping count this month */}
      <View className="mt-8">
        <View className="rounded-2xl bg-teal/10 px-6 py-4">
          <Text className="text-center text-lg text-warm-gray-700">
            You've shopped{" "}
            <Text className="font-bold text-teal">
              {monthlySessionCount}{" "}
              {monthlySessionCount === 1 ? "time" : "times"}
            </Text>{" "}
            this month!
          </Text>
          {monthlySessionCount >= 5 && (
            <Text className="mt-1 text-center text-sm text-warm-gray-500">
              You're a shopping pro! 🛒✨
            </Text>
          )}
        </View>
      </View>

      {/* Auto-redirect message */}
      <Text className="mt-6 text-center text-sm text-warm-gray-400">
        Taking you home...
      </Text>
    </Animated.View>
  );
};
