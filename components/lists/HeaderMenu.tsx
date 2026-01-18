import * as Haptics from "expo-haptics";
import { Archive, MoreHorizontal } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface HeaderMenuProps {
  onArchive: () => void;
}

export function HeaderMenu({ onArchive }: HeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonScale = useSharedValue(1);

  const toggleMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(!isOpen);
  };

  const handleArchive = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOpen(false);
    onArchive();
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.9);
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1);
  };

  return (
    <>
      {/* Menu button */}
      <Animated.View style={buttonStyle}>
        <TouchableOpacity
          onPress={toggleMenu}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          className="h-10 w-10 items-center justify-center rounded-full bg-warm-gray-100"
          accessibilityLabel="More options"
          accessibilityRole="button"
        >
          <MoreHorizontal size={22} color="#57534E" strokeWidth={2} />
        </TouchableOpacity>
      </Animated.View>

      {/* Menu dropdown */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="absolute inset-0"
          onPress={() => setIsOpen(false)}
          accessibilityLabel="Close menu"
        />
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          className="absolute right-4 top-28"
        >
          <Animated.View
            entering={SlideInRight.springify().damping(90)}
            exiting={SlideOutRight.duration(150)}
            className="min-w-[180px] rounded-2xl bg-white p-2 shadow-lg"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Pressable
              onPress={handleArchive}
              className="flex-row items-center gap-3 rounded-xl px-4 py-3 active:bg-warm-gray-100"
              accessibilityLabel="Archive list"
              accessibilityRole="menuitem"
            >
              <Archive size={20} color="#78716C" strokeWidth={2} />
              <Text className="text-base text-warm-gray-700">Archive list</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}
