import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, Pressable, Image, TextInput, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  RotateCcw,
  Receipt,
  CheckCircle2,
  Edit3,
  DollarSign,
  Check,
  ShoppingCart,
} from "lucide-react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UploadProgressRing, Button } from "@/components/ui";
import type { Id } from "@/convex/_generated/dataModel";

type ScreenState =
  | "uploading"
  | "processing"
  | "success"
  | "manual_entry"
  | "upload_error"
  | "ocr_error"
  | "saving_session"
  | "session_saved";

// Confetti emoji particles for celebration
const CONFETTI_EMOJIS = ["🎉", "✨", "🎊", "💫", "🌟", "⭐", "🥳", "💸"];

/**
 * Receipt confirmation screen with upload, OCR processing, and celebratory UI.
 */
export default function ReceiptConfirmScreen() {
  const { photoUri, listId } = useLocalSearchParams<{
    photoUri?: string;
    listId?: string;
  }>();

  const [screenState, setScreenState] = useState<ScreenState>("uploading");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [storageId, setStorageId] = useState<Id<"_storage"> | null>(null);
  const [extractedTotal, setExtractedTotal] = useState<number | null>(null); // In cents
  const [manualAmount, setManualAmount] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [monthlySessionCount, setMonthlySessionCount] = useState(0);

  // Queries and mutations
  const household = useQuery(api.households.getCurrentHousehold);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const processReceipt = useAction(api.vision.processReceipt);
  const createSession = useMutation(api.sessions.create);
  const monthlyCount = useQuery(
    api.sessions.getMonthlySessionCount,
    household?._id ? { householdId: household._id } : "skip"
  );

  const inputRef = useRef<TextInput>(null);

  // Animation values
  const scanLinePosition = useSharedValue(0);
  const scanOpacity = useSharedValue(0);
  const successScale = useSharedValue(0);
  const totalScale = useSharedValue(0);
  const checkmarkScale = useSharedValue(0);
  const checkmarkRotation = useSharedValue(0);
  const statsOpacity = useSharedValue(0);

  // Scanning line animation style
  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLinePosition.value }],
    opacity: scanOpacity.value,
  }));

  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  const totalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: totalScale.value }],
  }));

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: checkmarkScale.value },
      { rotate: `${checkmarkRotation.value}deg` },
    ],
  }));

  const statsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
  }));

  // Format cents to dollars
  const formatCentsToDollars = (cents: number): string => {
    const dollars = cents / 100;
    return dollars.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  // Start scanning animation
  const startScanningAnimation = useCallback(() => {
    scanOpacity.value = withTiming(1, { duration: 300 });
    // Animate scan line up and down repeatedly
    scanLinePosition.value = withRepeat(
      withSequence(
        withTiming(200, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Infinite repeat
      false // Don't reverse
    );
  }, [scanLinePosition, scanOpacity]);

  // Stop scanning animation
  const stopScanningAnimation = useCallback(() => {
    scanOpacity.value = withTiming(0, { duration: 200 });
    scanLinePosition.value = 0;
  }, [scanLinePosition, scanOpacity]);

  // Process OCR
  const runOCR = useCallback(async (imageStorageId: Id<"_storage">) => {
    setScreenState("processing");
    startScanningAnimation();

    try {
      const result = await processReceipt({ imageId: imageStorageId });

      stopScanningAnimation();

      if (result.success && result.extractedTotal !== null) {
        // Success! Found the total
        setExtractedTotal(result.extractedTotal);
        setScreenState("success");
        setShowConfetti(true);

        // Animate success elements
        successScale.value = withSequence(
          withSpring(1.1, { damping: 8, stiffness: 150 }),
          withSpring(1, { damping: 10, stiffness: 200 })
        );

        totalScale.value = withSequence(
          withTiming(0, { duration: 0 }),
          withSpring(1.2, { damping: 6, stiffness: 120 }),
          withSpring(1, { damping: 8, stiffness: 150 })
        );

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Hide confetti after 3 seconds
        setTimeout(() => setShowConfetti(false), 3000);
      } else {
        // OCR worked but couldn't find total, or failed
        setScreenState("ocr_error");
        setErrorMessage(result.error || "We couldn't read the total from your receipt.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (error) {
      console.error("OCR error:", error);
      stopScanningAnimation();
      setScreenState("ocr_error");
      setErrorMessage("Something went wrong while reading your receipt.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [processReceipt, startScanningAnimation, stopScanningAnimation, successScale, totalScale]);

  // Upload the receipt image
  const uploadReceipt = useCallback(async () => {
    if (!photoUri) return;

    setScreenState("uploading");
    setUploadProgress(0);
    setErrorMessage("");

    try {
      // Step 1: Generate upload URL (10%)
      setUploadProgress(10);
      const uploadUrl = await generateUploadUrl();

      // Step 2: Read the image file (20%)
      setUploadProgress(20);
      const response = await fetch(photoUri);
      const blob = await response.blob();

      // Step 3: Upload to Convex storage (20-85%)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev < 85) {
            return prev + Math.random() * 10;
          }
          return prev;
        });
      }, 200);

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": blob.type || "image/jpeg",
        },
        body: blob,
      });

      clearInterval(progressInterval);

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      // Step 4: Get storage ID (95%)
      setUploadProgress(95);
      const { storageId: newStorageId } = await uploadResponse.json();

      // Step 5: Complete (100%)
      setUploadProgress(100);
      setStorageId(newStorageId);

      // Brief pause then start OCR
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Start OCR processing
      runOCR(newStorageId);
    } catch (error) {
      console.error("Upload error:", error);
      setScreenState("upload_error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again!"
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [photoUri, generateUploadUrl, runOCR]);

  // Auto-start upload when screen loads
  useEffect(() => {
    if (photoUri && screenState === "uploading") {
      const timer = setTimeout(() => {
        uploadReceipt();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [photoUri]);

  // Handle confirm button - create session and show celebration
  const handleConfirm = async () => {
    const totalCents = extractedTotal;
    if (!totalCents || !household?._id) return;

    setScreenState("saving_session");

    try {
      // Create the shopping session
      await createSession({
        householdId: household._id,
        totalAmount: totalCents,
        listId: listId ? (listId as Id<"lists">) : undefined,
        receiptImageId: storageId ?? undefined,
      });

      // Update monthly count for display (current count + 1 for the new session)
      const currentCount = monthlyCount?.count ?? 0;
      setMonthlySessionCount(currentCount + 1);

      // Transition to session saved state
      setScreenState("session_saved");
      setShowConfetti(true);

      // Animate checkmark
      checkmarkScale.value = withSequence(
        withSpring(1.3, { damping: 6, stiffness: 120 }),
        withSpring(1, { damping: 8, stiffness: 150 })
      );
      checkmarkRotation.value = withSequence(
        withTiming(-15, { duration: 100 }),
        withSpring(0, { damping: 10, stiffness: 200 })
      );

      // Fade in stats after checkmark
      setTimeout(() => {
        statsOpacity.value = withTiming(1, { duration: 500 });
      }, 400);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Auto-navigate to home after 2 seconds
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 2500);

      // Hide confetti after 3 seconds
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (error) {
      console.error("Error creating session:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // On error, go back to success state so user can try again
      setScreenState("success");
    }
  };

  // Handle manual entry submission
  const handleManualSubmit = () => {
    const amount = parseFloat(manualAmount.replace(/[^0-9.]/g, ""));
    if (isNaN(amount) || amount <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const totalCents = Math.round(amount * 100);
    setExtractedTotal(totalCents);
    setScreenState("success");
    setShowConfetti(true);

    successScale.value = withSequence(
      withSpring(1.1, { damping: 8, stiffness: 150 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );

    totalScale.value = withSequence(
      withTiming(0, { duration: 0 }),
      withSpring(1.2, { damping: 6, stiffness: 120 }),
      withSpring(1, { damping: 8, stiffness: 150 })
    );

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Keyboard.dismiss();

    setTimeout(() => setShowConfetti(false), 3000);
  };

  // Switch to manual entry
  const handleNotQuite = () => {
    setScreenState("manual_entry");
    // Pre-fill with extracted amount if available
    if (extractedTotal) {
      setManualAmount((extractedTotal / 100).toFixed(2));
    }
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  // Render confetti particles
  const renderConfetti = () => {
    if (!showConfetti) return null;

    return (
      <View className="absolute inset-0 pointer-events-none" style={{ zIndex: 100 }}>
        {Array.from({ length: 20 }).map((_, index) => {
          const emoji = CONFETTI_EMOJIS[index % CONFETTI_EMOJIS.length];
          const startX = Math.random() * 100;
          const delay = index * 80;

          return (
            <ConfettiParticle
              key={index}
              emoji={emoji}
              startX={startX}
              delay={delay}
            />
          );
        })}
      </View>
    );
  };

  // Render scanning effect overlay
  const renderScanningOverlay = () => (
    <View className="absolute inset-0 overflow-hidden rounded-2xl">
      {/* Scan line */}
      <Animated.View
        style={scanLineStyle}
        className="absolute left-0 right-0 h-1 bg-teal shadow-lg"
      />
      {/* Corner accents */}
      <View className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-teal rounded-tl-lg" />
      <View className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-teal rounded-tr-lg" />
      <View className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-teal rounded-bl-lg" />
      <View className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-teal rounded-br-lg" />
      {/* Subtle overlay */}
      <View className="absolute inset-0 bg-teal/10" />
    </View>
  );

  // Render content based on state
  const renderContent = () => {
    switch (screenState) {
      case "uploading":
        return (
          <Animated.View
            entering={FadeIn.duration(400)}
            className="items-center"
          >
            {/* Receipt preview thumbnail */}
            {photoUri && (
              <View className="mb-8 h-32 w-32 overflow-hidden rounded-2xl shadow-md">
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Progress Ring */}
            <UploadProgressRing
              progress={uploadProgress}
              isUploading={true}
              size={140}
              strokeWidth={10}
            />

            <Text className="mt-6 text-center text-sm text-warm-gray-500">
              Uploading your receipt...
            </Text>
          </Animated.View>
        );

      case "processing":
        return (
          <Animated.View
            entering={FadeIn.duration(400)}
            className="items-center"
          >
            {/* Receipt preview with scanning effect */}
            {photoUri && (
              <View className="relative mb-8 h-56 w-44 overflow-hidden rounded-2xl shadow-lg">
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
                {renderScanningOverlay()}
              </View>
            )}

            <Text className="text-xl font-bold text-warm-gray-900">
              Reading your receipt...
            </Text>

            <Text className="mt-2 text-center text-sm text-warm-gray-500">
              Looking for the total amount
            </Text>

            {/* Animated dots */}
            <View className="mt-4 flex-row">
              {[0, 1, 2].map((i) => (
                <AnimatedDot key={i} delay={i * 200} />
              ))}
            </View>
          </Animated.View>
        );

      case "success":
        return (
          <Animated.View
            entering={FadeInUp.springify().damping(12)}
            className="items-center"
          >
            {/* Success icon */}
            <Animated.View
              style={successAnimatedStyle}
              className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-teal/20"
            >
              <CheckCircle2 size={48} color="#4ECDC4" strokeWidth={2} />
            </Animated.View>

            <Text className="text-center text-xl font-bold text-warm-gray-900">
              Found it! 🎉
            </Text>

            {/* Large extracted total */}
            {extractedTotal !== null && (
              <Animated.View style={totalAnimatedStyle} className="my-6">
                <Text className="text-center text-5xl font-bold text-coral">
                  {formatCentsToDollars(extractedTotal)}
                </Text>
              </Animated.View>
            )}

            {/* Receipt thumbnail */}
            {photoUri && (
              <View className="mb-6 h-28 w-28 overflow-hidden rounded-xl shadow-md">
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Confirm button */}
            <Button
              variant="primary"
              size="lg"
              onPress={handleConfirm}
              className="w-full"
            >
              <View className="flex-row items-center">
                <CheckCircle2 size={20} color="white" strokeWidth={2} />
                <Text className="ml-2 text-base font-semibold text-white">
                  That's right!
                </Text>
              </View>
            </Button>

            {/* Edit option */}
            <Pressable
              onPress={handleNotQuite}
              className="mt-4 flex-row items-center py-2"
              accessibilityLabel="Edit amount manually"
            >
              <Edit3 size={16} color="#6B6B6B" strokeWidth={2} />
              <Text className="ml-2 text-base text-warm-gray-600 underline">
                Not quite — let me fix it
              </Text>
            </Pressable>
          </Animated.View>
        );

      case "manual_entry":
        return (
          <Animated.View
            entering={FadeInDown.duration(400)}
            className="items-center w-full"
          >
            {/* Icon */}
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-teal/20">
              <DollarSign size={32} color="#4ECDC4" strokeWidth={2} />
            </View>

            <Text className="text-center text-xl font-bold text-warm-gray-900">
              Enter the total
            </Text>

            <Text className="mt-2 mb-6 text-center text-sm text-warm-gray-500">
              Type the total from your receipt
            </Text>

            {/* Manual input */}
            <View className="w-full px-4">
              <View className="relative">
                <Text className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-warm-gray-400 z-10">
                  $
                </Text>
                <TextInput
                  ref={inputRef}
                  value={manualAmount}
                  onChangeText={setManualAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#A9A69E"
                  className="h-16 w-full rounded-2xl border-2 border-warm-gray-200 bg-white pl-12 pr-4 text-3xl font-bold text-warm-gray-900 text-center"
                  maxLength={10}
                  accessibilityLabel="Enter total amount"
                />
              </View>
            </View>

            {/* Submit button */}
            <Button
              variant="primary"
              size="lg"
              onPress={handleManualSubmit}
              className="mt-6 w-full"
              disabled={!manualAmount || parseFloat(manualAmount) <= 0}
            >
              <View className="flex-row items-center">
                <CheckCircle2 size={20} color="white" strokeWidth={2} />
                <Text className="ml-2 text-base font-semibold text-white">
                  Confirm Amount
                </Text>
              </View>
            </Button>

            {/* Skip option */}
            <Button
              variant="ghost"
              size="md"
              onPress={() => router.replace("/(tabs)")}
              className="mt-4"
            >
              Skip for now
            </Button>
          </Animated.View>
        );

      case "ocr_error":
        return (
          <Animated.View
            entering={FadeInDown.duration(400)}
            className="items-center"
          >
            {/* Error illustration */}
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-coral/20">
              <Receipt size={40} color="#FF6B6B" strokeWidth={1.5} />
            </View>

            <Text className="text-center text-xl font-bold text-warm-gray-900">
              We couldn't read that 😅
            </Text>

            <Text className="mt-2 text-center text-base text-warm-gray-600 px-4">
              {errorMessage || "No worries! You can enter the total manually."}
            </Text>

            {/* Receipt preview */}
            {photoUri && (
              <View className="my-6 h-32 w-32 overflow-hidden rounded-xl shadow-md opacity-60">
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Manual entry button */}
            <Button
              variant="primary"
              size="lg"
              onPress={() => {
                setScreenState("manual_entry");
                setTimeout(() => inputRef.current?.focus(), 300);
              }}
              className="w-full"
            >
              <View className="flex-row items-center">
                <Edit3 size={20} color="white" strokeWidth={2} />
                <Text className="ml-2 text-base font-semibold text-white">
                  Enter it manually
                </Text>
              </View>
            </Button>

            {/* Retake option */}
            <Button
              variant="ghost"
              size="md"
              onPress={() => router.back()}
              className="mt-4"
            >
              <View className="flex-row items-center">
                <RotateCcw size={16} color="#6B6B6B" strokeWidth={2} />
                <Text className="ml-2 text-base text-warm-gray-600">
                  Retake photo
                </Text>
              </View>
            </Button>

            {/* Skip option */}
            <Button
              variant="ghost"
              size="md"
              onPress={() => router.replace("/(tabs)")}
              className="mt-2"
            >
              Skip for now
            </Button>
          </Animated.View>
        );

      case "upload_error":
        return (
          <Animated.View
            entering={FadeInDown.duration(400)}
            className="items-center"
          >
            {/* Error illustration */}
            <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-coral/20">
              <Receipt size={48} color="#FF6B6B" strokeWidth={1.5} />
            </View>

            <Text className="text-center text-2xl font-bold text-warm-gray-900">
              Oops! Something went wrong
            </Text>

            <Text className="mt-2 text-center text-base text-warm-gray-600">
              {errorMessage || "We couldn't upload your receipt. Let's try again!"}
            </Text>

            {/* Retry button */}
            <Button
              variant="primary"
              size="lg"
              onPress={() => {
                setScreenState("uploading");
                setUploadProgress(0);
                setTimeout(uploadReceipt, 100);
              }}
              className="mt-8 w-full"
            >
              <View className="flex-row items-center">
                <RotateCcw size={20} color="white" strokeWidth={2} />
                <Text className="ml-2 text-base font-semibold text-white">
                  Try Again
                </Text>
              </View>
            </Button>

            {/* Skip option */}
            <Button
              variant="ghost"
              size="md"
              onPress={() => router.replace("/(tabs)")}
              className="mt-4"
            >
              Skip for now
            </Button>
          </Animated.View>
        );

      case "saving_session":
        return (
          <Animated.View
            entering={FadeIn.duration(300)}
            className="items-center"
          >
            {/* Saving animation */}
            <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-teal/20">
              <ShoppingCart size={48} color="#4ECDC4" strokeWidth={1.5} />
            </View>

            <Text className="text-center text-xl font-bold text-warm-gray-900">
              Saving your trip...
            </Text>

            {/* Animated dots */}
            <View className="mt-4 flex-row">
              {[0, 1, 2].map((i) => (
                <AnimatedDot key={i} delay={i * 200} />
              ))}
            </View>
          </Animated.View>
        );

      case "session_saved":
        return (
          <Animated.View
            entering={FadeInUp.springify().damping(12)}
            className="items-center"
          >
            {/* Big animated checkmark */}
            <Animated.View
              style={checkmarkAnimatedStyle}
              className="mb-6 h-28 w-28 items-center justify-center rounded-full bg-teal"
            >
              <Check size={64} color="white" strokeWidth={3} />
            </Animated.View>

            {/* Trip saved message */}
            <Text className="text-center text-3xl font-bold text-warm-gray-900">
              Trip saved! 🎉
            </Text>

            {/* Amount saved */}
            {extractedTotal !== null && (
              <Text className="mt-2 text-center text-xl text-warm-gray-600">
                {formatCentsToDollars(extractedTotal)}
              </Text>
            )}

            {/* Fun stat - shopping count this month */}
            <Animated.View style={statsAnimatedStyle} className="mt-8">
              <View className="rounded-2xl bg-teal/10 px-6 py-4">
                <Text className="text-center text-lg text-warm-gray-700">
                  You've shopped{" "}
                  <Text className="font-bold text-teal">
                    {monthlySessionCount} {monthlySessionCount === 1 ? "time" : "times"}
                  </Text>{" "}
                  this month!
                </Text>
                {monthlySessionCount >= 5 && (
                  <Text className="mt-1 text-center text-sm text-warm-gray-500">
                    You're a shopping pro! 🛒✨
                  </Text>
                )}
              </View>
            </Animated.View>

            {/* Auto-redirect message */}
            <Text className="mt-6 text-center text-sm text-warm-gray-400">
              Taking you home...
            </Text>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  // Get header title based on state
  const getHeaderTitle = () => {
    switch (screenState) {
      case "uploading":
        return "Uploading Receipt";
      case "processing":
        return "Scanning Receipt";
      case "success":
        return "Receipt Total";
      case "manual_entry":
        return "Enter Total";
      case "saving_session":
        return "Saving Trip";
      case "session_saved":
        return "All Done!";
      case "ocr_error":
      case "upload_error":
        return "Hmm...";
      default:
        return "Receipt";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light">
      {/* Confetti overlay */}
      {renderConfetti()}

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
          {getHeaderTitle()}
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1 items-center justify-center px-8">
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

/**
 * Animated dot for loading indicator
 */
function AnimatedDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[animatedStyle, { marginLeft: delay > 0 ? 8 : 0 }]}
      className="h-3 w-3 rounded-full bg-teal"
    />
  );
}

/**
 * Confetti particle component
 */
function ConfettiParticle({
  emoji,
  startX,
  delay,
}: {
  emoji: string;
  startX: number;
  delay: number;
}) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(600, {
        duration: 2500,
        easing: Easing.out(Easing.quad),
      });
      translateX.value = withSequence(
        withTiming((Math.random() - 0.5) * 100, { duration: 800 }),
        withTiming((Math.random() - 0.5) * 150, { duration: 1700 })
      );
      rotation.value = withTiming((Math.random() - 0.5) * 720, {
        duration: 2500,
      });
      // Fade out near end
      setTimeout(() => {
        opacity.value = withTiming(0, { duration: 500 });
      }, 2000);
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text
      style={[
        animatedStyle,
        {
          position: "absolute",
          left: `${startX}%`,
          top: 100,
          fontSize: 24,
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}
