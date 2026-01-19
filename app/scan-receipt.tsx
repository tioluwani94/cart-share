import { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, Image, Dimensions, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ChevronLeft, Camera, X, Check, RotateCcw } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  runOnJS,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GUIDE_FRAME_WIDTH = SCREEN_WIDTH * 0.85;
const GUIDE_FRAME_HEIGHT = SCREEN_HEIGHT * 0.5;

/**
 * Receipt camera screen with playful UI and animations.
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
  const guideFrameScale = useSharedValue(1);
  const guideFrameOpacity = useSharedValue(0.8);

  // Pulsing guide frame animation
  useEffect(() => {
    guideFrameScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    guideFrameOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const guideFrameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: guideFrameScale.value }],
    opacity: guideFrameOpacity.value,
  }));

  const captureAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureScale.value }],
  }));

  const flashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const handleCapture = async () => {
    if (isCapturing || !cameraRef.current) return;
    setIsCapturing(true);

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Scale animation on capture button
    captureScale.value = withSequence(
      withSpring(0.85, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );

    // Flash effect
    flashOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 200 })
    );

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: Platform.OS === "android",
      });

      if (photo?.uri) {
        setCapturedPhoto(photo.uri);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        <View className="flex-1 items-center justify-center">
          <Text className="text-warm-gray-600">Loading camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-background-light">
        {/* Header */}
        <View className="flex-row items-center border-b border-warm-gray-100 bg-white px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-warm-gray-100"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={24} color="#57534E" strokeWidth={2} />
          </Pressable>
          <Text className="text-xl font-bold text-warm-gray-900">
            Snap your receipt! 📸
          </Text>
        </View>

        <Animated.View
          entering={FadeInDown.duration(400)}
          className="flex-1 items-center justify-center px-8"
        >
          <View className="h-24 w-24 items-center justify-center rounded-full bg-coral/20">
            <Camera size={48} color="#FF6B6B" strokeWidth={1.5} />
          </View>

          <Text className="mt-6 text-center text-2xl font-bold text-warm-gray-900">
            Camera Access Needed
          </Text>

          <Text className="mt-3 text-center text-base text-warm-gray-600">
            We need camera permission to scan your receipts and help you track spending.
          </Text>

          <Pressable
            onPress={requestPermission}
            className="mt-8 rounded-2xl bg-coral px-8 py-4"
            accessibilityLabel="Grant camera access"
          >
            <Text className="text-base font-semibold text-white">
              Enable Camera
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            className="mt-4 px-8 py-3"
            accessibilityLabel="Go back without enabling camera"
          >
            <Text className="text-base text-warm-gray-500">
              Maybe Later
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Photo captured - show preview
  if (capturedPhoto) {
    return (
      <SafeAreaView className="flex-1 bg-warm-gray-900">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable
            onPress={handleRetake}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
            accessibilityLabel="Close preview"
          >
            <X size={24} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <Animated.Text
            entering={FadeIn.duration(300)}
            className="text-xl font-bold text-white"
          >
            Looks good! 📋
          </Animated.Text>
          <View className="h-10 w-10" />
        </View>

        {/* Photo Preview */}
        <View className="flex-1 items-center justify-center px-4">
          <Animated.View
            entering={FadeInUp.duration(400).springify()}
            className="overflow-hidden rounded-3xl"
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
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(200).duration(400)}
            className="mt-6 text-center text-base text-warm-gray-300"
          >
            Make sure the total is visible and clear
          </Animated.Text>
        </View>

        {/* Action Buttons */}
        <View className="flex-row items-center justify-center gap-6 px-6 pb-8">
          {/* Retake Button */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Pressable
              onPress={handleRetake}
              className="h-16 w-16 items-center justify-center rounded-full bg-white/10"
              accessibilityLabel="Retake photo"
            >
              <RotateCcw size={28} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <Text className="mt-2 text-center text-sm text-warm-gray-400">
              Retake
            </Text>
          </Animated.View>

          {/* Confirm Button */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <Pressable
              onPress={handleConfirm}
              className="h-20 w-20 items-center justify-center rounded-full bg-coral"
              style={{
                shadowColor: "#FF6B6B",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
              }}
              accessibilityLabel="Confirm photo"
            >
              <Check size={36} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
            <Text className="mt-2 text-center text-sm text-white font-medium">
              Use Photo
            </Text>
          </Animated.View>

          {/* Spacer for alignment */}
          <View className="h-16 w-16" />
        </View>
      </SafeAreaView>
    );
  }

  // Camera view
  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
      >
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full bg-black/30"
              accessibilityLabel="Go back"
            >
              <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <Animated.Text
              entering={FadeIn.duration(400)}
              className="text-xl font-bold text-white"
              style={{
                textShadowColor: "rgba(0, 0, 0, 0.5)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              Snap your receipt! 📸
            </Animated.Text>
            <View className="h-10 w-10" />
          </View>

          {/* Guide Frame */}
          <View className="flex-1 items-center justify-center">
            <Animated.View
              entering={FadeIn.delay(200).duration(500)}
              style={[
                guideFrameAnimatedStyle,
                {
                  width: GUIDE_FRAME_WIDTH,
                  height: GUIDE_FRAME_HEIGHT,
                  borderWidth: 3,
                  borderColor: "#FFFFFF",
                  borderRadius: 24,
                  borderStyle: "dashed",
                },
              ]}
            >
              {/* Corner accents */}
              <View className="absolute -left-1 -top-1 h-8 w-8 border-l-4 border-t-4 border-coral rounded-tl-lg" />
              <View className="absolute -right-1 -top-1 h-8 w-8 border-r-4 border-t-4 border-coral rounded-tr-lg" />
              <View className="absolute -bottom-1 -left-1 h-8 w-8 border-b-4 border-l-4 border-coral rounded-bl-lg" />
              <View className="absolute -bottom-1 -right-1 h-8 w-8 border-b-4 border-r-4 border-coral rounded-br-lg" />
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.delay(400).duration(500)}
              className="mt-6 text-center text-base text-white font-medium px-8"
              style={{
                textShadowColor: "rgba(0, 0, 0, 0.5)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              Line up your receipt inside the frame
            </Animated.Text>
          </View>

          {/* Capture Button */}
          <View className="items-center pb-10">
            <Animated.View
              entering={FadeInUp.delay(300).duration(500).springify()}
              style={captureAnimatedStyle}
            >
              <Pressable
                onPress={handleCapture}
                disabled={isCapturing}
                className="h-20 w-20 items-center justify-center rounded-full bg-coral"
                style={{
                  shadowColor: "#FF6B6B",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.5,
                  shadowRadius: 12,
                  elevation: 8,
                }}
                accessibilityLabel="Take photo"
                accessibilityHint="Double tap to capture your receipt"
              >
                <View className="h-16 w-16 items-center justify-center rounded-full border-4 border-white">
                  <Camera size={28} color="#FFFFFF" strokeWidth={2} />
                </View>
              </Pressable>
            </Animated.View>

            <Animated.Text
              entering={FadeInUp.delay(500).duration(400)}
              className="mt-4 text-sm text-white/70"
            >
              Tap to capture
            </Animated.Text>
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
