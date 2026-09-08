import { Button } from "@/components/ui/Button";
import { keyboardDismissScrollProps } from "@/lib/keyboard";
import { Image } from "expo-image";
import { ChevronLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

interface OnboardingFormScreenProps {
  artworkSource: number;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  onBack?: () => void;
  backAccessibilityHint?: string;
}

/**
 * Shared Yazio-inspired form frame for short onboarding decisions.
 * Native stack navigation owns screen movement; this component owns layout.
 */
export function OnboardingFormScreen({
  artworkSource,
  title,
  description,
  children,
  footer,
  onBack,
  backAccessibilityHint = "Returns to the previous household setup screen",
}: OnboardingFormScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      className="flex-1 bg-background-light"
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="h-14 justify-center px-6">
          {onBack ? (
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onPress={onBack}
              className="-ml-3"
              accessibilityLabel="Go back"
              accessibilityHint={backAccessibilityHint}
            >
              <ChevronLeft size={29} strokeWidth={2.25} color="#1A1917" />
            </Button>
          ) : null}
        </View>

        <ScrollView
          {...keyboardDismissScrollProps}
          className="flex-1"
          contentContainerClassName="flex-grow px-6 pb-8"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center">
            <Image
              source={artworkSource}
              contentFit="contain"
              style={{ width: 144, height: 144 }}
              accessible={false}
              accessibilityElementsHidden
            />
            <Text
              className="font-heading mt-3 text-center text-[34px] leading-[40px] tracking-tight text-ink"
              accessibilityRole="header"
            >
              {title}
            </Text>
            <Text className="mt-3 text-center text-[17px] leading-[25px] text-ink-secondary">
              {description}
            </Text>
          </View>

          <View className="mt-9">{children}</View>
        </ScrollView>

        <View
          className="border-t border-separator bg-background-light px-6 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          {footer}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
