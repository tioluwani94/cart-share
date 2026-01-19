import { View, Text, Pressable, Image } from "react-native";
import { useState } from "react";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Receipt, Calendar, MapPin, ChevronRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Format a timestamp to a friendly date string.
 * Examples: "Today", "Yesterday", "Last Tuesday", "Jan 15"
 */
function formatFriendlyDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  // Reset time parts for accurate day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    // Get the day name for "Last Tuesday" format
    const dayName = date.toLocaleString("en-US", { weekday: "long" });
    return `Last ${dayName}`;
  } else if (diffDays < 14) {
    // For 7-13 days ago, still use "Last [Day]"
    const dayName = date.toLocaleString("en-US", { weekday: "long" });
    return dayName;
  } else {
    // For older dates, use "Jan 15" format
    return date.toLocaleString("en-US", { month: "short", day: "numeric" });
  }
}

/**
 * Format cents to dollar string.
 */
function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

interface SessionHistoryCardProps {
  sessionId: Id<"shoppingSessions">;
  amount: number; // in cents
  storeName?: string;
  sessionDate: number; // timestamp
  receiptImageUrl?: string | null;
  shopperName?: string;
  shopperImageUrl?: string;
  index: number;
  onPress: () => void;
}

/**
 * Card component displaying a shopping session in history.
 * Shows date, amount, store name, and receipt thumbnail.
 */
export function SessionHistoryCard({
  amount,
  storeName,
  sessionDate,
  receiptImageUrl,
  shopperName,
  index,
  onPress,
}: SessionHistoryCardProps) {
  const [imageError, setImageError] = useState(false);

  // Press animation
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const friendlyDate = formatFriendlyDate(sessionDate);
  const hasReceipt = receiptImageUrl && !imageError;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify()}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`Shopping trip on ${friendlyDate}, ${formatDollars(amount)}${storeName ? ` at ${storeName}` : ""}. Tap to view receipt.`}
      >
        <Animated.View
          style={animatedStyle}
          className="flex-row items-center rounded-2xl bg-white p-4 shadow-warm"
        >
          {/* Receipt thumbnail or placeholder */}
          <View className="mr-4">
            {hasReceipt ? (
              <View className="h-14 w-14 overflow-hidden rounded-xl bg-warm-gray-100">
                <Image
                  source={{ uri: receiptImageUrl }}
                  className="h-full w-full"
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
              </View>
            ) : (
              <View className="h-14 w-14 items-center justify-center rounded-xl bg-coral/10">
                <Receipt size={24} color="#FF6B6B" strokeWidth={2} />
              </View>
            )}
          </View>

          {/* Session details */}
          <View className="flex-1">
            {/* Amount - large and prominent */}
            <Text className="text-lg font-bold text-warm-gray-900">
              {formatDollars(amount)}
            </Text>

            {/* Date and store */}
            <View className="flex-row items-center mt-1">
              <Calendar size={12} color="#A3A096" strokeWidth={2} />
              <Text className="ml-1 text-sm text-warm-gray-500">
                {friendlyDate}
              </Text>

              {storeName && (
                <>
                  <View className="mx-2 h-1 w-1 rounded-full bg-warm-gray-300" />
                  <MapPin size={12} color="#A3A096" strokeWidth={2} />
                  <Text className="ml-1 text-sm text-warm-gray-500" numberOfLines={1}>
                    {storeName}
                  </Text>
                </>
              )}
            </View>

            {/* Shopper name if available */}
            {shopperName && (
              <Text className="mt-1 text-xs text-warm-gray-400">
                by {shopperName}
              </Text>
            )}
          </View>

          {/* Chevron indicator */}
          <ChevronRight size={20} color="#C4C4B8" strokeWidth={2} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
