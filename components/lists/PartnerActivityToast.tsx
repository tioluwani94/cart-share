import { useEffect, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  runOnJS,
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { UserAvatar } from "@/components/ui";

// Emoji mapping for common grocery items
const ITEM_EMOJIS: Record<string, string> = {
  // Dairy
  milk: "🥛",
  cheese: "🧀",
  butter: "🧈",
  yogurt: "🥛",
  eggs: "🥚",
  cream: "🥛",
  // Fruits
  apple: "🍎",
  apples: "🍎",
  banana: "🍌",
  bananas: "🍌",
  orange: "🍊",
  oranges: "🍊",
  lemon: "🍋",
  lemons: "🍋",
  grapes: "🍇",
  strawberry: "🍓",
  strawberries: "🍓",
  blueberry: "🫐",
  blueberries: "🫐",
  watermelon: "🍉",
  peach: "🍑",
  peaches: "🍑",
  pear: "🍐",
  pears: "🍐",
  mango: "🥭",
  pineapple: "🍍",
  avocado: "🥑",
  // Vegetables
  carrot: "🥕",
  carrots: "🥕",
  broccoli: "🥦",
  lettuce: "🥬",
  salad: "🥗",
  tomato: "🍅",
  tomatoes: "🍅",
  potato: "🥔",
  potatoes: "🥔",
  onion: "🧅",
  onions: "🧅",
  garlic: "🧄",
  corn: "🌽",
  pepper: "🌶️",
  peppers: "🫑",
  cucumber: "🥒",
  eggplant: "🍆",
  mushroom: "🍄",
  mushrooms: "🍄",
  // Meat & Protein
  chicken: "🍗",
  beef: "🥩",
  steak: "🥩",
  bacon: "🥓",
  fish: "🐟",
  salmon: "🐟",
  shrimp: "🦐",
  // Bread & Bakery
  bread: "🍞",
  bagel: "🥯",
  bagels: "🥯",
  croissant: "🥐",
  pretzel: "🥨",
  cookie: "🍪",
  cookies: "🍪",
  cake: "🍰",
  pie: "🥧",
  donut: "🍩",
  donuts: "🍩",
  // Beverages
  water: "💧",
  juice: "🧃",
  coffee: "☕",
  tea: "🍵",
  wine: "🍷",
  beer: "🍺",
  soda: "🥤",
  // Snacks
  chips: "🍿",
  popcorn: "🍿",
  candy: "🍬",
  chocolate: "🍫",
  ice: "🧊",
  "ice cream": "🍦",
  // Other
  rice: "🍚",
  pasta: "🍝",
  noodles: "🍜",
  pizza: "🍕",
  sandwich: "🥪",
  taco: "🌮",
  burrito: "🌯",
  sushi: "🍣",
  honey: "🍯",
  salt: "🧂",
  peanut: "🥜",
  peanuts: "🥜",
  nuts: "🥜",
};

// Get relevant emoji for an item name
function getItemEmoji(itemName: string): string {
  const lowerName = itemName.toLowerCase().trim();

  // Check for exact match
  if (ITEM_EMOJIS[lowerName]) {
    return ITEM_EMOJIS[lowerName];
  }

  // Check if any key is contained in the item name
  for (const [key, emoji] of Object.entries(ITEM_EMOJIS)) {
    if (lowerName.includes(key)) {
      return emoji;
    }
  }

  // Default grocery emoji
  return "🛒";
}

interface PartnerActivityToastProps {
  visible: boolean;
  partnerName: string;
  partnerImageUrl?: string;
  itemName: string;
  onDismiss: () => void;
  onPress?: () => void;
  duration?: number;
}

export function PartnerActivityToast({
  visible,
  partnerName,
  partnerImageUrl,
  itemName,
  onDismiss,
  onPress,
  duration = 3000,
}: PartnerActivityToastProps) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (visible) {
      // Slide in from top with spring animation
      translateY.value = withSpring(0, { damping: 15, stiffness: 180 });
      opacity.value = withSpring(1);
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });

      // Light haptic feedback
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Haptics not available
      }

      // Auto dismiss after duration
      const timeout = setTimeout(() => {
        // Fade out with slide up
        translateY.value = withTiming(-100, { duration: 250 });
        opacity.value = withDelay(
          150,
          withTiming(0, { duration: 100 }, () => {
            runOnJS(handleDismiss)();
          })
        );
      }, duration);

      return () => clearTimeout(timeout);
    } else {
      translateY.value = -100;
      opacity.value = 0;
      scale.value = 0.9;
    }
  }, [visible, duration, handleDismiss, translateY, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const handlePress = useCallback(() => {
    // Dismiss immediately
    translateY.value = withTiming(-100, { duration: 200 });
    opacity.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(handleDismiss)();
    });

    // Call onPress if provided (for scroll-to functionality)
    if (onPress) {
      onPress();
    }
  }, [onPress, handleDismiss, translateY, opacity]);

  // Get emoji for the item
  const itemEmoji = getItemEmoji(itemName);

  // Get partner's first name
  const firstName = partnerName?.split(" ")[0] || "Partner";

  if (!visible) return null;

  return (
    <Animated.View
      style={animatedStyle}
      className="absolute left-4 right-4 top-16 z-50"
    >
      <Pressable
        onPress={handlePress}
        accessibilityLabel={`${firstName} added ${itemName}. Tap to view.`}
        accessibilityRole="button"
      >
        <Animated.View
          entering={FadeIn.duration(100)}
          className="flex-row items-center rounded-full bg-warm-gray-900 px-4 py-3 shadow-lg"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          {/* Partner Avatar */}
          <UserAvatar
            name={partnerName}
            imageUrl={partnerImageUrl}
            size={32}
            showTooltip={false}
          />

          {/* Message */}
          <View className="ml-3 flex-1">
            <Text
              className="text-base text-white"
              numberOfLines={1}
            >
              <Text className="font-semibold">{firstName}</Text>
              <Text> added </Text>
              <Text className="font-semibold">{itemName}</Text>
              <Text> {itemEmoji}</Text>
            </Text>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
