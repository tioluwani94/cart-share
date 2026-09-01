import { Button, PageHeader } from "@/components/ui";
import { themeColors } from "@/lib/theme";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Camera, Check, RotateCcw } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GUIDE_FRAME_WIDTH = SCREEN_WIDTH * 0.85;
const GUIDE_FRAME_HEIGHT = SCREEN_HEIGHT * 0.5;

/**
 * Receipt camera screen.
 * Implements US-034.
 */
export default function ScanReceiptScreen() {
  const { listId } = useLocalSearchParams<{ listId?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Animation values
  const captureScale = useSharedValue(1);
  const flashOpacity = useSharedValue(0);
  const captureAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureScale.get() }],
  }));

  const flashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.get(),
  }));

  const handleCapture = async () => {
    if (isCapturing || !cameraRef.current) return;
    setIsCapturing(true);

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    flashOpacity.set(
      withSequence(
        withTiming(1, { duration: 100, reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 160, reduceMotion: ReduceMotion.System }),
      ),
    );

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: Platform.OS === "android",
      });

      if (photo?.uri) {
        setCapturedPhoto(photo.uri);
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
    } catch (error) {
      console.error("Error capturing photo:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCapturedPhoto(null);
  };

  const handleConfirm = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to receipt confirmation with the captured photo
    router.push({
      pathname: "/receipt-confirm",
      params: { photoUri: capturedPhoto, listId },
    });
  };

  // Permission not yet determined
  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-background-light">
        <PageHeader title="Scan receipt" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-ink-secondary">Loading camera…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-background-light">
        <PageHeader title="Scan receipt" onBack={() => router.back()} />

        <View className="flex-1 items-center justify-center px-6 pb-10">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-coral-soft">
            <Camera size={30} color={themeColors.coral} strokeWidth={2} />
          </View>

          <Text className="mt-5 text-center text-3xl font-heading tracking-tight text-ink">
            Camera access needed
          </Text>

          <Text className="mt-3 max-w-sm text-center text-[17px] leading-6 text-ink-secondary">
            Allow camera access to scan a receipt and add the total to this trip.
          </Text>

          <Button
            onPress={requestPermission}
            size="lg"
            className="mt-8 w-full"
            accessibilityLabel="Grant camera access"
          >
            Enable camera
          </Button>

          <Button
            variant="ghost"
            size="md"
            onPress={() => router.back()}
            className="mt-4"
            accessibilityLabel="Go back without enabling camera"
          >
            Maybe later
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Photo captured - show preview
  if (capturedPhoto) {
    return (
      <SafeAreaView className="flex-1 bg-warm-gray-900">
        <PageHeader
          title="Review photo"
          onBack={handleRetake}
          appearance="overlay"
          leadingIcon="close"
          backLabel="Retake photo"
        />

        {/* Photo Preview */}
        <View className="flex-1 items-center justify-center px-4">
          <View
            className="overflow-hidden rounded-3xl border border-white/20 bg-black"
            style={{
              width: GUIDE_FRAME_WIDTH,
              height: GUIDE_FRAME_HEIGHT,
            }}
          >
            <Image
              source={{ uri: capturedPhoto }}
              style={{
                width: "100%",
                height: "100%",
              }}
              resizeMode="cover"
            />
          </View>

          <Text className="mt-6 text-center text-[17px] leading-6 text-white/75">
            Make sure the total is visible and clear
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="flex-row items-center justify-center gap-6 px-6 pb-8">
          {/* Retake Button */}
          <View>
            <Pressable
              onPress={handleRetake}
              className="h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 active:opacity-70"
              accessibilityLabel="Retake photo"
            >
              <RotateCcw size={28} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <Text className="mt-2 text-center text-sm text-warm-gray-400">
              Retake
            </Text>
          </View>

          {/* Confirm Button */}
          <View>
            <Pressable
              onPress={handleConfirm}
              className="h-20 w-20 items-center justify-center rounded-full bg-coral active:opacity-80"
              accessibilityLabel="Confirm photo"
            >
              <Check size={36} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
            <Text className="mt-2 text-center text-sm text-white font-medium">
              Use photo
            </Text>
          </View>

          {/* Spacer for alignment */}
          <View className="h-16 w-16" />
        </View>
      </SafeAreaView>
    );
  }

  // Camera view
  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
        <SafeAreaView className="flex-1">
          <PageHeader
            title="Scan receipt"
            onBack={() => router.back()}
            appearance="overlay"
          />

          {/* Guide Frame */}
          <View className="flex-1 items-center justify-center">
            <View
              style={{
                width: GUIDE_FRAME_WIDTH,
                height: GUIDE_FRAME_HEIGHT,
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.78)",
                borderRadius: 24,
              }}
            >
              {/* Corner accents */}
              <View className="absolute -left-1 -top-1 h-8 w-8 border-l-4 border-t-4 border-coral rounded-tl-lg" />
              <View className="absolute -right-1 -top-1 h-8 w-8 border-r-4 border-t-4 border-coral rounded-tr-lg" />
              <View className="absolute -bottom-1 -left-1 h-8 w-8 border-b-4 border-l-4 border-coral rounded-bl-lg" />
              <View className="absolute -bottom-1 -right-1 h-8 w-8 border-b-4 border-r-4 border-coral rounded-br-lg" />
            </View>

            <Text
              className="mt-6 px-8 text-center text-[17px] font-semibold leading-6 text-white"
              style={{
                textShadowColor: "rgba(0, 0, 0, 0.5)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              Line up your receipt inside the frame
            </Text>
          </View>

          {/* Capture Button */}
          <View className="items-center pb-10">
            <Animated.View style={captureAnimatedStyle}>
              <Pressable
                onPress={handleCapture}
                onPressIn={() =>
                  captureScale.set(
                    withSpring(0.96, {
                      duration: 160,
                      dampingRatio: 1,
                      reduceMotion: ReduceMotion.System,
                    }),
                  )
                }
                onPressOut={() =>
                  captureScale.set(
                    withSpring(1, {
                      duration: 160,
                      dampingRatio: 1,
                      reduceMotion: ReduceMotion.System,
                    }),
                  )
                }
                disabled={isCapturing}
                className="h-20 w-20 items-center justify-center rounded-full bg-coral"
                accessibilityLabel="Take photo"
                accessibilityHint="Double tap to capture your receipt"
              >
                <View className="h-16 w-16 items-center justify-center rounded-full border-4 border-white">
                  <Camera size={28} color="#FFFFFF" strokeWidth={2} />
                </View>
              </Pressable>
            </Animated.View>

            <Text className="mt-4 text-sm text-white/70">
              Tap to capture
            </Text>
          </View>

          {/* Camera Flash Effect */}
          <Animated.View
            pointerEvents="none"
            style={[
              flashAnimatedStyle,
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "#FFFFFF",
              },
            ]}
          />
        </SafeAreaView>
      </CameraView>
    </View>
  );
}
