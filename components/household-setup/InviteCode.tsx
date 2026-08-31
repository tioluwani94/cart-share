import { Button } from "@/components/ui/Button";
import { Pressable, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  AnimatedStyle,
} from "react-native-reanimated";
import { ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface InviteCodeProps {
  /** The invite code to display */
  inviteCode: string;
  /** Name of the household joined */
  householdName: string;
  /** Handler for continuing after viewing the invite code */
  handleContinue: () => void;
  /** Handler for copying the invite code */
  handleCopyCode: () => void;
  /** Whether the invite code has been copied */
  copied: boolean;

  copyAnimatedStyle: AnimatedStyle<ViewStyle>;
}
export const InviteCode = (props: InviteCodeProps) => {
  const {
    copied,
    inviteCode,
    householdName,
    copyAnimatedStyle,
    handleContinue,
    handleCopyCode,
  } = props;

  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <View className="flex-1 px-6 pt-10">
        {/* Celebration Header */}
        <Animated.View
          entering={FadeInUp.delay(100).springify().damping(90)}
          className="items-center"
        >
          <Text className="text-5xl">🎉</Text>
          <Text
            className="mt-5 text-center text-[34px] leading-[40px] tracking-tight text-warm-gray-900"
            style={{ fontFamily: "Nunito_900Black" }}
          >
            Household ready
          </Text>
          <Text className="mt-2 text-center text-base text-warm-gray-600">
            Welcome to {householdName}
          </Text>
        </Animated.View>

        {/* Invite Code Card */}
        <Animated.View
          entering={FadeInUp.delay(200).springify().damping(90)}
          className="mt-10 rounded-3xl border border-warm-gray-200 bg-white p-6 shadow-warm"
        >
          <Text className="text-center text-sm font-semibold text-warm-gray-600">
            Invite code
          </Text>

          {/* Large Invite Code Display */}
          <View className="mt-4 rounded-2xl bg-warm-gray-50 py-6">
            <Text
              className="text-center text-4xl font-bold tracking-[8px] text-coral"
              accessibilityLabel={`Invite code: ${inviteCode.split("").join(" ")}`}
            >
              {inviteCode}
            </Text>
          </View>

          {/* Copy Button */}
          <Animated.View style={copyAnimatedStyle} className="mt-4">
            <Pressable
              onPress={handleCopyCode}
              className="flex-row items-center justify-center rounded-full bg-teal/10 py-3"
              accessibilityLabel={
                copied ? "Copied to clipboard" : "Copy invite code"
              }
              accessibilityRole="button"
            >
              <Text className="text-lg font-semibold text-teal">
                {copied ? "Copied!" : "Copy Code"}
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* Reassurance */}
        <Animated.View
          entering={FadeInUp.delay(300).springify().damping(90)}
          className="mt-5 px-4"
        >
          <Text className="text-center text-sm leading-5 text-warm-gray-500">
            Share it now, or find it later in Settings.
          </Text>
        </Animated.View>

        {/* Continue Button */}
        <Animated.View
          entering={FadeInDown.delay(400).springify().damping(90)}
          className="mt-auto pb-8"
        >
          <Button
            onPress={handleContinue}
            size="lg"
            className="w-full"
            forceSolid
          >
            Set up your plan
          </Button>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};
